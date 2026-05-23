# Wiki-Style RAG Systems

**Research date:** 2026-05-21  
**Status:** Complete (3-phase research)  
**Tags:** rag, ai, llm, knowledge-bases, research  

## Overview

Wiki-style Retrieval-Augmented Generation (RAG) systems are architectures that compile knowledge into persistent, cross-linked, LLM-maintained representations rather than retrieving raw document fragments at query time. This field crystallized in April 2026 when Andrej Karpathy published his "llm-wiki" GitHub Gist, proposing a radical inversion of the RAG paradigm.

## Key Findings

1. **Synthesis advantage:** Wiki-style systems score significantly better at cross-paper synthesis (inter_paper_mapping +6.625 in preregistered comparison)
2. **Cost disadvantage:** Wiki costs 21× more tokens per query than single-round vector RAG, refuting the expected amortization advantage
3. **Decomp-RAG third option:** Decomposition-retrieval RAG recovers ~88% of wiki's synthesis advantage at 3.4× lower cost than wiki
4. **Three-way tradeoff:** No single architecture optimizes for synthesis quality, claim-level citation support, and cost simultaneously
5. **Hybrid convergence:** 75% of enterprise applications projected to use hybrid wiki+RAG+agentic search by end of 2026

## Sub-Topics Covered

- The Karpathy LLM Wiki pattern and ecosystem (Obsidian, qmd, MCP servers)
- First preregistered empirical comparison (Cochran, May 2026)
- STORM from Stanford — academic Wikipedia-style generation lineage
- Hybrid architectures and enterprise adoption economics
- Evaluation methodology challenges (LLM-as-judge calibration drift)
- Related approaches (GraphRAG, MediaWiki RAG, multi-modal wiki generation)

## Files

- [Full Analytical Report](report.md) — Complete 3-phase research report with MLA citations
- [Research State](state.md) — Research state file (Phase 1-3 completed)

## Related Topics

_Now empty — add related topics as they are researched._
