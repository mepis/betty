# Opencode.ai Directory Restriction Mechanisms

**Research date:** 2026-06-04
**Status:** Complete (5-phase research)
**Tags:** opencode, agent-harness, security, permissions, sandboxing, directory-restriction, filesystem, anomaly

## Overview

OpenCode.ai (by Anomaly) restricts AI agents to specific directories through a permission-based, tool-centric model rather than OS-level sandboxing. The primary mechanism is the `external_directory` permission that triggers when tools access paths outside the working directory, combined with per-agent permission overrides and wildcard pattern matching. However, the model has significant gaps: no built-in per-agent filesystem path boundaries, lexical (not canonical) path checking vulnerable to symlink escapes, and in-process enforcement only.

## Key Findings

1. **Permission system is tool-centric, not path-centric:** Each tool (read, edit, glob, grep, bash, etc.) can be individually gated with allow/ask/deny actions using wildcard pattern matching against tool inputs. Last-match-wins semantics apply.

2. **external_directory is the primary directory boundary:** Triggers when any tool accesses paths outside the working directory. Defaults to "ask" for user approval. Can be configured per-path with home directory expansion support.

3. **Per-agent permission overrides are fully supported:** Different agents can have different access levels via JSON config or Markdown agent files. Built-in agents include Build (full access) and Plan (restricted).

4. **Subagent permission inheritance changed in May 2026:** PR #26597 introduced inheritance of parent deny rules, breaking deny-by-default multi-agent patterns. Fixed by PR #26845/#27201 to only inherit edit-class denies.

5. **No OS-level sandboxing:** OpenCode has no built-in AppArmor/sandbox-exec integration. Docker container isolation is the recommended complementary hard boundary for production use.

## Sub-Topics Covered

- Permission system and wildcard pattern matching
- External directory guard and boundary enforcement
- Per-agent permission overrides and built-in agent roles
- Symlink escape vulnerabilities and path traversal
- Per-agent filesystem boundaries (unimplemented feature request)
- Community plugin: opencode-ignore
- Security hardening and production recommendations
- Experimental policies feature

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

- [LLM Harness](../llm-harness/) — General agent harness taxonomy
- [pi.dev SDK](../pi-dev-sdk/) — pi.dev agent harness architecture
