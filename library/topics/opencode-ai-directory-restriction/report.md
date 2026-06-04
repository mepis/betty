# ANALYTICAL REPORT: How Opencode.ai Restricts Agents to Specific Directories

## Executive Summary

This report provides a comprehensive analysis of how Opencode.ai (by Anomaly) restricts AI agents to specific directories and filesystem boundaries. Opencode's approach is fundamentally **permission-based and tool-centric** rather than sandbox-based — it relies on a configurable `opencode.json` permission system that gates individual tool operations (file reads, edits, shell commands, network access) through wildcard pattern matching. This stands in contrast to approaches that use OS-level sandboxes or chroot jails.

The research reveals a layered security model with three primary mechanisms: (1) the `external_directory` permission that triggers when tools access paths outside the working directory, (2) per-agent permission overrides that allow different agents to have different access levels, and (3) community plugins like `opencode-ignore` that provide gitignore-style path blocking. However, significant gaps remain: there is no built-in per-agent filesystem path allowlist/denylist, symlink-based path traversal vulnerabilities have been discovered and patched multiple times, and subagent permission inheritance has proven complex and error-prone.

The overarching finding is that OpenCode's directory restriction model is **configurable but not enforced at the OS level** — all permissions are checked in-process by the OpenCode binary itself, making them vulnerable to prompt injection, compromised binaries, and configuration bypass. The recommended production deployment pattern is Docker container isolation combined with hardened `opencode.json` configuration.

## Methodology

This research was conducted in five phases:

1. **Phase 0 (Library Check):** No existing entries on Opencode.ai or directory restriction mechanisms were found in the research library.
2. **Phase 1 (Foundational Survey):** Six broad searches across SearxNG identified the core permission system, external_directory guard, per-agent overrides, built-in agent roles, community plugins, and experimental policies.
3. **Phase 2 (Deep Dive):** Three sub-topics were explored in depth: the permission system and external_directory, the per-agent filesystem boundaries feature request, and community hardening practices.
4. **Phase 3 (Gap Analysis):** Three specific gaps were identified and resolved: the status of per-agent filesystem boundaries, symlink/path traversal handling in external_directory, and subagent permission inheritance.
5. **Phase 4 (Report Generation):** Findings consolidated into this report.

**Stopping criteria:** Criterion A — All gaps addressed with no obvious weak spots remaining.

## Detailed Findings

### 1. The Permission System: Tool-Centric Access Control

OpenCode's primary directory restriction mechanism is the `permission` configuration in `opencode.json`. This system operates at the **tool level** rather than the **filesystem level**, meaning each tool (read, edit, glob, grep, bash, etc.) can be individually gated with allow/ask/deny actions.

**Key characteristics:**

- **Three action modes:** `"allow"` (run without approval), `"ask"` (prompt for approval), `"deny"` (block the action)
- **Wildcard pattern matching:** Rules use `*` (zero or more characters) and `?` (exactly one character) matching against tool inputs (file paths, commands, URLs)
- **Last-match-wins semantics:** When multiple rules match, the last matching rule determines the action. This means deny rules should be placed after allow rules.
- **Home directory expansion:** Patterns can use `~` or `$HOME` to reference the home directory
- **Global and per-agent scoping:** Permissions can be set globally (with `"*"`) and overridden per agent

**Available permission keys:**

| Key | What It Controls |
|---|---|
| `read` | File reads (matched by file path pattern) |
| `edit` | All file modifications (edit, write, patch, multiedit) |
| `glob` | File glob pattern matching |
| `grep` | Content search (matched by regex pattern) |
| `list` | Directory listing |
| `bash` | Shell command execution (matched by parsed command) |
| `task` | Launching subagents (matched by subagent type) |
| `skill` | Loading agent skills (matched by skill name) |
| `lsp` | Language server protocol queries |
| `question` | Asking the user questions during execution |
| `webfetch` | Fetching URLs (matched by URL pattern) |
| `websearch` | Web search queries (matched by query) |
| `external_directory` | Triggered when a tool touches paths outside the working directory |
| `doom_loop` | Triggered when the same tool call repeats 3 times with identical input |

**Default behavior:** Most permissions default to `"allow"`. The `external_directory` and `doom_loop` permissions default to `"ask"`. The `read` permission defaults to `"allow"` but `.env` files are denied by default.

**Example configuration:**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "*": "ask",
    "bash": "allow",
    "edit": "deny"
  }
}
```

### 2. The External Directory Guard

The `external_directory` permission is OpenCode's primary mechanism for restricting access to paths **outside the working directory** where OpenCode was started. This is the closest equivalent to a "directory boundary" in OpenCode's model.

**How it works:**

- When any tool (read, edit, glob, grep, bash, etc.) attempts to access a path outside the working directory, the `external_directory` permission is checked
- Default: `"ask"` — the user is prompted for approval
- Can be set to `"allow"` for specific external paths or `"deny"` to block all external access

**Configuration example:**

```json
{
  "permission": {
    "external_directory": {
      "~/projects/personal/**": "allow"
    }
  }
}
```

**Important nuance:** Any directory allowed via `external_directory` inherits the same defaults as the current workspace. Since `read` defaults to `"allow"`, reads are also allowed for entries under `external_directory` unless overridden. To allow reads but block edits to external paths:

```json
{
  "permission": {
    "external_directory": {
      "~/projects/personal/**": "allow"
    },
    "edit": {
      "~/projects/personal/**": "deny"
    }
  }
}
```

**Limitations:** The external_directory boundary is enforced **lexically** (string-based path comparison) rather than through canonical path resolution. This means symlink-based path traversal can potentially escape the boundary — a vulnerability that has been discovered and patched multiple times (see Section 4 below).

### 3. Per-Agent Permission Overrides

OpenCode supports per-agent permission overrides, a capability that distinguishes it from many competing tools. Each agent can define its own permission configuration that overrides the global defaults.

**Configuration methods:**

1. **JSON config** (`opencode.json`):
```json
{
  "agent": {
    "build": {
      "mode": "primary",
      "permission": {
        "edit": "allow",
        "bash": "allow"
      }
    },
    "plan": {
      "mode": "primary",
      "permission": {
        "edit": "deny",
        "bash": "deny"
      }
    }
  }
}
```

2. **Markdown agent files** (`~/.config/opencode/agents/<name>.md` or `.opencode/agents/<name>.md`):
```markdown
---
description: Code review — read-only, no execution
mode: subagent
permission:
  edit: deny
  bash: deny
  webfetch: deny
  websearch: deny
  task: deny
---
You are a code reviewer. You can read files and suggest changes but you cannot make edits, run commands, or access the internet.
```

**Built-in agents:**

- **Build** (default primary): Full tool access for development work
- **Plan** (primary): Restricted agent for planning/analysis — edit and bash default to `"ask"`
- **General** (subagent): General-purpose with full tool access (except todo)
- **Explore** (subagent): Read-only agent for exploring codebases
- **Scout** (subagent): Read-only agent for external docs and dependency research

**Permission inheritance for subagents:** Subagent permission inheritance was significantly changed by PR #26597 (May 2026). The fix for a Plan Mode security bypass (#26514) introduced `deriveSubagentSessionPermission()`, which copies parent agent deny rules into the child session. Since OpenCode uses last-match-wins semantics, inherited parent denies override the subagent's explicit allows. This broke deny-by-default multi-agent configurations (controller→executor→worker pattern). A fix (PR #26845, merged as #27201) was implemented to only inherit edit-class denies (edit, write, apply_patch) rather than all denies, allowing more-capable subagents to operate with their own allowlists.

### 4. Symlink Escape Vulnerabilities and Path Traversal

OpenCode has had a history of symlink-based path traversal vulnerabilities. The `external_directory` boundary and workspace containment checks have been found to use **lexical path checking** (string-based comparison) rather than **canonical path resolution** (resolving symlinks before comparison).

**Vulnerability timeline:**

- **Issue #6403:** Previous symlink escape fix in `Filesystem.contains`
- **Issue #8313 (Jan 2026):** Reported that `Filesystem.contains()` uses lexical path checking only, allowing symlink escape attacks and cross-drive path bypass on Windows
- **PR #7515 (Jan 2026):** Addressed external_directory gaps and improved symlink checks
- **PR #8727 (Jan 2026):** Fixed `File.read` and `File.list` by using `fs.promises.realpath()` before access, resolving real paths and verifying containment
- **PR #10366 (Jan 2026):** Resolved symlinks to directories in project picker
- **PR #11351 (Jan 2026):** Handled symlink directories in file listing
- **PR #11720 (Jan 2026):** Security vulnerabilities and reliability improvements

**Current state:** The `File.read` and `File.list` operations now use `realpath()` to resolve symlinks before checking containment. However, the `external_directory` boundary itself remains lexical (string-based) rather than canonical-path-based. The OpenCode threat model considers this **user-responsible** — users are expected to protect their filesystem themselves, particularly in server mode which is out of scope.

**DEV.to analysis (@pachilo):** Documented that the File API can still return files outside the project if symlinks are involved, recommending users inspect symlinks before running `opencode serve` in untrusted repos.

### 5. Per-Agent Filesystem Boundaries: The Unimplemented Feature

The most significant gap in OpenCode's directory restriction model is the **absence of per-agent filesystem path boundaries**. While OpenCode supports per-agent permission overrides, these are tool-centric (allow/deny specific tools) rather than path-centric (allow/deny specific paths).

**Community request (Issue #5529, Dec 2025):**

A detailed feature request proposes adding per-agent filesystem boundaries with:
- `fs.allow` and `fs.deny` glob patterns per agent
- Deny rules override allow rules
- Safe path resolution preventing traversal/symlink escapes
- Clear user-facing errors when blocked

**Proposed configuration:**

```json
{
  "agent": {
    "docs": {
      "description": "Docs-only agent",
      "tools": { "bash": false },
      "fs": {
        "allow": ["docs/**", "README.md"],
        "deny": ["**/.env", "**/.ssh/**", "**/secrets/**", ".git/**"]
      }
    },
    "payments": {
      "description": "Payments service agent",
      "fs": {
        "allow": ["services/payments/**"],
        "deny": ["**/.env", ".git/**"]
      }
    }
  }
}
```

**Status:** As of June 2026, this feature has **NOT been implemented**. The issue remains open with 11+ 👍 reactions. Multiple related issues have been filed but no implementation has been merged.

### 6. Community Plugin: opencode-ignore

The `opencode-ignore` plugin (61 stars, MIT license) provides a community solution for path-based access restriction using gitignore-style `.ignore` patterns.

**How it works:**

- **Pre-execution blocking:** Prevents tool execution for blocked paths (read, write, edit, list)
- **Post-execution filtering:** Filters blocked files from search results (glob, grep)
- **Two-phase approach:** Prevents both direct access and information disclosure
- **Gitignore syntax:** Uses the `ignore` npm package for pattern matching

**Supported tools:**

| Tool | Protection |
|---|---|
| `read` | Pre-execution blocking |
| `write` | Pre-execution blocking |
| `edit` | Pre-execution blocking |
| `glob` | Pre-execution blocking + post-execution filtering |
| `grep` | Pre-execution blocking + post-execution filtering |
| `list` | Pre-execution blocking |

**Configuration:**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-ignore"]
}
```

Plus a `.ignore` file in the project root:

```
# Block specific directory
/secrets/**
# Block all certificate files
*.crt *.key *.pem
# Block environment files
.env*
# Allow exception with negation
!config.local.json
```

### 7. Security Hardening: Production Recommendations

Security research by @secSandman (securitysandman.com) documents comprehensive hardening configurations adapted from Claude Code analysis. Key recommendations:

**Critical configuration changes:**

1. **Disable autoupdate:** `"autoupdate": false` — prevents silent binary replacement
2. **Invert defaults:** Start with `"*": "ask"` and explicitly allow safe patterns
3. **Deny network tools:** `"curl*": "deny"`, `"wget*": "deny"`, `"python -c*": "deny"`
4. **Restrict external_directory:** `"external_directory": { "*": "deny" }`
5. **Per-agent hardening:** Use read-only subagents for reviewing untrusted repos

**OS-level isolation:** OpenCode has no built-in OS-level sandboxing (unlike Claude Code's AppArmor/sandbox-exec integration). Docker container isolation is the recommended complementary hard boundary.

### 8. Policies (Experimental)

OpenCode includes an experimental `experimental.policies` feature that controls which configured resources (LLM providers) OpenCode may use. This is separate from tool permissions.

**Current policy actions:**

| Action | Resource | Description |
|---|---|---|
| `provider.use` | Provider ID (e.g., `openai`) | Allow or deny use of an LLM provider |

**Example:**

```json
{
  "experimental": {
    "policies": [
      { "effect": "deny", "action": "provider.use", "resource": "openai" }
    ]
  }
}
```

Policies support wildcard matching and last-match-wins semantics. Global policies take priority over project policies, preventing a repository from re-enabling a provider that the user denies globally.

## Conclusion

OpenCode.ai restricts agents to specific directories through a **permission-based, tool-centric model** rather than OS-level sandboxing. The primary mechanisms are:

1. **`external_directory` permission** — triggers when tools access paths outside the working directory (default: ask)
2. **Per-agent permission overrides** — different agents can have different access levels
3. **Wildcard pattern matching** — fine-grained control over which file paths and commands are allowed

However, this model has significant limitations:
- **No built-in per-agent filesystem path boundaries** (the most requested feature remains unimplemented)
- **Lexical path checking** for external_directory (symlink escapes possible, though partially mitigated)
- **In-process enforcement only** (permissions checked by the OpenCode binary itself, vulnerable to prompt injection)
- **Subagent permission inheritance complexity** (recently changed, breaking some multi-agent patterns)

For production use, the recommended approach is **Docker container isolation** combined with hardened `opencode.json` configuration, as config-level permissions alone cannot provide strong security guarantees.

## Future Work & Recommendations

1. **Monitor per-agent filesystem boundaries (issue #5529):** This is the most significant unimplemented feature. Users requiring strong per-agent path isolation should watch for implementation and consider the `opencode-ignore` plugin as an interim solution.

2. **Adopt Docker container isolation for untrusted workloads:** Since OpenCode lacks OS-level sandboxing, running in containers (with version-pinned binaries and hash verification) is the only path to strong filesystem isolation.

3. **Audit MCP server tool permissions:** Custom tools added via MCP servers may implement their own write mechanisms outside the `edit` permission path. Audit all MCP servers for file-writing capabilities and minimize them in production configurations.

## Citations

Anomaly. "Permissions." *OpenCode Documentation*, opencode.ai/docs/permissions/. Accessed 4 June 2026.

---. "Agents." *OpenCode Documentation*, opencode.ai/docs/agents/. Accessed 4 June 2026.

---. "Policies." *OpenCode Documentation*, opencode.ai/docs/policies/. Accessed 4 June 2026.

---. "Config." *OpenCode Documentation*, opencode.ai/docs/config/. Accessed 4 June 2026.

GitHub. "Path traversal vulnerability via symlinks and cross-drive paths." *anomalyco/opencode#8313*, 2026, github.com/anomalyco/opencode/issues/8313.

---. "Subagents Bypass Plan Mode READ-ONLY Restrictions." *anomalyco/opencode#26514*, 2026.

---. "Subagent parent deny inheritance over-constrains delegated agents with explicit permissions." *anomalyco/opencode#26700*, May 2026.

---. "Add per-agent filesystem boundaries (allow/deny paths) + optional run-as user for bash." *anomalyco/opencode#5529*, Dec 2025.

Ashwinhegde19. "fix(security): prevent path traversal via symlinks in File.read and File.list." *anomalyco/opencode#8727*, Jan 2026.

21pounder. "fix(task): only inherit edit-class denies from parent agent to subagent." *anomalyco/opencode#26845*, May 2026.

lgladysz. *opencode-ignore*. GitHub, 2025, github.com/lgladysz/opencode-ignore.

pachilo. "Reading Outside the Lines: Symlink Escape in OpenCode's File API." *DEV Community*, dev.to/pachilo/reading-outside-the-lines-symlink-escape-in-opencodes-file-api-5f81.

secSandman. "OpenCode — Local Hardening via opencode.json." *agent_playground*, GitHub, github.com/secSandman/agent_playground/blob/main/ai_research/opencode_local_hardening.md.

thamizhelango. "Building Guardrails in OpenCode to Protect Your Secure Private Information." *Medium*, 2026, thamizhelango.medium.com/building-guardrails-in-opencode-to-protect-your-secure-private-information-3515554563ee.

Firecrawl. "Claude Code vs OpenCode: Which Terminal AI Coding Agent Should You Use?" *Firecrawl Blog*, June 2026.
