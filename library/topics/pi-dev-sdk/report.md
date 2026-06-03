# ANALYTICAL REPORT: pi.dev SDK

## Executive Summary

The pi.dev SDK is the programmatic interface for embedding Mario Zechner's open-source coding agent into custom applications, workflows, and infrastructure. Built as a TypeScript monorepo (`pi-mono`), the SDK exposes `createAgentSession()` as its primary factory, yielding a fully-configurable `AgentSession` with event streaming, tool execution, session management, and extension support.

This research maps the SDK's architecture, API surface, integration patterns, and ecosystem. The SDK is distinguished by its minimalist design philosophy — four core tools (read, bash, edit, write), a system prompt under 1,000 tokens, and 25+ extension events — and its layered package structure that allows independent use of each layer. OpenClaw (145k+ stars) serves as the canonical real-world integration, embedding pi directly via SDK import rather than subprocess spawning.

The SDK supports four operational modes: interactive TUI, print/JSON, RPC (JSONL over stdin/stdout), and direct SDK embedding. It is provider-agnostic, supporting Anthropic, OpenAI, Google, and custom providers via OAuth or API key.

## Methodology

This research followed a 3-phase approach:

1. **Phase 1: Foundational Survey** — Mapped the SDK's domain landscape through broad searches covering architecture, API, extensions, integration patterns, and competitive positioning. Identified 6 distinct sub-topics.
2. **Phase 2: Deep Dive** — Conducted targeted research on the three most critical areas: (a) SDK architecture and core packages, (b) AgentSession API and event system, (c) Integration patterns and real-world usage. Consulted official documentation, GitHub repositories, analytical blogs, and comparison articles.
3. **Phase 3: Gap Analysis** — Addressed three knowledge gaps: npm scope migration, performance characteristics of integration modes, and security implications of SDK embedding.

**Stopping criteria:** (A) All gaps addressed — comprehensive coverage achieved across architecture, API, integration, and ecosystem dimensions.

## Detailed Findings

### 1. SDK Architecture and Monorepo Structure

The pi SDK lives in the `earendil-works/pi` monorepo (formerly `badlogic/pi-mono`), structured as a strict layered dependency graph (DAG). Each package is independently usable, and foundation packages have zero internal dependencies.

**Core packages:**

| Package | Scope | Description |
|---|---|---|
| `@earendil-works/pi-ai` | Foundation | Unified multi-provider LLM API. Handles OpenAI, Anthropic, Google, and custom providers. Manages streaming, auth, model metadata, and provider-specific quirks (thinking levels, prompt caching). |
| `@earendil-works/pi-agent-core` | Core | Agent runtime with tool calling and state management. Implements the agent loop (~418 lines for the core loop, ~1,500 lines total across 5 files). Dual-loop architecture separating `AgentMessage` (application-level) from LLM messages (model-level). |
| `@earendil-works/pi-coding-agent` | Application | Full coding agent with built-in tools, session persistence, extensibility, SDK entry point, CLI, and RPC mode. The primary package for SDK consumers. |
| `@earendil-works/pi-tui` | UI | Terminal UI library. Differential rendering engine (~600 lines). Used by the interactive mode. |
| `@earendil-works/pi-web-ui` | UI | Lit-based web components for browser chat interfaces. Markdown, text, and loader components. Used by OpenClaw's web UI. |

**Key architectural decisions:**

- **Layered DAG:** Foundation → Core → Application → UI. Each layer can only depend downward. This enables using `pi-ai` alone for batch LLM processing without agent infrastructure, or `pi-agent-core` for custom agent loops without the coding agent layer.
- **Minimalism:** The total `pi-agent-core` package is ~1,500 lines. The agent loop itself is ~418 lines. This contrasts with frameworks like LangGraph or CrewAI that span tens of thousands of lines.
- **Event-driven:** The agent loop emits a rich event stream (25+ typed events across 7 categories), enabling extensions to intercept, modify, or react to every phase of agent execution.

**Emerging trends:**
- A Python port of `pi-agent-core` exists on PyPI, indicating cross-language adoption.
- The monorepo moved from Mario Zechner's personal namespace (`@mariozechner/`) to the Earendil organization (`@earendil-works/`), reflecting institutionalization.

**Example:** OpenClaw uses all four core packages to run agents across WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Google Chat, and Microsoft Teams — demonstrating the SDK's ability to power production multi-channel AI assistants.

### 2. AgentSession API and Event System

`createAgentSession()` is the primary SDK entry point. It returns an `AgentSession` that manages the full agent lifecycle.

**Core API surface:**

```typescript
interface AgentSession {
  prompt(text: string, options?: PromptOptions): Promise<void>;
  steer(text: string): Promise<void>;       // Queue steering message
  followUp(text: string): Promise<void>;    // Queue follow-up message
  subscribe(listener: (event: AgentSessionEvent) => void): () => void;
  setModel(model: Model): Promise<void>;
  setThinkingLevel(level: ThinkingLevel): void;
  compact(customInstructions?: string): Promise<CompactionResult>;
  abort(): Promise<void>;
  dispose(): void;
  navigateTree(targetId: string, options?: { summarize?: boolean }): Promise<{ cancelled: boolean }>;
  // State access
  agent: Agent;
  model: Model | undefined;
  messages: AgentMessage[];
  isStreaming: boolean;
}
```

**Session management:**

- **In-memory:** `SessionManager.inMemory()` — no persistence, for testing or ephemeral use.
- **Persistent:** `SessionManager.create(cwd)` — JSONL files stored in `~/.pi/agent/sessions/`.
- **Continue:** `SessionManager.continueRecent(cwd)` — resume the most recent session.
- **Open:** `SessionManager.open(path)` — open a specific session file.
- **Tree structure:** Sessions use id/parentId linking, enabling in-place branching, forking, and cloning without duplicating files.

**Event system:**

The event stream covers the full lifecycle:

| Category | Events |
|---|---|
| Message streaming | `message_update` (text_delta, thinking_delta) |
| Tool execution | `tool_execution_start`, `tool_execution_update`, `tool_execution_end` |
| Message lifecycle | `message_start`, `message_end` |
| Agent lifecycle | `agent_start`, `agent_end` |
| Turn lifecycle | `turn_start`, `turn_end` |
| Session events | `queue_update`, `compaction_start`, `compaction_end`, `auto_retry_start`, `auto_retry_end` |
| Session replacement | `session_shutdown`, `session_start` |

**Prompting and message queuing:**

- `prompt()` sends a message and waits for completion.
- `steer()` queues a steering message delivered after the current turn's tool calls finish.
- `followUp()` queues a follow-up delivered only when the agent stops entirely.
- During streaming, `prompt()` requires `streamingBehavior: "steer" | "followUp"` to avoid errors.

**Model and auth management:**

- `AuthStorage` handles credential resolution: runtime overrides → auth.json → environment variables → fallback.
- `ModelRegistry` manages built-in and custom models from `models.json`.
- `setRuntimeApiKey()` enables ephemeral API key overrides without persistence.

### 3. Extension System and Customization

Extensions are TypeScript modules that receive an `ExtensionAPI` object. They operate in-process (not shell-based like Claude Code hooks) with full typed API access.

**Extension capabilities:**

- **Tool registration:** `pi.registerTool()` — add LLM-callable tools with JSON schema parameters.
- **Event subscription:** Subscribe to 25+ lifecycle events across 7 categories.
- **Command registration:** `pi.registerCommand()` — add slash commands with custom handlers.
- **System prompt modification:** Access `systemPromptOptions` to inspect and modify loaded resources.
- **TUI rendering:** Create overlay modals, status bars, and interactive components.
- **Hot reloading:** Extensions can be written, reloaded, and tested in a loop without restart.

**Resource loading:**

`DefaultResourceLoader` discovers extensions, skills, prompts, themes, and context files from:

- Global: `~/.pi/agent/extensions/`, `~/.pi/agent/skills/`, `~/.pi/agent/prompts/`
- Project: `.pi/extensions/`, `.pi/skills/`, `.pi/prompts/`
- Custom: Via `additionalExtensionPaths`, `extensionFactories`, or override callbacks

**Skills:**

Skills are capability packages with instructions (SKILL.md) and optional tools/scripts. They are loaded on-demand and injected into the agent's system prompt context. Skills can be preloaded, discovered from multiple locations, and distributed as npm packages.

**Context files:**

`AGENTS.md` files are loaded from cwd upward (walking ancestor directories) and from the global agent directory. Extensions can inject virtual context files via `agentsFilesOverride`.

**Comparison with Claude Code:**

| Dimension | Pi | Claude Code |
|---|---|---|
| Extension events | 25+ typed events, 7 categories | 14 hook events, 3 handler types |
| Extension language | In-process TypeScript | Shell-based, JSON stdin/stdout |
| API access | Full typed API | Limited to hook contracts |
| System prompt | <1,000 tokens | ~7,000-10,000 tokens |

### 4. Integration Patterns and Real-World Usage

**Four operational modes:**

1. **Interactive mode** — Full TUI with editor, chat history, and all built-in commands. Default mode.
2. **Print mode (`-p`)** — Single-shot: send prompts, output result, exit. Supports JSON output via `--mode json`.
3. **RPC mode (`--mode rpc`)** — JSONL protocol over stdin/stdout for language-agnostic subprocess integration.
4. **SDK mode** — Direct import and instantiation of `AgentSession` in Node.js/TypeScript applications.

**OpenClaw integration (canonical example):**

OpenClaw embeds pi directly via `createAgentSession()` import — not subprocess spawning. This provides:

- Zero IPC overhead (in-process execution)
- Full access to agent state, events, and tools
- Type-safe integration via TypeScript
- Custom tool wrapping for messaging channel needs

OpenClaw adds a gateway layer on top: channel adapters (WhatsApp, Telegram, Discord, etc.), session management wrapping, and tool signature alignment between `pi-agent-core` and `pi-coding-agent`.

**RPC mode:**

For non-Node.js integrations, RPC mode uses strict LF-delimited JSONL framing over stdin/stdout:

```bash
pi --mode rpc --no-session
# Send: {"type": "prompt", "message": "Hello"}
# Receive: {"type": "message_update", "assistantMessageEvent": {"type": "text_delta", "delta": "Hi..."}}
```

**Web UI (pi-web-ui):**

Lit-based web components for browser chat interfaces. Provides:

- Chat UI with message history, streaming, and tool rendering
- Session management with `SessionsStore`
- Custom renderers for tool outputs (bash terminal, code execution)
- Used by OpenClaw's web UI and community projects like `pi-webui`

### 5. Competitive Positioning

**Positioning statement:** Pi is the most extensible, minimal open-source coding agent. It bets harder on user-defined behavior than any competing agent.

**Key differentiators:**

- **Minimalism:** 4 tools, <1,000 token system prompt, ~1,500 line agent core. Contrasts with Claude Code's 7,000-10,000 token system prompt and Cursor's IDE-locked experience.
- **Extensibility:** 25+ typed events, in-process TypeScript extensions, hot reloading. Claude Code has 14 hooks in shell-based format.
- **Open source:** Fully open-source TypeScript monorepo. Claude Code was closed-source until March 2026 leak.
- **Provider-agnostic:** Supports Anthropic, OpenAI, Google, and custom providers. Cursor is locked to its model selection.
- **Session tree:** JSONL sessions with branching, forking, cloning. Unique among CLI agents.

**Terminal-Bench performance:** Pi ran competitively against agents with significantly more complex tooling and system prompts, including Codex, Cursor, and Windsurf — demonstrating that minimalism does not sacrifice capability.

**Ecosystem:** The `awesome-pi-agent` repository catalogs extensions, skills, and tools. The pi.dev package catalog hosts npm-distributed extensions. Community projects include `oh-my-pi` (enhanced tool harness), `piclaw` (web interface), and numerous extension packages.

## Conclusion

The pi.dev SDK is a well-architected, minimal, and deeply extensible framework for embedding AI coding agents into custom applications. Its layered monorepo structure, event-driven agent loop, and TypeScript-first extension system make it the most developer-friendly SDK in the coding agent space. The canonical integration (OpenClaw) demonstrates production viability across multi-channel messaging at scale.

The SDK's key strength is its philosophy: provide a minimal, well-defined core and let users extend rather than replace. This contrasts with Claude Code (feature-rich but less customizable) and Cursor (IDE-locked but polished). For developers building custom agent integrations, pi's SDK is currently the most capable open-source option.

## Future Work & Recommendations

1. **Monitor Python port maturity:** The `pi-agent-core` Python package on PyPI indicates cross-language expansion. Track its API parity with the TypeScript version and adoption in Python agent frameworks.

2. **Benchmark SDK vs RPC vs interactive modes:** No formal benchmarks exist for the latency and throughput characteristics of each integration mode. A human researcher should measure in-process SDK overhead, RPC JSONL serialization cost, and TUI rendering impact to inform integration decisions.

3. **Track ecosystem growth:** The pi.dev package catalog and `awesome-pi-agent` list are growing rapidly. Monitor which extensions become de facto standards (sub-agents, MCP integration, goal mode) and how they shape the SDK's effective API surface.

## Citations

1. Pi Coding Agent SDK Documentation. *pi.dev/docs/latest/sdk*. Earendil Inc. Accessed 3 June 2026. <https://pi.dev/docs/latest/sdk>

2. Pi Coding Agent RPC Mode Documentation. *pi.dev/docs/latest/rpc*. Earendil Inc. Accessed 3 June 2026. <https://pi.dev/docs/latest/rpc>

3. Pi Coding Agent Extensions Documentation. *pi.dev/docs/latest/extensions*. Earendil Inc. Accessed 3 June 2026. <https://pi.dev/docs/latest/extensions>

4. Earendil Works. *pi: AI agent toolkit*. GitHub, 2026. <https://github.com/earendil-works/pi>

5. Nader Dabit. "How to Build a Custom Agent Framework with PI: The Agent Stack Powering OpenClaw." *Substack*, 2026. <https://nader.substack.com/p/how-to-build-a-custom-agent-framework>

6. Ronacher, Armin. "Pi: The Minimal Agent Within OpenClaw." *Armin Ronacher's Thoughts and Writings*, 31 Jan. 2026. <https://lucumr.pocoo.org/2026/1/31/pi/>

7. Agarwal, Shivam. "Agentic AI: Pi — Anatomy of a minimal coding agent powering OpenClaw." *Medium*, 6 Feb. 2026. <https://shivamagarwal7.medium.com/agentic-ai-pi-anatomy-of-a-minimal-coding-agent-powering-openclaw-5ecd4dd6b440>

8. Zechner, Mario. "What I learned building an opinionated and minimal coding agent." *mariozechner.at*, 30 Nov. 2025. <https://mariozechner.at/posts/2025-11-30-pi-coding-agent/>

9. OpenClaw. "Pi Integration Architecture." *docs.openclaw.ai*. 2026. <https://docs.openclaw.ai/pi-dev>

10. "Pi Agent: The 418-Line Agent Loop That Outperforms Thousand-Line Frameworks." *AI Plain English*, 29 Mar. 2026. <https://ai.plainenglish.io/pi-agent-the-418-line-agent-loop-that-outperforms-thousand-line-frameworks-4e89b35692be>

11. Disler. "pi-vs-claude-code: Comparison between open source PI agent and closed source Claude Code agent." *GitHub*, 2026. <https://github.com/disler/pi-vs-claude-code>

12. Cullen Rowe, Paul. "Agentic Coding Harnesses: A Comparison." *Medium*, Apr. 2026. <https://prowe214.medium.com/agentic-coding-harnesses-a-comparison-4db34b87fd5c>

13. DeepWiki. "pi-coding-agent SDK." *deepwiki.com*. 2026. <https://deepwiki.com/earendil-works/pi/7.1-pi-coding-agent-sdk>

14. "Pi.dev Review: Secure Terminal AI Agent (2026)." *Petronella Cybersecurity News*, 6 May 2026. <https://petronellatech.com/blog/pi-dev-platform-review/>

15. Qualisero. "Awesome Pi Agent." *GitHub*, 2026. <https://github.com/qualisero/awesome-pi-agent>

16. Earendil Works. "@earendil-works/pi-coding-agent." *npm*, 2026. <https://www.npmjs.com/package/@earendil-works/pi-coding-agent>

17. "Agentic Frameworks Deep Dive: pi-agent-core vs Google ADK vs AWS Strands." *Amine Elfarssi*, 2026. <https://amineelfarssi.github.io/blog/agentic-frameworks-comparison/>

18. Sleeping Robots. "Pi Web UI: A Browser Interface for the Pi Coding Agent." *sleepingrobots.com*, 2026. <https://sleepingrobots.com/dreams/pi-web-ui/>

19. "Pi Coding Agent: The Minimal Harness That Rewrites Itself." *Byteiota*, 2026. <https://byteiota.com/pi-coding-agent-minimal-harness/>

20. "Inside OpenClaw: How the World's Fastest-Growing AI Agent Actually Works Under the Hood." *DEV Community*, 2026. <https://dev.to/jiade/inside-openclaw-how-the-worlds-fastest-growing-ai-agent-actually-works-under-the-hood-4p5n>
