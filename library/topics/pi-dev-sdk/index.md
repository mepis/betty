# pi.dev SDK

**Research date:** 2026-06-03
**Status:** Complete (3-phase research)
**Tags:** pi.dev, SDK, agent-harness, TypeScript, coding-agent, OpenClaw, extensions, RPC, Lit

## Overview

The pi.dev SDK is the programmatic interface for embedding Mario Zechner's open-source coding agent into custom applications, workflows, and infrastructure. Built as a TypeScript monorepo with layered packages, it exposes `createAgentSession()` as its primary factory. The SDK is distinguished by its minimalist design (4 tools, <1000 token system prompt, ~1500 line agent core) and deep extensibility (25+ typed extension events). OpenClaw (145k+ stars) is the canonical real-world integration.

## Key Findings

1. **Layered monorepo architecture:** Five core packages (pi-ai, pi-agent-core, pi-coding-agent, pi-tui, pi-web-ui) with strict DAG dependencies — each independently usable.
2. **AgentSession API:** Rich event streaming, steering/follow-up queues, session tree with branching/forking, model hot-swapping, and compaction control.
3. **Extension system:** 25+ typed events across 7 categories, in-process TypeScript (not shell-based), hot reloading, tool registration, and system prompt modification.
4. **Four integration modes:** Interactive TUI, print/JSON, RPC (JSONL over stdin/stdout), and direct SDK embedding — each serving different use cases.
5. **Competitive advantage:** Most extensible open-source coding agent SDK — outperforms heavier frameworks on Terminal-Bench despite minimalism.

## Sub-Topics Covered

- SDK Architecture and Monorepo Structure
- AgentSession API and Event System
- Extension System and Customization
- Session Management and Persistence
- Integration Patterns (OpenClaw, RPC, Web UI)
- Comparison with Other Frameworks

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

- [LLM Harness](../llm-harness/) — General agent harness taxonomy and ETCLOVG framework
- [OpenAI Compatible APIs](../openai-compatible-apis/) — Provider ecosystem that pi integrates with
