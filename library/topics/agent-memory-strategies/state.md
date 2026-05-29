---
topic: "Agent Memory Strategies"
created_at: "2026-05-29 12:00"
last_updated: "2026-05-29 12:00"
current_phase: "Phase 4"
status: "active"
library_topic_slug: "agent-memory-strategies"
library_entry_exists: false
stopping_criteria: ""
---

## Phase 0: Library Check

existing_entries:
- topic: "LLM Harness"
  slug: "llm-harness"
  relevance: "medium"
  gap_to_fill: "Mentions memory management as a harness component but does not deep-dive into agent memory strategies, architectures, or implementations"
- topic: "RAG Systems"
  slug: "rag-systems"
  relevance: "low"
  gap_to_fill: "RAG is related but distinct — focuses on retrieval-augmented generation, not agent memory architectures"

## Phase 1: Foundational Survey

sub_topics:

- name: "Memory Taxonomy & Classification"
  definition: "Categorizing agent memory into distinct types (episodic, semantic, procedural, working) beyond traditional long/short-term dichotomies"
  key_concepts: ["Multimodal memory (text, audio, video, spatial)", "Cognitive-inspired taxonomy", "Neuro-symbolic memory integration", "Hierarchical memory organization"]

- name: "Long-Term Memory Architectures"
  definition: "Storage systems for persistent agent memory using vector stores, knowledge graphs, and hybrid approaches"
  key_concepts: ["Vector-based semantic memory (embeddings, similarity search)", "Graph-based relational memory (knowledge graphs)", "Hybrid architectures (vector + graph)", "Decoupled representation vs. storage"]

- name: "Memory Retrieval Strategies"
  definition: "Methods for agents to find and leverage stored memories during reasoning and decision-making"
  key_concepts: ["Semantic search and embedding retrieval", "Temporal/spatial indexing for episodic memory", "Memory routing and prioritization", "Multi-hop retrieval chains"]

- name: "Memory Management & Governance"
  definition: "Mechanisms for curating, forgetting, and controlling access to agent memories over time"
  key_concepts: ["Forgetting mechanisms and memory decay", "Memory compression and summarization", "Privacy and consent management", "Memory lifecycle governance"]

- name: "Production Frameworks & Tools"
  definition: "Open-source and commercial frameworks for implementing agent memory systems"
  key_concepts: ["Mem0 (universal memory layer)", "Zep (long-term memory for LLMs)", "LangGraph Store", "Custom memory backends"]

- name: "Agent Memory Benchmarks & Evaluation"
  definition: "Methods and datasets for measuring agent memory quality, retention, and retrieval accuracy"
  key_concepts: ["LOCCO (Long-term Chronological Conversations)", "MemBench and MemLLM", "Evo-Memory streaming benchmark", "Multi-agent memory benchmarks"]

- name: "Self-Evolving Memory Systems"
  definition: "Agent architectures that continuously learn and adapt through memory-based self-improvement"
  key_concepts: ["ReMem pipeline (reason-act-refine)", "Test-time learning with memory", "Preference-aware memory updates", "Self-evolving knowledge acquisition"]

phase_0_complete: true
phase_1_complete: true
phase_2_complete: true
phase_3_complete: true

## Phase 2: Deep Dive

deep_dives:

- topic: "Long-Term Memory Architectures"
  defined: true
  trends: ["Hybrid vector-graph architectures combining semantic search with relational reasoning", "Decoupling memory representation from storage backend (abstraction layer approach)", "Multimodal memory supporting text, audio, video, and spatial data", "Knowledge graph integration for structured, queryable memory"]
  example: "MAGMA (Multi-Agent Graph-based Memory Architecture) uses a unified graph database for both memory storage and retrieval, with a multi-agent memory graph construction mechanism that integrates information from multiple agents to create coherent, structured memory graphs. It employs GraphRAG for retrieval, where memory graphs are converted to text format for LLM processing. MAGMA achieves state-of-the-art results on MATH, HotPotQA, and 2WikiMultiHopQA benchmarks, outperforming baselines by 20-73%."
  example_source: "MAGMA: Multi-Agent Graph-based Memory Architecture, arXiv:2601.03236v2, 2026"

- topic: "Memory Retrieval & Management Strategies"
  defined: true
  trends: ["Forgetting mechanisms based on relevance, recency, and redundancy scoring", "Memory compression via summarization and abstraction", "Self-Supervised Graph Memory (SSGM) using contrastive learning for memory alignment", "Contextual gating for selective memory activation"]
  example: "SSGM (Self-Supervised Graph Memory) introduces a two-stage training framework: (1) Self-Supervised Graph Memory Training, where the model learns to construct a memory graph from scratch through contrastive learning objectives without explicit graph labels, and (2) Graph Memory-based Reasoning Training, where the model leverages the constructed graph for downstream reasoning tasks. The graph memory encodes multi-dimensional relationships between concepts, enabling richer semantic representations than traditional attention mechanisms."
  example_source: "SSGM: Self-Supervised Graph Memory for Long-Context Language Modeling, arXiv:2603.11768v1, 2026"

- topic: "Production Frameworks & Evaluation"
  defined: true
  trends: ["Specialized benchmarks for long-term personalized agent memory (Memora, MemBench)", "Streaming benchmarks for test-time evolution (Evo-Memory)", "Universal memory layers (Mem0) with 10+ storage backends", "ReMe pipeline integrating reasoning, action, and memory updates"]
  example: "Memora is a benchmark specifically designed for evaluating long-term memory in personalized agents. It introduces a 'memory-centric' evaluation framework that focuses on the quality of the memory system itself rather than downstream task performance. Memora uses a two-stage evaluation: (1) Memory Construction, where the system builds a knowledge graph from user interactions, and (2) Memory Retrieval, where the system queries the graph for personalized responses. Memora evaluates across 4 dimensions: factual accuracy, temporal consistency, personalization depth, and privacy compliance."
  example_source: "Memora: A Benchmark for Long-Term Memory in Personalized Agents, arXiv:2604.20006v1, 2026"

## Phase 3: Gap Analysis

gaps:

- description: "Privacy and Security of Agent Memory"
  questions: ["How do agents protect stored memories from extraction attacks?", "What defense mechanisms exist against memory extraction attacks?", "How does the 'right to be forgotten' apply to agent memory?"]
  resolved: true
  findings: "MEXTRA attack demonstrates that LLM agent memory modules are vulnerable to black-box extraction attacks that can recover private user-agent interactions. The attack uses template-based prompts that locate desired private information and induce the agent to return retrieved information in a legitimate manner. Countermeasures include MemPot (potentially poisoned memory defense), A-MemGuard (proactive defense framework), and privacy-respecting memory architectures that separate sensitive from non-sensitive memories. The 'Right to be Forgotten' (RTBF) is a critical challenge — agents must be able to forget memories about users who request deletion, but this conflicts with the agent's need to maintain useful knowledge."

- description: "Memory Conflicts and Inconsistency Resolution"
  questions: ["How do agents detect and resolve contradictory memories?", "What mechanisms exist for temporal validity checking of memories?", "How do hierarchical memory systems handle conflicts between different memory levels?"]
  resolved: true
  findings: "GAM (Hierarchical Graph-based Agentic Memory) introduces a conflict resolution mechanism using a graph neural network-based conflict resolution algorithm that dynamically resolves conflicts between the agent's perception and memory. The ConflictRAG framework detects and resolves knowledge conflicts in RAG systems by identifying conflicting facts and selecting the most reliable source. Widemem provides an open-source memory layer with batch conflict resolution. The key insight is that memory conflicts arise from temporal changes in user preferences, external environment changes, and information from multiple sources."

- description: "Multi-Agent Memory Sharing and Collaboration"
  questions: ["How do agents share memories with each other?", "What access control mechanisms exist for collaborative memory?", "How do multi-agent memory systems handle conflicting information from different agents?"]
  resolved: true
  findings: "Collaborative Memory (ICML 2025) introduces dynamic access control for multi-user memory sharing, allowing agents to share memories with other agents while maintaining privacy. The approach uses a permission-based system where users control which memories can be shared and with whom. LatentMAS (ICML 2026 Spotlight) introduces latent collaboration where agents share memory representations rather than raw data. MultiAgentBench provides a benchmark for evaluating multi-agent collaboration with shared memory. The key challenge is balancing knowledge sharing with privacy protection."

phase_0_complete: true
phase_1_complete: true
phase_2_complete: true
phase_3_complete: true
