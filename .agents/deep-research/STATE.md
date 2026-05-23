---
topic: "pi.dev (Pi Coding Agent)"
created_at: "2026-05-21 14:00"
last_updated: "2026-05-22"
current_phase: "Phase 4"
status: "active"
library_topic_slug: "pi-dev"
library_entry_exists: false
stopping_criteria: ""
---

## Phase 0: Library Check

existing_entries:
- topic: "Wiki-Style RAG Systems"
  slug: "wiki-style-rag-systems"
  relevance: "low"
  gap_to_fill: "Different topic - no overlap"

## Phase 1: Foundational Survey

sub_topics:

- name: "Core Philosophy & Architecture"
  definition: "Pi is a minimal, self-modifying terminal coding agent with a sub-1000-token system prompt, four built-in tools, and an extensible TypeScript plugin system."
  key_concepts: ["Minimalism", "Self-modifying software", "Terminal-first design", "Four-tool architecture"]

- name: "Documentation System"
  definition: "Pi ships with comprehensive self-documentation that the agent can read and use to guide itself, including guides, references, and examples for all extension points."
  key_concepts: ["Self-documenting", "pi.dev/docs", "README.md", "examples/", "docs/*.md"]

- name: "Extension System"
  definition: "TypeScript modules that extend Pi's behavior through lifecycle event subscriptions, custom tool registration, custom commands, and UI modifications."
  key_concepts: ["TypeScript extensions", "Lifecycle events", "Custom tools", "Custom commands"]

- name: "Skills System"
  definition: "Specialized workflows, setup instructions, helper scripts, and reference documentation for specific tasks — structured as directories with SKILL.md files."
  key_concepts: ["SKILL.md", "Skills directory", "On-demand capabilities", "Reusable workflows"]

- name: "Provider & Model System"
  definition: "Support for 15+ AI providers including subscription-based (OAuth) and API-key-based providers, with support for custom providers via models.json and registerProvider()."
  key_concepts: ["OAuth providers", "API key providers", "Custom providers", "Ollama/vLLM/LM Studio"]

- name: "Package Ecosystem"
  definition: "Pi packages bundle extensions, skills, prompt templates, and themes for sharing via npm or git, with a package catalog at pi.dev/packages."
  key_concepts: ["npm packages", "pi.dev/packages", "Bundle sharing", "Package manifest"]

- name: "Session Management & Compaction"
  definition: "Session persistence with branching, tree navigation, and automatic compaction that summarizes older content while preserving recent work."
  key_concepts: ["Session tree", "Branching", "Compaction", "JSONL history"]

## Phase 2: Deep Dive

deep_dives:

- topic: "Extension System"
  defined: true
  trends:
    - "Extensions can register custom tools callable by the LLM, subscribe to lifecycle events (session_start, tool_call, tool_result, etc.), add slash commands, and modify the TUI"
    - "The ExtensionAPI provides pi.registerTool(), pi.registerCommand(), pi.on() event subscriptions, and full TUI access — all typed with TypeScript and TypeBox schemas"
    - "Rich ecosystem of community packages: subagent orchestration (pi-subagents), MCP integration (pi-mcp-extension), LSP support (pi-lsp-extension), observability (pi-observability), guardrails, intercom, and more"
  example: "pi-package-template provides a minimal extension skeleton with registerTool, registerCommand, and pi.on('session_start') examples — the agent itself reads this template to build new extensions on first try."
  example_source: "https://pi.dev/packages/pi-package-template"

- topic: "Documentation Architecture"
  defined: true
  trends:
    - "Self-documenting design: Pi ships with docs/index.md, docs/*.md, and examples/ that the agent reads to understand and extend itself — no external documentation lookup needed"
    - "Structured documentation site at pi.dev/docs/latest with 7 major sections: Start Here, Customization, Programmatic Usage, Reference, Platform Setup, Development, and News"
    - "GitHub-sourced documentation: docs are at github.com/earendil-works/pi/tree/main/packages/coding-agent/docs/ with View Source and Edit on GitHub links on every page"
  example: "The agent reads its own documentation to explain features — as noted by community reviewers: 'One of Pi's most powerful features is that you can ask it to explain itself. The agent can read its own documentation, investigate its codebase, and help you extend or modify its behavior.'"
  example_source: "https://dev.to/theoklitosbam7/pi-coding-agent-a-self-documenting-extensible-ai-partner-dn"

- topic: "Package Ecosystem & Distribution"
  defined: true
  trends:
    - "Pi packages bundle extensions, skills, prompt templates, and themes — installed via `pi install npm:<package>` with automatic discovery from package.json pi.extensions field"
    - "Package catalog at pi.dev/packages hosts hundreds of community packages with real-time updates; packages include subagents, MCP extensions, LSP integration, observability bars, and custom workflows"
    - "Supply-chain hardened: Pi ships with generated shrinkwrap, verifies dependency pinning, enforces lifecycle-script allowlists, and smoke-tests isolated installs before release"
  example: "@tungthedev/pi-extensions bundles 8 extensions (editor, mermaid, workspace, web, skill, boomerang, pi-modes, ext-manager) in a single npm package with automatic loading via pi.extensions in package.json."
  example_source: "https://pi.dev/packages/@tungthedev/pi-extensions"

## Phase 3: Gap Analysis

gaps:

- description: "RPC and programmatic integration details"
  questions:
    - "What are the specific capabilities and limitations of RPC mode for headless operation?"
    - "How does the JSON event stream mode work for embedding Pi in other applications?"
  resolved: true
  findings: "RPC mode enables headless operation via a JSON protocol over stdin/stdout, useful for embedding in IDEs, custom UIs, and CI/CD pipelines. Pi has four operating modes: Interactive (default TUI), Print (pi -p for scripts), JSON (--mode json for event streams), and RPC (--mode rpc for JSONL protocol). RPC exposes commands like prompt, steer, follow-up, abort, and get-state. The protocol uses strict LF-delimited JSONL framing. Rust implementations (pi_agent_rust) also support this mode. SDK provides programmatic access via createAgentSession() for Node.js embedding."

- description: "Security model and sandboxing"
  questions:
    - "What security controls exist in Pi for protecting files and system access?"
    - "How does Pi handle path protection, permission gates, and sandboxing?"
  resolved: true
  findings: "Pi runs in 'YOLO mode' by default — full filesystem access, unrestricted command execution, no permissions — a deliberate design choice. Built-in features include permission gates, path protection, SSH execution, and sandboxing as extensible features. Community packages provide additional security: @aliou/pi-guardrails (file protection, path access control, permission gates), pi-file-permissions (per-tool permissions), pi-secret-guard (secret exposure prevention), pi-permission-gate (bash command confirmation), pi-sandbox (OS-level sandboxing with interactive prompts), and Greywall (kernel-level deny-by-default sandboxing). Extensions run with full system permissions — users must review third-party package source code before installing."

- description: "TUI components API"
  questions:
    - "What TUI components are available for custom extension UIs?"
    - "How does the differential rendering system work?"
  resolved: true
  findings: "Pi uses its own custom terminal UI library (@mariozechner/pi-tui) with differential rendering — NOT based on Ink, React-Ink, blessed, or any other TUI framework. The TUI renders directly to stdout using ANSI escape codes and manages flicker-free screen updates via synchronized output escape sequences (CSI ?2026h and CSI ?2026l). Components implement a standard interface and can render spinners, progress bars, interactive file browsers, markdown display, multi-line editors with autocomplete, loading spinners, overlays, widgets, editors, and footers. Extensions can mount custom TUI components directly in the terminal. The TUI appends SGR reset and OSC 8 reset at the end of each rendered line."

phase_0_complete: true
phase_1_complete: true
phase_2_complete: true
phase_3_complete: true
