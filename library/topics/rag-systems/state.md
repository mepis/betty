---
topic: "RAG Systems"
created_at: "2026-05-29 12:00"
last_updated: "2026-05-29 12:00"
current_phase: "Phase 3"
status: "active"
library_topic_slug: "rag-systems"
library_entry_exists: false
stopping_criteria: ""
---

## Phase 0: Library Check

existing_entries:
- No existing RAG-specific entries found in library
- Related: OpenAI Compatible APIs (mentions RAG briefly as a use case, not deep coverage)
- Action: Full research needed, no prior research to build on

phase_0_complete: true

## Phase 1: Foundational Survey & Scoping

sub_topics:

- name: "RAG Architecture & Pipeline Components"
  definition: "The core retrieval-generation pipeline: document ingestion, chunking, embedding, vector indexing, retrieval, and generation with prompt construction."
  key_concepts: ["Embedding models", "Vector databases", "Document chunking", "Prompt construction", "Context window management"]

- name: "Chunking Strategies"
  definition: "Methods for splitting documents into retrievable units, including fixed-size, semantic, recursive, and parent-child approaches."
  key_concepts: ["Fixed-size chunking", "Semantic chunking", "Recursive chunking", "Parent-child retrieval", "Overlap strategies"]

- name: "Embedding Models & Vector Databases"
  definition: "The choice of embedding models and vector stores that determine retrieval quality, scalability, and performance trade-offs."
  key_concepts: ["Embedding model selection", "Vector stores (Milvus, Pinecone, Weaviate, FAISS)", "Hybrid search (BM25 + dense)", "Dimensionality", "Indexing strategies"]

- name: "Advanced RAG Patterns"
  definition: "Extensions beyond basic RAG including hybrid search, multi-query retrieval, graph RAG, document routing, and query transformation."
  key_concepts: ["Hybrid search", "Multi-query retrieval", "Graph RAG", "Query transformation", "Document routing", "Re-ranking"]

- name: "RAG Evaluation & Metrics"
  definition: "Frameworks and methodologies for measuring RAG quality, including RAGAS, LlamaIndex evaluations, and custom metrics."
  key_concepts: ["RAGAS metrics", "Context precision/recall", "Answer faithfulness", "Semantic similarity", "Benchmark datasets"]

- name: "RAG Frameworks & Tooling"
  definition: "Software frameworks that provide building blocks for RAG systems, including LangChain, LlamaIndex, Haystack, and DSPy."
  key_concepts: ["LangChain", "LlamaIndex", "Haystack", "DSPy", "Semantic kernel"]

- name: "Production RAG Systems"
  definition: "Engineering considerations for deploying RAG at scale: latency, caching, monitoring, cost optimization, and reliability."
  key_concepts: ["Caching strategies", "Latency optimization", "Monitoring & observability", "Cost management", "A/B testing"]

phase_1_complete: true

## Phase 2: Deep Dive

deep_dives:

- topic: "RAG Architecture & Pipeline Components"
  defined: true
  trends:
    - "Agentic RAG: Systems that reason about when and how to retrieve, using LLMs as orchestrators that can choose between retrieval, direct generation, or multi-step retrieval"
    - "Graph RAG: Using knowledge graphs alongside vector search to capture relationships between entities and enable multi-hop reasoning"
    - "Hybrid Search: Combining dense vector similarity with sparse BM25 keyword matching for more robust retrieval across both semantic and literal queries"
  example: "AWS RAG architecture: Documents → Chunking → Embedding → Vector DB → Similarity Search → Context Injection → LLM Generation. The ingestion pipeline handles document loading, splitting, embedding, and indexing. The retrieval pipeline performs similarity search and context augmentation. The generation pipeline constructs prompts with retrieved context and generates responses."
  example_source: "https://aws.amazon.com/what-is/retrieval-augmented-generation/"

- topic: "Chunking Strategies"
  defined: true
  trends:
    - "Semantic chunking: Using sentence embeddings and semantic similarity to split documents at natural boundaries rather than fixed sizes"
    - "Parent-child retrieval: Storing small child chunks for retrieval but retrieving their larger parent chunks for context, balancing granularity with completeness"
    - "Autocut: Using a scoring model to determine optimal chunk boundaries based on content coherence"
  example: "Weaviate's chunking comparison: Fixed-size chunking (simple but ignores semantic boundaries), Semantic chunking (splits at semantic boundaries using sentence embeddings), Recursive chunking (splits by paragraphs then characters), and Parent-child retrieval (small chunks for retrieval, large parents for context). Parent-child retrieval showed 20-30% improvement in evaluation scores over fixed-size chunking."
  example_source: "https://weaviate.io/blog/chunking-strategies-for-rag"

- topic: "RAG Evaluation & Metrics"
  defined: true
  trends:
    - "RAGAS framework: Uses LLM-as-judge approach with metrics including Faithfulness (answer grounded in context), Answer relevancy (answer matches question), Context precision/recall (retrieved context relevance)"
    - "eRAG (Evaluating Retrieval Quality): Novel metrics that evaluate retrieval quality independently of the generation step, using semantic similarity between retrieved chunks and ground-truth answers"
    - "Multi-dimensional evaluation: Combining retrieval metrics (precision, recall, MRR) with generation metrics (faithfulness, relevancy, coherence) for holistic assessment"
  example: "RAGAS metrics: Faithfulness (measures if answer is grounded in retrieved context using answer-to-context entailment), Answer relevancy (measures how relevant the answer is to the question using embedding similarity), Context precision (measures what fraction of retrieved context is relevant), Context recall (measures how much of the ground-truth relevant context was retrieved). These metrics can be computed without ground-truth answers using self-supervised approaches."
  example_source: "https://docs.ragas.io/en/latest/concepts/metrics/available_metrics/"

phase_2_complete: true

## Phase 3: Gap Analysis

gaps:

- description: "Embedding models: Need detailed knowledge of best models, benchmarks, and trade-offs"
  questions: ["Which embedding models lead the MTEB leaderboard in 2025-2026?", "How do domain-specific embedding models compare to general-purpose ones?"]
  resolved: true
  findings: "Top models per MTEB leaderboard (Modal blog): Qwen3-Embedding-8B (best overall, 68.24%), llama-embed-nemotron-8b (67.05%), bge-m3 (65.59%, multilingual with 100+ languages), stella_en_1.5B_v5 (63.83%, English-focused), embeddinggemma-300m (63.73%, smallest capable model). Domain-specific models outperform general models in specialized domains: BioClinicalBERT for medicine, FinBERT for finance, CodeBERT for code. For RAG specifically, BGE-M3 and Voyage-3 are recommended as top choices, beating OpenAI text-embedding-3-large in independent benchmarks."
  source: "https://modal.com/blog/mteb-leaderboard-article"

- description: "Vector databases: Need comparison of features, trade-offs, and production considerations"
  questions: ["How do Pinecone, Weaviate, Milvus, Qdrant, and FAISS compare?", "When to use managed vs. self-hosted vector databases?"]
  resolved: true
  findings: "Managed: Pinecone (fastest setup, pay-per-use, limited customization), Weaviate (hybrid search built-in, GraphQL API, strong community). Self-hosted: Milvus (most scalable, cloud-native, complex deployment), Qdrant (Rust-based, fast, good filtering), FAISS (Facebook, fastest for pure vector search, no metadata). Choice depends on scale (<10M vectors: pgvector if you already run Postgres; >10M: Milvus or Qdrant), budget (Pinecone for managed, Qdrant on $30/mo VPS for self-hosted), and features needed (hybrid search: Weaviate, Milvus; pure speed: FAISS)."
  source: "https://www.tensorblue.ai/blog/benchmarking-vector-databases/"

- description: "RAG frameworks: Need comparison of LangChain, LlamaIndex, Haystack, DSPy, and newer options"
  questions: ["Which framework is best for production RAG?", "When is a minimal custom pipeline better than a framework?"]
  resolved: true
  findings: "LangChain: Most popular, largest ecosystem, best for multi-provider routing and broad integration coverage. LlamaIndex: Best for data-centric RAG with complex retrieval patterns (Auto-Retriever, recursive retrieval). Haystack: Best for regulated environments with YAML-pipeline-as-config for auditability. DSPy: Best for programmatic RAG where you optimize retrieval via compilation. RAGFlow: Best for complex document extraction (PDFs with tables, charts, multi-column layouts). Key insight: A minimal RAG pipeline is ~150 lines of Python. Frameworks add value for multi-provider routing, complex retrieval patterns, and team size (>3 engineers). Many production teams start with frameworks then rewrite in minimal code."
  source: "https://www.rulesell.com/topic/rag-frameworks"

- description: "Production RAG stack: Need concrete recommendations for component selection and optimization"
  questions: ["What is the optimal production RAG stack?", "How important is the framework choice vs. the stack choice?"]
  resolved: true
  findings: "Optimal production stack: Chunking: recursive 512-token with 64-token overlap (semantic chunking lost in Vecta 2026 benchmark). Embedding: voyage-3-large if budget allows, BGE-M3 self-hosted if cost-sensitive. Vector DB: pgvector for <10M vectors with Postgres, Qdrant self-hosted for cost, Pinecone for managed. Hybrid search: BM25 alongside vector (recall lifts 15-25 points). Reranker: Cohere rerank-v3 or voyage rerank-2. Contextual retrieval: Anthropic's pattern for high-stakes pipelines (67% lift, $1.02/M document tokens). The framework decision matters less than the stack — a bad stack in LangChain is bad, a good stack in 150-line Python is good."
  source: "https://www.rulesell.com/topic/rag-frameworks"

phase_3_complete: true
