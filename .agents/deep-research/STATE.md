---
topic: "Compacting Sessions for LLM Agents"
created_at: "2026-05-24 15:00"
last_updated: "2026-05-24 15:00"
current_phase: "Complete"
status: "completed"
library_topic_slug: "compacting-sessions-for-llm-agents"
library_entry_exists: true
stopping_criteria: "Phase 3 complete. All gaps addressed. Self-critique determines next step yields only minor, redundant detail (incremental vs. breakthrough knowledge)."
---

## Phase 0: Library Check

existing_entries:
- topic: "pi.dev (Pi Coding Agent)"
  slug: "pi-dev"
  relevance: "medium"
  gap_to_fill: "Pi's compaction is mentioned at a surface level (summarizing older content, customizable via extensions) but no deep analysis of compaction strategies, tradeoffs, or the broader field exists"
- topic: "Wiki-Style RAG Systems"
  slug: "wiki-style-rag-systems"
  relevance: "low"
  gap_to_fill: "Different topic - token cost analysis is tangentially relevant"

## Phase 1: Foundational Survey

sub_topics:

- name: "Summarization-Based Compaction"
  definition: "The most widely deployed compaction approach, where an LLM rewrites conversation history into organized sections (completed work, current state, pending tasks), replacing raw history with a structured narrative."
  key_concepts: ["Rolling summary", "Hierarchical summarization", "Map-reduce summarization", "Structured vs. freeform summaries"]

- name: "Structural & Extractive Compression"
  definition: "Zero- or near-zero-cost techniques that reduce token count through engineering discipline rather than model calls, including deduplication, token pruning (LLMLingua), observation masking, and canonicalization."
  key_concepts: ["Tool result deduplication", "LLMLingua token pruning", "Observation masking", "Error purging", "Canonicalization"]

- name: "External Memory & Episodic Retrieval"
  definition: "Approaches where the agent continuously writes important facts, decisions, and state into an external memory store (vector DB, knowledge graph, file system) and retrieves relevant segments on demand, mirroring OS virtual memory architecture."
  key_concepts: ["MemGPT/Letta architecture", "Vector database retrieval", "Knowledge graphs (Cognee)", "Archival memory", "Cross-session continuity"]

- name: "Hybrid Approaches (Keep Edges, Summarize Middle)"
  definition: "The production standard pattern: keep system prompt and recent N turns verbatim, replace all prior history with a compact summary — used by Claude Code, Google ADK, and Microsoft Agent Framework."
  key_concepts: ["Edge preservation", "Middle summarization", "Cache breakpoint placement", "Compaction blocks"]

- name: "Compaction Chains & Evaluation"
  definition: "The compounding error problem when agents undergo dozens of compaction cycles over days, and the challenge of benchmarking compaction quality beyond single-session factual recall."
  key_concepts: ["Compaction chain degradation", "Artifact tracking", "Context poisoning", "LoCoMo benchmark", "Factory.ai probe framework"]

- name: "Prompt Caching Interactions"
  definition: "The fundamental tension between compaction and prompt caching — compaction is a hard semantic break that invalidates all prior cached prefixes, requiring careful cache breakpoint placement."
  key_concepts: ["Cache invalidation", "System prompt prefix stability", "Cache breakpoint placement", "TTL management"]

- name: "Selective Eviction & Token Budgeting"
  definition: "Rather than summarizing, selective eviction identifies which tokens or message blocks to drop entirely — using LRU, importance-scoring, or KV cache-level eviction strategies."
  key_concepts: ["LRU eviction", "Heavy hitter heuristic", "KV cache eviction", "Attention-weighted pruning", "Ada-KV"]

## Phase 2: Deep Dive

deep_dives:

- topic: "Summarization-Based Compaction"
  defined: true
  trends:
    - "Structured summaries (organized sections: completed work, current state, pending tasks) outperform freeform narratives — Factory.ai scored 3.70/5 for structured vs. 3.35/5 for opaque (OpenAI) vs. 2.19-2.45/5 for generic summarization on artifact tracking"
    - "Anthropic's compact_20260112 API and Claude Code auto-compact use server-side summarization at ~98% context threshold; the pause_after_compaction: true flag lets integrators inject verbatim context before continuing"
    - "LLMlingua-2 achieves up to 20× token reduction with extractive token pruning (BERT-sized encoder via GPT-4 distillation), 3-6× faster than generative summarization, end-to-end latency improvements of 1.6-2.9×"
  example: "Factory.ai's evaluation of 36,611 production software engineering messages: structured summarizer scored 3.70/5 overall, while all three tested methods (Factory, Anthropic, OpenAI) scored only 2.19-2.45/5 on artifact tracking (which files were modified). After a 178-message debugging session, Anthropic's compaction remembered '401 error on the authentication endpoint' while Factory's structured compaction remembered '/api/auth/login endpoint… stale Redis connection.'"
  example_source: "https://www.morphllm.com/context-compression, https://zylos.ai/en/research/2026-04-21-agent-context-compaction-long-running-sessions"

- topic: "External Memory & Episodic Retrieval"
  defined: true
  trends:
    - "MemGPT/Letta architecture inspired by OS virtual memory: LLM context window as 'fast main memory,' external store as 'disk,' with agent using tool calls to move information in and out of active context"
    - "Cognee extends with knowledge graph layer: entity extraction (subject-relation-object triplets), graph traversal for 14 retrieval modes, processing over one million pipelines per month in production"
    - "Position paper 'Episodic Memory is the Missing Piece for Long-Term LLM Agents' argues single-shot learning property of past events with temporal/spatial context is precisely what current agents lack, and RAG-over-turns is closest practical approximation"
  example: "Letta's archival memory layer uses a heartbeat/request_heartbeat control-flow mechanism to ensure tool chains keep running long enough for writes to happen. Cognee reports processing over one million pipelines per month in production with its knowledge graph approach, combining vector similarity (entry nodes) with graph traversal (structured context) for 14 different retrieval modes."
  example_source: "https://zylos.ai/en/research/2026-04-21-agent-context-compaction-long-running-sessions"

- topic: "Compaction Chains & Evaluation"
  defined: true
  trends:
    - "Compaction chain degradation is the compounding error problem: each summary is itself summarized in the next compaction cycle, progressively smoothing out specifics — not captured by single-session benchmarks"
    - "Factory.ai's probe-based evaluation framework (6 dimensions: accuracy, context awareness, artifact trail, completeness, continuity, instruction following, scored 0-5 via GPT-5.2 LLM judge) found compression ratio is a misleading primary metric"
    - "ACON's ablations show naive summarization baselines lost 10-15 percentage points of accuracy on AppWorld vs. no-compression upper bounds; ACON recovered to within 1-2% via failure-driven guideline optimization"
  example: "ACON (Microsoft/KAIST, arxiv:2510.00615) reduces memory usage by 26-54% (peak tokens) while largely preserving task performance on AppWorld, OfficeBench, and Multi-objective QA. Distilled compressors preserved 95%+ of teacher accuracy. Small LMs improved by 32% on AppWorld, 20% on OfficeBench, and 46% on Multi-objective QA via Acon-guided compression."
  example_source: "https://arxiv.org/html/2510.00615v2"

## Phase 3: Gap Analysis

gaps:

- description: "KV cache-level compression and eviction (operating inside inference, not at the API level) is underexplored compared to summarization. KVTC (accepted at ICLR 2026) and Ada-KV represent a fundamentally different approach but lack production evaluations."
  questions:
    - "What are the practical tradeoffs of KV cache eviction vs. API-level summarization for long-running agent sessions?"
    - "How does KVTC's PCA-based compression compare to generative summarization in terms of information preservation?"
  resolved: true
  findings: "KVTC (KV Cache Transform Coding, ICLR 2026) applies classical media compression (PCA decorrelation, adaptive quantization, entropy coding) to compress KV caches by ~20×. It operates at the inference engine level, not the API level — fundamentally different from summarization. PRISM (Chungnam National University, arxiv:2603.21576) takes this further with O(1) photonic block selection, achieving 100% accuracy from 4K-64K tokens at k=32 with 16× traffic reduction. The key insight: attention heads split into retrieval heads (attend to distant tokens) and streaming heads (attend to nearby tokens), with ~25-50% classified as retrieval heads. NVIDIA's Vera Rubin architecture dedicates an entire DPU (ICMS) to KV cache management with flash-backed storage — confirming that KV cache management is now a first-class system design problem. Tradeoffs: KV compression operates inside the GPU, reducing memory footprint without API round trips, but operates at the token level rather than the semantic level — it preserves information at the mathematical level but cannot make semantic decisions about what to keep or discard, unlike summarization."

- description: "The Context Codec paper (arxiv:2605.17304) introduces a formal, commitment-level framework for verifiable compression — separating semantic commitments from raw tokens — but this approach is nascent with only a small diagnostic study."
  questions:
    - "How does the Context Codec's 'semantic atom' approach compare to structured summarization in preserving critical agent state?"
    - "What is the practical adoption status of CCL (Context Compression Language) for production systems?"
  resolved: true
  findings: "Context Codec (Trukhina & Vashkelis, arxiv:2605.17304, May 2026) represents dialogue state as typed, source-grounded semantic atoms with canonical identity, equivalence, conflict, confidence, risk, and evidence spans. It separates five concerns — extraction, normalization, representation, rendering, and verification — and introduces metrics for Critical Atom Recall, Weighted Atom Recall, Commitment Density, and round-trip recoverability. CCL (Context Compression Language) is an ASCII-first compact rendering of canonical JSON atoms. In a diagnostic study, CCL-Core occupies a useful middle ground between structured prose and JSON: more explicit and auditable than prose, usually more compact than JSON, and less risky than heavily minified notation. The framework is nascent — only a small diagnostic study exists, no production deployments found. It represents a fundamentally different philosophy: instead of compressing tokens, compress commitments. A semantic commitment is any proposition, constraint, decision, preference, state variable, or safety boundary that can change the correctness of a future response."

- description: "Prompt caching and compaction have fundamental tension (compaction invalidates cached prefixes), but the interaction with different providers' caching strategies (Anthropic 5-min TTL vs. 1-hour extended cache vs. Google's cache) is underexplored."
  questions:
    - "How do different providers' prompt caching strategies interact with compaction, and what are the optimal cache breakpoint placements?"
    - "What are the cost implications of compaction-induced cache invalidation across Anthropic, Google, and OpenAI?"
  resolved: true
  findings: "The interaction is well-documented in production. Anthropic's architecture: stable system prompt prefix + cache_control: { type: 'ephemeral' } breakpoint at end of system prompt → compaction block with its own cache_control marker → new turns appended. On subsequent turns, both system prompt and compaction summary are served from cache; only new turns are billed as fresh input. Anthropic's compact_20260112 API natively places a cache_control marker on the compaction block. Cost math: caching alone saves 85% (Claude Sonnet 4.6: $0.72 → $0.11/turn for 12K prefix). Caching + compaction saves 90%+ total. A 20-turn coding agent with 12K stable prefix + 40K dynamic history: caching alone = $0.1236/turn; caching + compaction (60% reduction) = $0.0516/turn — 58% cheaper than caching alone. Critical edge case: a Claude Code bug (v2.1.62) increased KV cache hit rates without adding a compaction-event cache invalidation trigger, causing stale pre-compaction prefixes to be served into post-compaction contexts. OpenAI's automatic prefix caching has no write premium — cached tokens simply cost less (90% discount on GPT-5.4). Google's explicit caching charges storage ($1-4.50/MTok/hr) in addition to read discounts."

phase_3_complete: false

- description: "The Context Codec paper (arxiv:2605.17304) introduces a formal, commitment-level framework for verifiable compression — separating semantic commitments from raw tokens — but this approach is nascent with only a small diagnostic study."
  questions:
    - "How does the Context Codec's 'semantic atom' approach compare to structured summarization in preserving critical agent state?"
    - "What is the practical adoption status of CCL (Context Compression Language) for production systems?"
  resolved: false
  findings: ""

- description: "Prompt caching and compaction have fundamental tension (compaction invalidates cached prefixes), but the interaction with different providers' caching strategies (Anthropic 5-min TTL vs. 1-hour extended cache vs. Google's cache) is underexplored."
  questions:
    - "How do different providers' prompt caching strategies interact with compaction, and what are the optimal cache breakpoint placements?"
    - "What are the cost implications of compaction-induced cache invalidation across Anthropic, Google, and OpenAI?"
  resolved: false
  findings: ""

phase_0_complete: true
phase_1_complete: true
phase_2_complete: true
phase_3_complete: true
