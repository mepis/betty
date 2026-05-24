# Library Index

Master index of all research topics in the Merlin Library.

| Topic | Date | Status | Tags |
|-------|------|--------|------|
| [Wiki-Style RAG Systems](topics/wiki-style-rag-systems/) | 2026-05-21 | Complete | rag, ai, llm, knowledge-bases, research |
| [pi.dev (Pi Coding Agent)](topics/pi-dev/) | 2026-05-22 | Complete | coding-agent, terminal, typescript, ai, self-modifying, extensions, packages, tui, open-source |
| [Betty Project](topics/betty-project/) | 2026-05-24 | Complete | web-app, chat, pi-agent, full-stack, vue, express, websocket, rbac |
| [Compacting Sessions for LLM Agents](topics/compacting-sessions-for-llm-agents/) | 2026-05-24 | Complete | compaction, llm-agents, context-management, memory, token-optimization, prompt-caching, summarization, external-memory |

## Topic Details

### Wiki-Style RAG Systems

- **Date added:** 2026-05-21
- **Status:** Complete (3-phase research)
- **Tags:** rag, ai, llm, knowledge-bases, research
- **Summary:** Comprehensive analysis of wiki-style retrieval-augmented generation systems — architectures that compile knowledge into persistent, cross-linked LLM-maintained representations rather than retrieving raw document fragments at query time.
- **Key findings:**
  - First preregistered empirical comparison shows wiki excels at cross-paper synthesis but costs 21× more per query
  - Decomp-RAG recovers 88% of wiki's synthesis advantage at 3.4× lower cost
  - No single architecture optimizes for synthesis quality, citation support, and cost simultaneously
  - Field converging on hybrid architectures (75% of enterprises projected to combine wiki+RAG+agentic search)
- **Report:** [Full report](topics/wiki-style-rag-systems/report.md)
- **State:** [Research state](topics/wiki-style-rag-systems/state.md)

### pi.dev (Pi Coding Agent)

- **Date added:** 2026-05-22
- **Status:** Complete (3-phase research)
- **Tags:** coding-agent, terminal, typescript, ai, self-modifying, extensions, packages, tui, open-source
- **Summary:** Comprehensive analysis of the pi.dev documentation ecosystem for the Pi Coding Agent — an open-source, minimal, self-modifying terminal coding agent with a sub-1000-token system prompt, four built-in tools, and a rich TypeScript extension system.
- **Key findings:**
  - Pi uses a custom terminal UI library (@mariozechner/pi-tui) with differential rendering — not based on Ink, React-Ink, or any other TUI framework
  - Self-documenting architecture: the agent reads its own documentation to understand, explain, and extend itself
  - Extension system with rich API (registerTool, registerCommand, event subscriptions, TUI access) and hundreds of community packages
  - Supports 15+ AI providers with extensible security features and community guardrails
  - Programmatic integration via SDK (Node.js), RPC mode (JSONL over stdin/stdout), and JSON event stream mode
- **Report:** [Full report](topics/pi-dev/report.md)
- **State:** [Research state](topics/pi-dev/state.md)

### Betty Project

- **Date added:** 2026-05-24
- **Status:** Complete
- **Tags:** web-app, chat, pi-agent, full-stack, vue, express, websocket, rbac
- **Summary:** Technical documentation and architecture report for the Betty project — a web-based chat application providing a browser interface for the Pi coding agent, with JWT authentication, role-based access control, real-time streaming, and an admin panel.
- **Key findings:**
  - Direct SDK integration (not RPC) enables context window manipulation
  - Role-based access control with 5 resources × 6 actions permission model
  - WebSocket protocol with rate limiting, message size limits, and auto-reconnect
  - Vue 3 composables with singleton pattern for shared state management
- **Report:** [Full report](topics/betty-project/report.md)

### Compacting Sessions for LLM Agents

- **Date added:** 2026-05-24
- **Status:** Complete (4-phase research)
- **Tags:** compaction, llm-agents, context-management, memory, token-optimization, prompt-caching, summarization, external-memory
- **Summary:** Comprehensive analysis of session compaction techniques for long-running LLM agents — summarization-based, structural/extractive, external memory/episodic retrieval, KV cache compression, and formal commitment-based frameworks. Covers production implementations (Claude Code, Google ADK, Microsoft Agent Framework, LangChain Deep Agents) and identifies compaction chain degradation as the field's most critical unresolved challenge.
- **Key findings:**
  - No single technique dominates; production systems combine structural, summarization, external memory, and retrieval strategies in layered architectures
  - Structured summaries (organized sections) outperform freeform narratives — Factory.ai scored 3.70/5 vs. 2.19–2.45/5 on artifact tracking across 36,611 production messages
  - Compaction chains compound error across multi-day sessions; current benchmarks do not adequately capture this failure mode
  - Prompt caching + compaction achieve 90%+ total cost savings when properly architected (stable system prompt + cache breakpoint on compaction block)
  - KV cache compression (KVTC, ICLR 2026) achieves ~20× compression at inference engine level, complementing API-level summarization
- **Report:** [Full report](topics/compacting-sessions-for-llm-agents/report.md)
- **State:** [Research state](topics/compacting-sessions-for-llm-agents/state.md)
