# Library Index

Master index of all research topics in the Merlin Library.

| Topic | Date | Status | Tags |
|-------|------|--------|------|
| [Wiki-Style RAG Systems](topics/wiki-style-rag-systems/) | 2026-05-21 | Complete | rag, ai, llm, knowledge-bases, research |
| [pi.dev (Pi Coding Agent)](topics/pi-dev/) | 2026-05-22 | Complete | coding-agent, terminal, typescript, ai, self-modifying, extensions, packages, tui, open-source |

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
