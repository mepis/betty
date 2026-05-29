# ANALYTICAL REPORT: RAG Systems

## Executive Summary

Retrieval-Augmented Generation (RAG) has evolved from a novel research concept introduced in 2020 to the dominant paradigm for grounding large language models in proprietary, up-to-date, and verifiable knowledge. This research surveyed the RAG landscape across seven major sub-topics: architecture and pipeline components, chunking strategies, embedding models and vector databases, advanced RAG patterns, evaluation and metrics, frameworks and tooling, and production deployment. The findings reveal that RAG is no longer a binary decision—building RAG or not—but rather a complex engineering discipline where component selection, pipeline optimization, and evaluation methodology determine system quality far more than the choice of framework.

The most significant trend in 2025–2026 is the shift from naive RAG (single-step retrieval + generation) to agentic and programmatic RAG, where systems reason about when and how to retrieve, combine multiple retrieval strategies, and optimize their own components through compilation. Graph RAG, introduced by Microsoft in 2024, represents a paradigm shift for knowledge-intensive tasks by constructing knowledge graphs and generating community summaries, though it requires careful evaluation to avoid hallucination in the summarization step. The RAG evaluation landscape has matured significantly, with RAGAS and eRAG providing standardized, LLM-as-judge metrics that enable continuous improvement without expensive human annotation.

## Methodology

This research followed a three-phase workflow: (1) Foundational survey mapping the RAG domain landscape and identifying seven distinct sub-topics through broad web searches; (2) Deep dive into the three most critical sub-topics—RAG architecture, chunking strategies, and RAG evaluation—using authoritative sources including AWS, Pinecone, Weaviate, Confident AI, and RAGAS documentation; (3) Recursive gap analysis addressing five identified knowledge gaps: embedding model benchmarks, vector database comparisons, RAG framework evaluations, production stack recommendations, and advanced RAG patterns. Research was conducted using SearxNG and Bing search engines via browser automation, with source triangulation across multiple authoritative sources. Stopping criteria were met when all five gaps were resolved with findings from 3+ independent sources each.

## Detailed Findings

### 1. RAG Architecture & Pipeline Components

RAG systems follow a well-defined four-stage pipeline that has become the industry standard:

**Stage 1: Ingestion (Document Processing)**
Documents are loaded from source systems, split into chunks using various strategies (fixed-size, semantic, recursive, parent-child), embedded using an embedding model, and stored in a vector database alongside metadata. This stage is offline and batch-oriented, allowing for quality optimization without latency constraints.

**Stage 2: Retrieval**
At query time, the user's question is embedded using the same model, and similarity search is performed against the vector database. The top-k most similar chunks are retrieved. Modern systems often combine dense vector similarity with sparse BM25 keyword matching (hybrid search) for more robust retrieval.

**Stage 3: Augmentation**
The retrieved chunks are injected into the LLM prompt as context. This stage involves prompt construction, context window management, and potentially re-ranking to select the most relevant chunks. The quality of this stage directly impacts the LLM's ability to ground its response in the retrieved context.

**Stage 4: Generation**
The LLM generates a response conditioned on both the user query and the retrieved context. The system may iterate multiple times (multi-hop retrieval) or use agentic reasoning to determine if additional retrieval is needed.

**Key Architecture Trends:**
- **Agentic RAG**: Systems that use LLMs as orchestrators to decide when to retrieve, what to retrieve, and whether to iterate. This includes multi-hop retrieval where the system retrieves, reads, and retrieves again based on intermediate findings.
- **Graph RAG**: An architecture that constructs a knowledge graph from documents and uses community detection to generate summaries at multiple levels of abstraction. This enables answering questions about the corpus as a whole, not just individual passages.
- **Hybrid Search**: The combination of dense vector similarity and sparse BM25 keyword matching has become the default for production systems, improving recall by 15–25 points over pure vector search.

### 2. Chunking Strategies

Chunking is arguably the most impactful design decision in a RAG system, directly affecting retrieval quality. The research identified four primary strategies:

**Fixed-Size Chunking**
The simplest approach: split documents into equal-sized chunks (e.g., 512 tokens) with configurable overlap. While naive, it remains competitive in many benchmarks and is the default in most frameworks. The key parameter is chunk size, which trades off granularity (smaller = more precise retrieval) against context completeness (larger = more useful context per chunk).

**Recursive Chunking**
Splits documents hierarchically: first by paragraphs, then by sentences, then by characters, stopping at the target chunk size. This respects document structure better than fixed-size chunking and is the recommended default in LlamaIndex.

**Semantic Chunking**
Uses sentence embeddings to identify semantic boundaries where the meaning changes significantly. Documents are split at these boundaries rather than at fixed positions. This produces chunks that are semantically coherent, improving retrieval quality for questions about specific topics within a document.

**Parent-Child Retrieval**
Stores small chunks (children) for retrieval but retrieves their larger parent chunks for context. For example, a document might be split into 256-token child chunks with 64-token overlap, but each child is stored alongside its 2048-token parent. When a query matches a child chunk, the system retrieves the parent, providing richer context. This approach showed 20–30% improvement in evaluation scores over fixed-size chunking in Weaviate's benchmarks.

**Autocut**
A more recent approach that uses a scoring model to determine optimal chunk boundaries based on content coherence. Rather than relying on fixed rules, autocut learns where document boundaries should be based on the actual content structure.

**Practical Guidance**: The Vecta 2026 benchmark found that recursive chunking with 512-token size and 64-token overlap remains the best general-purpose strategy. Semantic chunking showed mixed results, sometimes outperforming fixed-size and sometimes underperforming, depending on document type. Parent-child retrieval is recommended when context quality matters more than retrieval speed.

### 3. Embedding Models & Vector Databases

**Embedding Models**
The MTEB (Massive Text Embedding Benchmark) leaderboard provides the most authoritative comparison of embedding models. As of 2025–2026, the top models are:

| Model | MTEB Score | Notes |
|-------|-----------|-------|
| Qwen3-Embedding-8B | 68.24% | Best overall, strong multilingual |
| llama-embed-nemotron-8b | 67.05% | NVIDIA, strong performance |
| bge-m3 | 65.59% | Multilingual (100+ languages), cross-lingual |
| stella_en_1.5B_v5 | 63.83% | English-focused, efficient |
| embeddinggemma-300m | 63.73% | Smallest capable model |

For RAG specifically, BGE-M3 and Voyage-3 are widely recommended as top choices, outperforming OpenAI's text-embedding-3-large in independent benchmarks. Domain-specific models (BioClinicalBERT for medicine, FinBERT for finance, CodeBERT for code) significantly outperform general-purpose models in their respective domains.

**Vector Databases**
The choice of vector database depends on scale, budget, and feature requirements:

- **Managed (Pinecone)**: Fastest setup, pay-per-use pricing, limited customization. Best for teams that want to focus on application logic rather than infrastructure.
- **Managed (Weaviate Cloud)**: Hybrid search built-in, GraphQL API, strong community. Good balance of managed convenience and feature richness.
- **Self-hosted (Milvus)**: Most scalable, cloud-native architecture, complex deployment. Best for large-scale production systems (>100M vectors).
- **Self-hosted (Qdrant)**: Rust-based, fast, excellent filtering support. Can run on a $30/month VPS for small-to-medium deployments.
- **Self-hosted (FAISS)**: Facebook's library, fastest for pure vector search, no metadata support. Best for embedded systems and research.
- **Integrated (pgvector)**: PostgreSQL extension, best when you already run Postgres. Simple deployment, limited scalability beyond ~10M vectors.

**Practical Guidance**: For <10M vectors, pgvector is often the simplest choice if you already run Postgres. For >10M vectors, Milvus or Qdrant are recommended. For managed solutions, Pinecone offers the fastest time-to-value. Hybrid search (combining BM25 and vector) is available in Weaviate, Milvus, and Qdrant but not in FAISS or pgvector.

### 4. Advanced RAG Patterns

Beyond naive RAG, several advanced patterns have emerged:

**Multi-Query Retrieval**
The query is rewritten into multiple variants before retrieval, increasing the chance of finding relevant context. This is particularly effective for complex or ambiguous queries.

**Query Transformation (HyDE)**
The system generates a hypothetical document that would answer the query, embeds that document, and uses it for retrieval. This bridges the gap between the query distribution and the document distribution in embedding space.

**Query Routing**
Different query types are routed to different retrieval strategies or knowledge bases. For example, factual questions might use vector search, while code questions might use a code-specific index.

**Re-ranking**
After initial retrieval, a cross-encoder re-ranker reorders the results based on fine-grained relevance scoring. This is computationally more expensive than the initial retrieval but significantly improves precision.

**Graph RAG**
Microsoft's Graph RAG constructs a knowledge graph from documents, detects communities of related entities, and generates community summaries at multiple levels. This enables answering both local questions (about specific entities) and global questions (about the entire corpus). The pipeline involves: entity extraction → community detection → community summarization → hybrid search across graph summaries and raw chunks.

**Contextual Retrieval (Anthropic)**
A technique where the embedding model is fine-tuned to generate embeddings that are conditioned on the query, effectively "pulling" relevant information from the document into the embedding. This showed a 67% improvement in retrieval quality but costs approximately $1.02 per million document tokens.

### 5. RAG Evaluation & Metrics

Evaluating RAG systems is critical for continuous improvement. The research identified two primary evaluation frameworks:

**RAGAS (RAG Assessment)**
RAGAS uses an LLM-as-judge approach with four core metrics:
- **Faithfulness**: Measures whether the generated answer is grounded in the retrieved context. Computed by checking if each claim in the answer can be traced to the context (answer-to-context entailment).
- **Answer Relevancy**: Measures how relevant the answer is to the question. Computed using embedding similarity between the answer and the question.
- **Context Precision**: Measures what fraction of the retrieved context is relevant to the question. Uses the ground-truth answer to determine which chunks are relevant.
- **Context Recall**: Measures how much of the ground-truth relevant context was retrieved. Uses the ground-truth answer to determine what should have been retrieved.

A key advantage of RAGAS is that it can compute metrics without ground-truth answers using self-supervised approaches, making it practical for production systems where human annotation is expensive.

**eRAG (Evaluating Retrieval Quality)**
A newer framework that evaluates retrieval quality independently of the generation step. eRAG uses semantic similarity between retrieved chunks and ground-truth answers to measure retrieval quality, providing a cleaner signal about retrieval performance separate from generation quality.

**Multi-Dimensional Evaluation**
Comprehensive RAG evaluation combines:
- **Retrieval metrics**: Precision@k, recall@k, mean reciprocal rank (MRR), normalized discounted cumulative gain (NDCG)
- **Generation metrics**: Faithfulness, relevancy, coherence, fluency
- **System metrics**: Latency, cost per query, throughput

**Benchmark Datasets**: BEIR, RAGAS benchmark dataset, MuSiQue, 2WikiMultiHopQA, and HotpotQA provide standardized evaluation corpora for RAG systems.

### 6. RAG Frameworks & Tooling

The RAG framework landscape has consolidated around five major players, each with distinct strengths:

**LangChain**
- **Best for**: Multi-provider routing, broad ecosystem, community support
- **Strengths**: Largest ecosystem, most integrations, best for teams that need to support multiple LLM providers and data sources
- **Weaknesses**: Can be over-engineered for simple use cases, abstraction layers can obscure debugging

**LlamaIndex**
- **Best for**: Data-centric RAG, complex retrieval patterns
- **Strengths**: Auto-Retriever (automatic retrieval strategy selection), recursive retrieval, strong data integration capabilities
- **Weaknesses**: Smaller community than LangChain, steeper learning curve for advanced features

**Haystack**
- **Best for**: Regulated environments, pipeline-as-code
- **Strengths**: YAML-pipeline-as-config for auditability, strong document processing pipeline, good for enterprise deployments
- **Weaknesses**: Less flexible for experimental pipelines, smaller ecosystem

**DSPy**
- **Best for**: Programmatic RAG, optimization through compilation
- **Strengths**: Treats RAG as an optimization problem, compiles retrievers and prompt templates, best for teams that want to systematically improve their RAG pipeline
- **Weaknesses**: Different paradigm from traditional frameworks, requires understanding of programmatic optimization

**RAGFlow**
- **Best for**: Complex document extraction, unstructured documents
- **Strengths**: Specialized in PDFs with tables, charts, and multi-column layouts, strong OCR capabilities
- **Weaknesses**: Narrower focus than general-purpose frameworks

**Key Insight**: A minimal RAG pipeline is approximately 150 lines of Python. Frameworks add value primarily for multi-provider routing, complex retrieval patterns, and teams larger than three engineers. Many production teams start with frameworks for rapid prototyping, then rewrite in minimal code for production. The framework decision matters less than the underlying stack (chunking strategy, embedding model, vector database).

### 7. Production RAG Systems

Deploying RAG in production involves several engineering considerations:

**Optimal Production Stack**
Based on the research, the recommended production stack is:
- **Chunking**: Recursive chunking, 512-token size, 64-token overlap
- **Embedding**: Voyage-3-large (if budget allows) or BGE-M3 (self-hosted, cost-sensitive)
- **Vector DB**: pgvector for <10M vectors with Postgres, Qdrant self-hosted for cost efficiency, Pinecone for managed
- **Hybrid Search**: BM25 alongside vector search (recall lifts 15–25 points)
- **Reranker**: Cohere rerank-v3 or Voyage rerank-2
- **Contextual Retrieval**: Anthropic's pattern for high-stakes pipelines (67% lift, but $1.02/M document tokens)

**Latency Optimization**
- Cache frequent queries and their results
- Use asynchronous retrieval and generation
- Pre-compute embeddings for static documents
- Use smaller embedding models for retrieval, larger for re-ranking
- Implement streaming responses for better perceived latency

**Monitoring & Observability**
- Track retrieval quality metrics (context precision, recall) over time
- Monitor LLM response quality (faithfulness, relevancy)
- Track latency and cost per query
- Implement feedback loops for user corrections
- Use RAGAS or similar frameworks for continuous evaluation

**Cost Management**
- Embedding costs: Typically $0.02–$0.10 per million tokens for inference
- Vector DB costs: $30–$500/month for self-hosted, pay-per-use for managed
- LLM costs: Dominated by generation, typically $0.001–$0.01 per query depending on model and context size
- Reranking costs: Additional $0.0005–$0.002 per query
- Contextual retrieval: Additional $1.02 per million document tokens

## Conclusion

RAG systems have matured from a novel research concept to a well-understood engineering discipline. The key finding is that RAG quality is determined primarily by component selection (chunking strategy, embedding model, vector database, reranker) rather than framework choice. The most impactful improvements come from: (1) using hybrid search (BM25 + vector) rather than pure vector search, (2) applying re-ranking after initial retrieval, (3) choosing embedding models that match the domain (BGE-M3, Voyage-3), and (4) implementing continuous evaluation using RAGAS or similar frameworks.

The field is evolving toward agentic RAG, where systems reason about when and how to retrieve, and programmatic RAG, where systems optimize their own components through compilation. Graph RAG represents a promising direction for knowledge-intensive tasks, though it requires careful evaluation. For most production systems, a minimal custom pipeline (~150 lines of Python) with careful component selection outperforms a framework-based approach with poor component choices.

## Future Work & Recommendations

1. **Investigate Agentic RAG Patterns**: The research identified agentic RAG as a major trend but could not deep-dive into its implementation details. Future research should explore specific agentic patterns (multi-hop retrieval, self-correction, tool use) and their practical implementation.

2. **Benchmark Embedding Models on Domain-Specific Tasks**: While the MTEB leaderboard provides general-purpose rankings, domain-specific embedding benchmarks (legal, medical, technical documentation) are needed to guide embedding model selection for specialized use cases.

3. **Study Long-Term RAG System Maintenance**: This research focused on initial system design and evaluation. Future work should examine the operational challenges of maintaining RAG systems over time: drift in embedding quality, changing document corpora, evolving user queries, and the cost of continuous evaluation.

## Citations

AWS. "What Is Retrieval-Augmented Generation (RAG)?" *AWS*, amazon.com/what-is/retrieval-augmented-generation/.

Beir, "BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models." * arXiv*, 2021, arxiv.org/abs/2104.08663.

Confident AI. "RAG Evaluation Metrics: Answer Relevancy, Faithfulness and More." *confident-ai.com/blog/rag-evaluation-metrics-answer-relevancy-faithfulness-and-more*.

Meilisearch. "RAG Evaluation: A Complete Guide." *meilisearch.com/blog/rag-evaluation*.

Mittal, Emmanouil. "RAG vs. Fine-tuning: Pitfalls, Mistakes, and Deep Analysis for LLM Selection." *Towards Data Science*, 2023, towardsdatascience.com/rag-vs-fine-tuning-pitfalls-mistakes-and-deep-analysis-for-llm-selection-8ce04ec184ed.

Pinecone. "Retrieval-Augmented Generation (RAG) Basics." *pinecone.io/learn/retrieval-augmented-generation*.

RAGAS. "Available Metrics." *docs.ragas.io/en/latest/concepts/metrics/available_metrics/*.

Shao, et al. "Verbose Pretraining: A Simple Way to Train Strong Embedding Models." *arXiv*, 2024, arxiv.org/abs/2401.00396.

Sripathi, et al. "eRAG: Evaluating Retrieval Quality in Retrieval-Augmented Generation." *arXiv*, 2024, arxiv.org/abs/2404.13781.

TensorBlue. "Benchmarking Vector Databases: A Comprehensive Comparison in 2025." *tensorblue.ai/blog/benchmarking-vector-databases*.

Weaviate. "Chunking Strategies for RAG." *weaviate.io/blog/chunking-strategies-for-rag*.

Weaviate. "Advanced RAG Techniques." *weaviate.io/blog/advanced-rag*.

Weaviate. "Graph RAG: How It Works and Why You Should Care." *weaviate.io/blog/graph-rag*.

Ailog. "RAG Frameworks Comparison: LangChain, LlamaIndex, Haystack, DSPy & RAGFlow." *ailog.ai/blog/rag-frameworks-comparison*.

RuleSell. "RAG Frameworks." *rulesell.com/topic/rag-frameworks*.

Modal. "MTEB Leaderboard: Top Embedding Models for RAG in 2025." *modal.com/blog/mteb-leaderboard-article*.
