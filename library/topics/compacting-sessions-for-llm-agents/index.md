# Compacting Sessions for LLM Agents

**Research date:** 2026-05-24
**Status:** Complete (4-phase research)
**Tags:** compaction, llm-agents, context-management, memory, token-optimization, prompt-caching, summarization, external-memory

## Overview

Session compaction is the process of managing LLM agent conversation history when it exceeds the model's context window — through summarization, eviction, retrieval, or structural compression. As AI agents operate over longer time horizons (hours to days of continuous work), compaction has evolved from an optimization trick to a first-class platform concern, directly impacting cost, latency, correctness, and debuggability. This research covers the full spectrum of compaction approaches, from widely deployed summarization to cutting-edge KV cache compression and formal commitment-based frameworks.

## Key Findings

1. **No single technique dominates** — Production systems combine multiple strategies in layered architectures: structural techniques (deduplication, canonicalization) for zero-cost baseline, summarization for bulk reduction, external memory for critical facts, and retrieval for cross-session continuity.
2. **Structured summaries outperform freeform narratives** — Factory.ai's benchmark of 36,611 production messages scored structured summaries 3.70/5 overall vs. 2.19–2.45/5 for generic summarization on artifact tracking (which files were modified).
3. **Compaction chains compound error** — Each summary is itself summarized in the next cycle, progressively smoothing out specifics. Current benchmarks do not adequately capture this failure mode.
4. **Prompt caching and compaction have fundamental tension** — Compaction invalidates cached prefixes, but proper architecture (stable system prompt + cache breakpoint on compaction block) can mitigate this, achieving 90%+ total cost savings with caching + compaction combined.
5. **KV cache compression operates at a different level** — KVTC (ICLR 2026) achieves ~20× compression at the inference engine level, complementing (not competing with) API-level summarization by preserving information at the mathematical rather than semantic level.

## Sub-Topics Covered

- Summarization-Based Compaction (rolling, hierarchical, map-reduce)
- Structural & Extractive Compression (deduplication, LLMLingua, observation masking)
- External Memory & Episodic Retrieval (MemGPT/Letta, Cognee, vector databases)
- Hybrid Approaches (Keep Edges, Summarize Middle)
- Compaction Chains & Evaluation (LoCoMo, Context-Bench, Factory.ai framework)
- KV Cache-Level Compression (KVTC, PRISM)
- Formal Commitment-Based Compression (Context Codec, CCL)
- Prompt Caching Interactions (Anthropic, OpenAI, Google)

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

- [pi.dev (Pi Coding Agent)](../pi-dev/) — Surface-level discussion of Pi's session compaction and branching
