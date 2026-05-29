# Qdrant

**Research date:** 2026-05-29
**Status:** Complete (3-phase research)
**Tags:** vector-database, qdrant, rust, hybrid-search, hnsw, distributed, embeddings

## Overview

Qdrant is a vector database written in Rust that provides disk-based storage, strong payload filtering, hybrid search with sparse vectors, and a balance of managed (Qdrant Cloud) and self-hosted deployment options. This research covers Qdrant's architecture, API/SDKs, filtering and hybrid search capabilities, distributed deployment, performance characteristics, and competitive positioning against Pinecone, Milvus, and Weaviate.

## Key Findings

1. **Disk-based storage enables ~10x lower hardware costs** than in-memory alternatives, with deployment possible on a $30/month VPS
2. **Unified indexing (v1.13+)** eliminates the 10–20% filtered search performance penalty by combining HNSW graph with payload indexes
3. **Sparse vector support** enables hybrid search via Reciprocal Rank Fusion (RRF), combining dense vector similarity with keyword matching
4. **Qdrant Cloud** offers a free tier (up to 8M vectors with binary quantization) and includes free cloud inference for embedding models
5. **ACORN algorithm (v1.16+)** improves filtered search accuracy by exploring second-hop neighbors when direct neighbors are filtered out

## Sub-Topics Covered

- Qdrant Architecture & Core Design (disk-based storage, HNSW, payload indexing, unified indexing)
- Qdrant API & SDKs (REST, gRPC, Python/JS/Rust/Go/Java/C# SDKs)
- Qdrant Filtering, Sparse Vectors & Hybrid Search (ACORN, RRF fusion, filter syntax)
- Qdrant Distributed Deployment (replication, sharding, leaderless cluster, fault tolerance)
- Qdrant Performance & Benchmarks (latency, throughput, memory efficiency, quantization)
- Qdrant Ecosystem & Integrations (LangChain, LlamaIndex, Haystack, DSPy, Qdrant Cloud)

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

- [RAG Systems](../rag-systems/index.md) (mentions Qdrant as a vector database option)
