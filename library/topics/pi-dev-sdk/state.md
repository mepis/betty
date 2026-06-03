---
topic: "pi.dev SDK"
created_at: "2026-06-03 13:40"
last_updated: "2026-06-03 13:46"
current_phase: "Complete"
status: "completed"
library_topic_slug: "pi-dev-sdk"
library_entry_exists: false
stopping_criteria: "A - All gaps addressed; comprehensive coverage of SDK architecture, API surface, integration patterns, and ecosystem."
---

## Phase 0: Library Check

existing_entries:
- topic: "LLM Harness"
  slug: "llm-harness"
  relevance: "low"
  gap_to_fill: "General agent harness taxonomy, not specific to pi.dev"
- topic: "Agent Memory Using Markdown"
  slug: "agent-memory-using-markdown"
  relevance: "low"
  gap_to_fill: "Markdown memory patterns, not pi.dev specific"

No existing entries on pi.dev or its SDK. This is a new topic.

## Phase 1: Foundational Survey

sub_topics:

- name: "SDK Architecture and Monorepo Structure"
  definition: "The pi SDK is a TypeScript monorepo (pi-mono) with layered packages: pi-ai (LLM abstraction), pi-agent-core (agent loop), pi-coding-agent (full agent + SDK), pi-tui (terminal UI), pi-web-ui (web components)."
  key_concepts: ["monorepo", "layered dependencies", "DAG architecture", "independent packages"]

- name: "AgentSession API and Event System"
  definition: "createAgentSession() is the primary factory; AgentSession manages lifecycle, message history, model state, compaction, and event streaming with 25+ typed events."
  key_concepts: ["createAgentSession", "AgentSession", "event streaming", "subscribe", "prompt", "steer/followUp"]

- name: "Extension System and Customization"
  definition: "Extensions are TypeScript modules with 25+ lifecycle events across 7 categories, enabling tool registration, command hooks, system prompt modification, and TUI rendering."
  key_concepts: ["ExtensionAPI", "25+ events", "tool registration", "slash commands", "hot reloading"]

- name: "Session Management and Persistence"
  definition: "JSONL-based session storage with tree structure (id/parentId) enabling branching, forking, cloning, and in-place tree navigation."
  key_concepts: ["JSONL", "tree structure", "forking", "SessionManager", "branching"]

- name: "Integration Patterns (OpenClaw, RPC, Web UI)"
  definition: "Four integration modes: interactive TUI, print/JSON, RPC (JSONL over stdin/stdout), and SDK embedding; OpenClaw is the canonical real-world SDK integration."
  key_concepts: ["OpenClaw", "RPC mode", "JSONL protocol", "pi-web-ui", "Lit components"]

- name: "Comparison with Other Frameworks"
  definition: "Pi positions as the most extensible, minimal coding agent — 4 tools, <1000 token system prompt, 25+ extension events vs Claude Code's 14 hooks."
  key_concepts: ["minimalism", "extensibility", "open source", "provider-agnostic", "Terminal-Bench"]

## Phase 2: Deep Dive

deep_dives:

- topic: "SDK Architecture and Core Packages"
  defined: true
  trends:
    - "Strict layered DAG dependency graph — foundation packages have zero internal deps"
    - "Each package independently usable (pi-ai for batch LLM processing, pi-agent-core for agent loops)"
    - "Python port of pi-agent-core emerging (pypi.org/project/pi-agent-core)"
  example: "OpenClaw uses all four core packages to run agents across WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Google Chat, Microsoft Teams"
  example_source: "https://nader.substack.com/p/how-to-build-a-custom-agent-framework"

- topic: "AgentSession API and Event System"
  defined: true
  trends:
    - "Dual-loop architecture: AgentMessage (app-level) vs LLM Message (model-level) separation"
    - "Steering and follow-up queues enable mid-stream message injection"
    - "shouldStopAfterTurn hook for graceful loop exit after completed turn"
  example: "createAgentSession() with AuthStorage, ModelRegistry, custom tools, extensions — full example in docs"
  example_source: "https://pi.dev/docs/latest/sdk"

- topic: "Integration Patterns and Real-World Usage"
  defined: true
  trends:
    - "OpenClaw (145k+ stars in first week) as canonical SDK integration — direct import, no subprocess"
    - "RPC mode with JSONL framing for language-agnostic clients"
    - "pi-web-ui Lit components enabling browser-based chat interfaces"
  example: "OpenClaw embeds pi's AgentSession via createAgentSession() directly instead of spawning pi as a subprocess"
  example_source: "https://github.com/openclaw/openclaw/blob/main/docs/pi.md"

## Phase 3: Gap Analysis

gaps:

- description: "Exact API surface changes between @mariozechner/ and @earendil-works/ npm scopes"
  questions: ["When did the scope change occur?", "Are both scopes still maintained?"]
  resolved: true
  findings: "Both scopes exist; @earendil-works/pi-coding-agent is the canonical scope. @mariozechner/ was the original scope. The monorepo moved from badlogic/pi-mono to earendil-works/pi."

- description: "Performance benchmarks comparing SDK mode vs RPC mode vs interactive mode"
  questions: ["Is there measurable overhead in SDK embedding vs subprocess?", "Does RPC mode add latency?"]
  resolved: true
  findings: "SDK mode is in-process (zero subprocess overhead). RPC mode adds IPC latency via JSONL over stdin/stdout. Interactive mode includes TUI rendering overhead. No formal benchmarks found, but SDK is recommended for same-process Node.js integrations."

- description: "Security implications of SDK embedding"
  questions: ["What sandboxing exists for tools in SDK mode?", "How does auth work in embedded contexts?"]
  resolved: true
  findings: "SDK inherits the same tool permissions as interactive mode. AuthStorage supports runtime API key overrides (not persisted). No additional sandboxing layer in SDK mode — relies on the same bash tool timeout and file access controls as interactive mode."

phase_0_complete: true
phase_1_complete: true
phase_2_complete: true
phase_3_complete: true
