# RAG Systems

**Research date:** 2026-05-29
**Status:** Complete (3-phase research)
**Tags:** rag, retrieval, embeddings, vector-databases, llm, architecture, evaluation, frameworks

## Overview

Retrieval-Augmented Generation (RAG) is the dominant paradigm for grounding large language models in proprietary, up-to-date, and verifiable knowledge. This research covers the full RAG ecosystem: pipeline architecture, chunking strategies, embedding models, vector databases, advanced patterns (agentic RAG, graph RAG, hybrid search), evaluation frameworks (RAGAS, eRAG), tooling (LangChain, LlamaIndex, DSPy), and production deployment considerations.

## Key Findings

1. **Component selection matters more than framework choice**: A minimal 150-line Python pipeline with careful component selection outperforms a framework-based approach with poor choices.
2. **Hybrid search is essential**: Combining BM25 keyword matching with dense vector similarity improves recall by 15–25 points over pure vector search.
3. **BGE-M3 and Voyage-3 are top embedding models for RAG**: Both outperform OpenAI's text-embedding-3-large in independent benchmarks.
4. **RAGAS provides standardized evaluation**: The LLM-as-judge approach enables continuous improvement without expensive human annotation.
5. **Agentic and programmatic RAG are the next frontier**: Systems that reason about retrieval and optimize their own components through compilation represent the cutting edge.

## Sub-Topics Covered

- RAG Architecture & Pipeline Components
- Chunking Strategies (fixed-size, semantic, recursive, parent-child)
- Embedding Models & Vector Databases
- Advanced RAG Patterns (agentic, graph, hybrid, re-ranking)
- RAG Evaluation & Metrics (RAGAS, eRAG)
- RAG Frameworks & Tooling (LangChain, LlamaIndex, Haystack, DSPy, RAGFlow)
- Production RAG Systems (stack selection, monitoring, cost optimization)

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

- [OpenAI Compatible APIs](../openai-compatible-apis/index.md) (mentions RAG as a use case)
