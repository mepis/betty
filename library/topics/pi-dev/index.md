# pi.dev (Pi Coding Agent)

**Research date:** 2026-05-22
**Status:** Complete (3-phase research)
**Tags:** coding-agent, terminal, typescript, ai, self-modifying, extensions, packages, tui, open-source

## Overview

Pi (pi.dev) is an open-source, minimal terminal coding agent created by Mario Zechner (earendil-works). It is designed to stay small at the core — a sub-1000-token system prompt and four built-in tools (read, write, edit, bash) — while being highly extensible through TypeScript extensions, skills, prompt templates, themes, and pi packages. Pi's most distinctive feature is its self-documenting architecture: the agent can read its own documentation to understand, explain, and extend itself, enabling on-the-fly customization.

## Key Findings

- Pi uses a custom terminal UI library (@mariozechner/pi-tui) with differential rendering for flicker-free updates — not based on Ink, React-Ink, or any other TUI framework
- The extension system provides a rich API (registerTool, registerCommand, event subscriptions, TUI access) with a vibrant community package ecosystem of hundreds of packages on pi.dev/packages
- Pi supports 15+ AI providers (Anthropic, OpenAI, Google, Ollama, etc.) with subscription (OAuth) and API-key authentication, plus custom provider registration
- The documentation is GitHub-sourced, versioned, and agent-readable — Pi reads its own docs to guide its own extension and modification
- Pi runs in "YOLO mode" by default (full filesystem access) with extensible security features (permission gates, path protection) and community security packages (guardrails, sandbox, Greywall)
- Programmatic integration is supported via SDK (Node.js), RPC mode (JSONL over stdin/stdout), and JSON event stream mode

## Sub-Topics Covered

- Core Philosophy & Architecture
- Documentation Architecture (pi.dev/docs/latest structure)
- Extension System (TypeScript API, lifecycle events, custom tools)
- Skills System (SKILL.md workflow)
- Provider & Model System (15+ providers, custom providers)
- Package Ecosystem (npm packages, pi.dev/packages catalog, supply-chain security)
- Session Management & Compaction (JSONL sessions, branching, auto-compaction)
- Programmatic Usage (SDK, RPC mode, JSON event stream)
- TUI Components (pi-tui, differential rendering, custom components)
- Security Model (YOLO mode, permission gates, community guardrails)

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

- [Wiki-Style RAG Systems](../wiki-style-rag-systems/) (different topic, no direct overlap)
