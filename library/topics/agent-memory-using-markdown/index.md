# Agent Memory Using Markdown

**Research date:** 2026-05-29
**Status:** Complete (4-phase research)
**Tags:** agent-memory, markdown, llm-wiki, structured-text, mcp

## Overview

This research investigates using Markdown as the primary memory representation format for AI agents. Rather than treating Markdown as a simple document format, structured Markdown files — combined with SQLite indexing, YAML frontmatter, and knowledge compilation architectures — create a new class of agent memory systems that are simultaneously human-readable, machine-processable, git-versionable, and production-grade. This topic is distinct from general agent memory strategies, focusing specifically on the technical and architectural aspects of Markdown-based memory encoding.

## Key Findings

1. **The LLM Wiki pattern (Karpathy, 2026)** transforms RAG from retrieval-only to compilation-based knowledge accumulation, using a three-layer architecture (raw sources → wiki → schema) with Ingest/Query/Lint operations and cross-linking as synthesis.

2. **Markdown is 15% more token-efficient than JSON** for the same content, with savings widening to 20-25% at deeper nesting levels — translating to measurable cost savings in production systems.

3. **Hybrid Markdown+SQLite systems** (memweave, agentmemory) achieve state-of-the-art benchmark performance (98% Recall@5 on LongMemEval-S) while maintaining human readability, scaling to 100K+ entries with BM25 + vector search indexing.

4. **Production-grade Markdown memory formats** (neocortex.md, ClawMem, agentmemory, memweave) provide explicit schemas, governance rules (immutability, confidence scoring, supersession semantics), and four-tier memory architectures (working → episodic → semantic → procedural).

5. **The "Obsidian as IDE" pattern** enables human-in-the-loop memory editing where the LLM acts as the "programmer" generating Markdown files and the human acts as the "reviewer" curating them in Obsidian's visual interface.

## Sub-Topics Covered

- Markdown as the Memory Storage Medium
- The LLM Wiki Pattern (Karpathy, 2026)
- Structured Markdown Memory Formats (neocortex.md, ClawMem, agentmemory, memweave)
- File-Based Memory vs. Vector Databases
- Personal Knowledge Management for Agents
- MCP-Based Markdown Memory Servers
- Memory Compression and Lifecycle in Markdown

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

- [Agent Memory Strategies](../agent-memory-strategies/index.md) — General agent memory architectures, frameworks, and benchmarks (complementary, focuses on different aspects)
- [RAG Systems](../rag-systems/index.md) — RAG focuses on document retrieval; Markdown memory extends RAG with compilation-based knowledge accumulation
