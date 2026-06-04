---
topic: "Opencode.ai Directory Restriction Mechanisms"
created_at: "2026-06-04 10:00"
last_updated: "2026-06-04 11:00"
current_phase: "Phase 4"
status: "active"
library_topic_slug: "opencode-ai-directory-restriction"
library_entry_exists: false
stopping_criteria: ""
---

## Phase 0: Library Check

existing_entries:
- topic: "LLM Harness"
  slug: "llm-harness"
  relevance: "medium"
  gap_to_fill: "General agent harness taxonomy; no specific coverage of Opencode.ai or directory restriction patterns"
- topic: "pi.dev SDK"
  slug: "pi-dev-sdk"
  relevance: "medium"
  gap_to_fill: "pi.dev agent harness; no coverage of Opencode.ai's approach"
- topic: "Agent Memory Using Markdown"
  slug: "agent-memory-using-markdown"
  relevance: "low"
  gap_to_fill: "Markdown memory patterns, not Opencode.ai specific"

No existing entries on Opencode.ai or directory restriction mechanisms. This is a new topic.

## Phase 1: Foundational Survey

sub_topics:

- name: "Permission System (opencode.json)"
  definition: "OpenCode's primary mechanism for restricting tool access, using allow/ask/deny actions with wildcard pattern matching against tool inputs (file paths, commands, URLs)."
  key_concepts: ["allow/ask/deny", "wildcard patterns", "opencode.json", "per-tool gating"]

- name: "External Directory Guard"
  definition: "A dedicated permission key that triggers when any tool accesses paths outside the working directory where OpenCode was started, defaulting to 'ask'."
  key_concepts: ["external_directory", "working directory boundary", "path traversal protection"]

- name: "Per-Agent Permission Overrides"
  definition: "Agents can override global permissions, allowing fine-grained control where different agents have different levels of filesystem and command access."
  key_concepts: ["per-agent config", "JSON and Markdown agent definitions", "permission inheritance"]

- name: "Built-in Agent Roles (Build vs Plan)"
  definition: "OpenCode ships with two built-in primary agents: Build (full access) and Plan (restricted — edit and bash default to 'ask')."
  key_concepts: ["Build agent", "Plan agent", "read-only analysis", "mode-based restrictions"]

- name: "Community Plugin: opencode-ignore"
  definition: "A third-party plugin using gitignore-style .ignore patterns to pre-block and post-filter file access across read, write, edit, glob, grep, and list tools."
  key_concepts: ["gitignore patterns", "pre-execution blocking", "post-execution filtering", "plugin architecture"]

- name: "Sandboxing and OS-Level Isolation"
  definition: "OpenCode lacks built-in OS-level sandboxing; security research recommends Docker container isolation as the complementary hard boundary."
  key_concepts: ["no OS sandbox", "Docker isolation", "in-process enforcement", "prompt injection risk"]

- name: "Policies (Experimental)"
  definition: "An experimental feature controlling which configured resources (LLM providers) OpenCode may use, separate from tool permissions."
  key_concepts: ["experimental.policies", "provider.use", "allow/deny effect", "wildcard matching"]

## Phase 2: Deep Dive

deep_dives:

- topic: "Permission System and external_directory"
  defined: true
  trends:
    - "Permission system uses wildcard pattern matching with last-match-wins semantics"
    - "external_directory is the primary mechanism for restricting access outside the working directory"
    - "read defaults to allow but .env files denied by default; external_directory defaults to ask"
  example: "permission.external_directory: { \"~/projects/personal/**\": \"allow\" } combined with edit: { \"~/projects/personal/**\": \"deny\" } allows reads but blocks edits to external paths"
  example_source: "https://opencode.ai/docs/permissions/"

- topic: "Per-Agent Filesystem Boundaries (Feature Request)"
  defined: true
  trends:
    - "Community request for per-agent allow/deny path patterns (issue #5529, Dec 2025, 11+ 👍)"
    - "Proposed fs.allow/fs.deny glob patterns per agent in opencode.json"
    - "Related: #6318 (Limit tool permissions to specific folders), #6606 (Spawn separate process for tool calls)"
  example: "Proposed config: agent.docs.fs: { allow: [\"docs/**\", \"README.md\"], deny: [\"**/.env\", \"**/.ssh/**\", \"**/secrets/**\"] }"
  example_source: "https://github.com/anomalyco/opencode/issues/5529"

- topic: "Community Hardening and opencode-ignore Plugin"
  defined: true
  trends:
    - "opencode-ignore plugin (61 stars, MIT) provides gitignore-style blocking as a community solution"
    - "Security research (secSandman) documents comprehensive hardening configs adapted from Claude Code analysis"
    - "Two-layer approach: config-level permissions + container isolation recommended"
  example: "opencode-ignore uses .ignore files with gitignore syntax, providing pre-execution blocking for read/write/edit/list and post-execution filtering for glob/grep"
  example_source: "https://github.com/lgladysz/opencode-ignore"

## Phase 3: Gap Analysis

gaps:

- description: "Current status of per-agent filesystem boundaries feature (#5529)"
  questions: ["Has the feature been implemented since the issue was filed?", "What is the current roadmap timeline?"]
  resolved: true
  findings: "As of June 2026, the per-agent filesystem boundaries feature (issue #5529, filed Dec 2025) has NOT been implemented. The issue remains open with 11+ 👍 reactions. Multiple related issues have been filed: #6318 (Limit tool permissions to specific folders), #6606 (Spawn separate process for tool calls), and #8313 (Path traversal via symlinks). The core challenge is that OpenCode's current permission model is tool-centric (per-tool allow/deny) rather than path-centric (per-path allow/deny). The proposed fs.allow/fs.deny pattern would be a fundamental architectural addition."

- description: "How external_directory handles symlinks and path traversal"
  questions: ["Does external_directory resolve symlinks before checking?", "Can .. traversal escape the boundary?"]
  resolved: true
  findings: "OpenCode has had multiple symlink escape vulnerabilities: Issue #8313 (Jan 2026) reported lexical-only path checking allowing symlink escapes and cross-drive bypass on Windows. PR #8727 (Jan 2026) fixed File.read and File.list by using fs.promises.realpath() before access. PR #7515 addressed external_directory gaps and improved symlink checks. PR #6403 was a previous symlink fix in Filesystem.contains. However, the DEV.to article by @pachilo documented that the File API can still return files outside the project if symlinks are involved — the threat model considers this user-responsible. The fix uses realpath() resolution to verify containment before access, but the external_directory boundary itself remains lexical (string-based) rather than canonical-path-based."

- description: "How subagents inherit or override parent agent permissions"
  questions: ["Do subagents inherit the parent's permission config?", "Can a subagent be configured with stricter permissions than its parent?"]
  resolved: true
  findings: "Subagent permission inheritance was significantly changed by PR #26597 (May 2026), which fixed a Plan Mode security bypass (#26514). The change introduced deriveSubagentSessionPermission() which copies ALL parent agent deny rules into the child session, appended AFTER the subagent's own rules. Since OpenCode uses last-match-wins semantics, inherited parent denies override the subagent's explicit allows. This broke deny-by-default multi-agent configurations where a restricted primary agent delegates to a more-capable subagent (controller→executor→worker pattern). Issue #26700 (May 2026, 2+ 👍) documented this regression. A fix PR #26845 was proposed to only inherit edit-class denies (edit, write, apply_patch) rather than all denies. The merged fix #27201 addressed this. The current behavior: subagents inherit parent denies only for edit-class permissions, allowing more-capable subagents to operate with their own allowlists."

phase_0_complete: true
phase_1_complete: true
phase_2_complete: true
phase_3_complete: true
