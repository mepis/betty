---
topic: "Qdrant"
created_at: "2026-05-29 14:00"
last_updated: "2026-05-29 14:00"
current_phase: "Phase 3"
status: "active"
library_topic_slug: "qdrant"
library_entry_exists: false
stopping_criteria: ""
---

## Phase 0: Library Check

existing_entries:
- No existing Qdrant-specific entries in library
- Related: RAG Systems entry mentions Qdrant briefly (Rust-based, fast, good filtering, $30/mo VPS self-hosted option, hybrid search support)
- Gap: No deep-dive into Qdrant's architecture, features, API, performance characteristics, or ecosystem

phase_0_complete: true

## Phase 1: Foundational Survey

sub_topics:

- name: "Qdrant Architecture & Core Design"
  definition: "Qdrant's Rust-based vector database architecture, including its storage engine, query processing pipeline, and distributed deployment model."
  key_concepts: ["Rust-based storage engine", "Payload indexing", "Disk-based vector storage", "Column-oriented storage"]

- name: "Qdrant API & SDKs"
  definition: "The programmatic interfaces for interacting with Qdrant, including REST API, gRPC, and language-specific SDKs."
  key_concepts: ["REST API", "gRPC API", "Python SDK", "JavaScript SDK", "Qdrant Client"]

- name: "Qdrant Filtering & Scoring"
  definition: "Qdrant's advanced filtering capabilities, scoring functions, and hybrid search mechanisms."
  key_concepts: ["Filter syntax", "Payload conditions", "Scoring functions", "Hybrid search", "Sparse vectors"]

- name: "Qdrant Distributed Deployment"
  definition: "Qdrant's distributed architecture, replication, sharding, and high-availability features."
  key_concepts: ["Replication", "Sharding", "Consistent hashing", "Leaderless architecture", "Fault tolerance"]

- name: "Qdrant Performance & Benchmarks"
  definition: "Qdrant's performance characteristics, benchmark results, and optimization strategies."
  key_concepts: ["Query latency", "Throughput", "Memory efficiency", "Disk I/O", "Indexing strategies"]

- name: "Qdrant Ecosystem & Integrations"
  definition: "Qdrant's integration with popular frameworks, tools, and cloud platforms."
  key_concepts: ["LangChain", "LlamaIndex", "Haystack", "Pinecone alternative", "Managed Qdrant Cloud"]

phase_1_complete: true

## Phase 2: Deep Dive

deep_dives:

- topic: "Qdrant Architecture & Core Design"
  defined: true
  trends:
    - "Unified Indexing (v1.13+): A single HNSW index that serves as both dense vector index and payload index, replacing the previous separate index structures. This eliminates the 10-20% performance penalty of previous filtered search approaches and allows payload indexes to serve as HNSW graph starting points."
    - "Disk-based Vector Storage: Qdrant stores vectors on disk rather than in RAM, enabling significantly lower hardware costs compared to in-memory alternatives like Pinecone and Weaviate. This is achieved through column-oriented storage and a Rust-based storage engine optimized for disk I/O."
    - "Payload Indexing: Qdrant supports four types of payload indexes — keyword, integer, float, and text — each optimized for different data types and query patterns. The new unified indexing in v1.13 allows these payload indexes to be integrated into the HNSW graph, dramatically improving filtered search performance."
  example: "Qdrant's architecture stores vectors on disk using column-oriented storage, with a Rust-based storage engine that handles indexing, filtering, and search. The HNSW (Hierarchical Navigable Small World) graph is used for approximate nearest neighbor search, while payload indexes (keyword, integer, float, text) enable efficient filtering. In v1.13, the unified indexing feature combines the HNSW graph with payload indexes into a single structure, eliminating the separate index penalty. The system supports both in-memory and disk-based storage, with the disk-based approach enabling deployment on a $30/month VPS for small-to-medium workloads."
  example_source: "https://markaicode.com/architecture/qdrant-vector-database-architecture/, https://qdrant.tech/documentation/guides/overview/"

- topic: "Qdrant API & SDKs"
  defined: true
  trends:
    - "Multi-language SDK Support: Qdrant provides official SDKs for Python, JavaScript/TypeScript, Rust, Go, Java, C#, and HTTP client, with each SDK supporting the full REST API and gRPC API feature set."
    - "gRPC API: A high-performance gRPC interface that complements the REST API, designed for low-latency applications and efficient serialization. The gRPC API supports all search, upsert, and management operations."
    - "REST API: The primary interface for Qdrant, with a comprehensive set of endpoints for collection management, point operations, and search. The API is designed to be intuitive and well-documented."
  example: "Qdrant's Python SDK provides a high-level interface for interacting with the vector database. Key operations include creating collections with specified vector configurations (distance metric, dimension), upserting points with vectors and payload data, performing vector search with filters and score thresholds, and managing payload indexes. The SDK supports both synchronous and asynchronous operations, and integrates seamlessly with LangChain and LlamaIndex for RAG pipelines."
  example_source: "https://www.qdrant.tech/llms-full.txt, https://qdrant.tech/documentation/guides/overview/"

- topic: "Qdrant Filtering, Sparse Vectors & Hybrid Search"
  defined: true
  trends:
    - "Sparse Vector Support: Qdrant supports sparse vectors (unstructured, non-negative vectors with few non-zero elements) alongside dense vectors, enabling hybrid search that combines dense vector similarity with sparse keyword matching for improved retrieval quality."
    - "ACORN Search Algorithm (v1.16+): An extension to HNSW that improves filtered search accuracy by exploring second-hop neighbors when direct neighbors are filtered out, trading some performance for higher precision in complex filter scenarios."
    - "Advanced Filtering: Qdrant's filter syntax supports complex boolean combinations of payload conditions (must, must_not, should), range conditions, geo-filters, and nested field access, with optimized index structures for each data type."
  example: "Qdrant's sparse vector implementation uses the dot product as the default scoring metric and performs exact (non-approximate) search. Sparse vectors return only results with non-zero values in the same indices as the query, making search speed proportional to the number of non-zero values. Hybrid search combines sparse and dense vector results using reciprocal rank fusion (RRF), which merges the two result sets without requiring re-scoring. The ACORN algorithm improves filtered search accuracy by exploring second-hop neighbors in the HNSW graph when direct neighbors are filtered out."
  example_source: "https://qdrant.tech/documentation/concepts/search/, https://deepwiki.com/qdrant/qdrant/3-payload-indexing"

phase_2_complete: true

## Phase 3: Gap Analysis

gaps:

- description: "Qdrant vs competitors: Need detailed performance comparison with Pinecone, Milvus, and Weaviate"
  questions: ["How does Qdrant compare to Pinecone, Milvus, and Weaviate in terms of performance, cost, and features?", "When should Qdrant be chosen over other vector databases?"]
  resolved: true
  findings: "Qdrant vs Pinecone: Qdrant's disk-based storage enables 10x lower hardware costs for equivalent vector counts. Pinecone is fully managed with simpler setup but lacks Qdrant's payload filtering and hybrid search. Qdrant vs Milvus: Milvus offers more distributed deployment options and better multi-vector-type support (dense, sparse, multi-modal), while Qdrant has simpler deployment and better filtering performance. Qdrant vs Weaviate: Weaviate has built-in ML models for on-the-fly embedding and GraphQL API, while Qdrant has better filtering performance and lower hardware costs. Qdrant's unique strengths: disk-based storage (low cost), unified indexing (fast filtered search), sparse vectors (hybrid search), and strong filtering capabilities. Qdrant's weaknesses: smaller community than Pinecone/Milvus, less mature multi-modal support than Milvus."
  source: "https://tensorblue.com/blog/vector-database-comparison-pinecone-weaviate-qdrant-milvus-2025, https://www.modern-datatools.com/tools/qdrant"

- description: "Qdrant managed cloud vs self-hosted: Need detailed cost analysis and deployment guidance"
  questions: ["When does Qdrant Cloud become more expensive than self-hosted?", "What is the optimal deployment model for different use cases?"]
  resolved: true
  findings: "Qdrant Cloud pricing (April 2026): Free tier (0.5 vCPU, 1GB RAM, 4GB disk, ~250K vectors uncompressed or ~8M with binary quantization), Standard tier ($30-200/month, hourly billing for dedicated resources), Premium tier (99.9% SLA, SSO, custom features). Self-hosted crossover: ~$96/month (DigitalOcean 16GB VPS). Below 16GB RAM, Qdrant Cloud is often cheaper or comparable. Above 16GB RAM, self-hosted saves $100-300/month. Key decision: Qdrant Cloud includes free cloud inference for embedding models (added 2026), managed backups, automatic upgrades, and horizontal scaling. Self-hosted offers full control, no vendor lock-in, and lower costs at scale. Correct deployment model: the one whose monthly cost at your production vector count and write frequency is lower, plus operational overhead."
  source: "https://ranksquire.com/2026/04/19/qdrant-cloud-pricing-2026/"

- description: "Qdrant limitations and when NOT to use it: Need honest assessment of weaknesses"
  questions: ["What are Qdrant's main weaknesses and limitations?", "When should I choose a different vector database instead of Qdrant?"]
  resolved: true
  findings: "Qdrant's main weaknesses: (1) No built-in graph traversal for relationship queries (Milvus has better multi-hop relationship support). (2) Smaller community and fewer third-party integrations than Pinecone or Milvus. (3) Less mature multi-modal support (Milvus supports dense, sparse, and multi-modal vectors natively). (4) Disk-based storage can be slower than in-memory databases for ultra-low-latency requirements (<1ms). (5) No built-in ML models for on-the-fly embedding (Weaviate has this). When to choose alternatives: Use Pinecone if you want zero-ops managed service with no infrastructure management. Use Milvus if you need multi-modal vector support or complex distributed deployments across multiple cloud providers. Use Weaviate if you need built-in ML models for on-the-fly embedding or GraphQL API. Use Qdrant when you want low-cost disk-based storage with strong filtering, hybrid search capabilities, and a balance of managed/self-hosted flexibility."
  source: "https://www.modern-datatools.com/tools/qdrant"

phase_3_complete: true
