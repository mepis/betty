# Agent Memory Strategies

**Research date:** 2026-05-29
**Status:** Complete (4-phase research)
**Tags:** agent-memory, llm-architecture, memory-benchmarks, privacy-security, multi-agent-systems

## Overview

Agent memory strategies encompass the architectures, mechanisms, and frameworks that enable AI agents to store, retrieve, manage, and evolve their memories over time. This field has evolved from simple retrieval-augmented generation extensions to sophisticated, multi-layered systems combining vector stores, knowledge graphs, self-supervised learning, and privacy-aware management. Effective agent memory is critical for building agents that can maintain persistent relationships with users, learn from experience, and adapt their behavior over time.

## Key Findings

1. **Hybrid architectures dominate:** Vector-graph hybrid architectures are becoming the standard for long-term memory, combining the semantic richness of embeddings with the relational reasoning power of knowledge graphs. MAGMA achieves 20-73% improvement over baselines using graph-based memory.

2. **Memory management is as important as storage:** Forgetting mechanisms, conflict resolution, memory compression, and privacy controls are now recognized as equally critical to storage and retrieval. The MEXTRA attack demonstrates real privacy risks in agent memory systems.

3. **Production frameworks have matured:** Mem0 (10+ storage backends), Zep (conversational memory), and LangGraph Store (type-safe memory API) provide production-ready solutions with distinct architectural trade-offs.

4. **Evaluation has specialized:** Dedicated benchmarks (Memora, MemBench, Evo-Memory, LOCCO) now measure memory quality independently of downstream task performance across dimensions like retention, retrieval accuracy, adaptation, and privacy compliance.

5. **Self-evolving memory is the frontier:** Systems like ReMe demonstrate that agents with self-evolving memory (remember → reflect → refine) significantly outperform static memory agents on long-term reasoning tasks.

## Sub-Topics Covered

- Memory Taxonomy & Classification (episodic, semantic, procedural, working memory)
- Long-Term Memory Architectures (vector, graph, hybrid)
- Memory Retrieval Strategies (semantic search, temporal indexing, SSGM, routing)
- Memory Management & Governance (forgetting, compression, privacy, conflict resolution)
- Production Frameworks & Tools (Mem0, Zep, LangGraph Store)
- Agent Memory Benchmarks & Evaluation (MemBench, Memora, LOCCO, Evo-Memory)
- Self-Evolving Memory Systems (ReMe, test-time learning, preference-aware updates)
- Privacy & Security (MEXTRA attack, MemPot, A-MemGuard, Right to be Forgotten)
- Multi-Agent Memory Sharing (Collaborative Memory, LatentMAS, dynamic access control)

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

- [RAG Systems](../rag-systems/index.md) — RAG is related but distinct from agent memory
- [LLM Harness](../llm-harness/index.md) — Agent memory is a component of LLM harness architectures
