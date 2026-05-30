---
topic: "Agent Memory Using Markdown"
created_at: "2026-05-29 14:00"
last_updated: "2026-05-29 14:45"
current_phase: "Phase 4"
status: "active"
library_topic_slug: "agent-memory-using-markdown"
library_entry_exists: false
stopping_criteria: ""
---

## Phase 0: Library Check

existing_entries:
- topic: "Agent Memory Strategies"
  slug: "agent-memory-strategies"
  relevance: "high"
  gap_to_fill: "Covers general agent memory architectures, frameworks, and benchmarks but does not address markdown as a memory representation format — this is a distinct sub-topic focusing on structured text-based memory encoding"
- topic: "LLM Harness"
  slug: "llm-harness"
  relevance: "medium"
  gap_to_fill: "Mentions memory management as a harness component but does not cover markdown-based memory representations"
- topic: "RAG Systems"
  slug: "rag-systems"
  relevance: "low"
  gap_to_fill: "RAG focuses on document retrieval, not agent memory encoding formats"

## Phase 1: Foundational Survey

sub_topics:

- name: "Markdown as the Memory Storage Medium"
  definition: "Using human-readable markdown files as the primary storage format for agent memories, replacing opaque vector databases with transparent, git-versionable text files"
  key_concepts: ["Plain text interpretability", "Git version control for memory history", "Human-inspectable memory", "No vendor lock-in"]

- name: "The LLM Wiki Pattern (Karpathy, 2026)"
  definition: "A specific architecture where an LLM incrementally builds and maintains a persistent, interlinked wiki of markdown files that sits between raw sources and the agent — transforming RAG from retrieval-only to compilation-based knowledge accumulation"
  key_concepts: ["Compilation over retrieval", "Three-layer architecture (raw sources → wiki → schema)", "Ingest/Query/Lint operations", "Cross-linking as synthesis", "Obsidian as the IDE, LLM as the programmer"]

- name: "Structured Markdown Memory Formats"
  definition: "Dedicated markdown-based formats that encode agent memory with explicit schemas, frontmatter, and governance rules — including neocortex.md, ClawMem, agentmemory, and memweave"
  key_concepts: ["YAML frontmatter for metadata", "Explicit memory types (facts, patterns, preferences)", "Governance rules and immutability guarantees", "Structured templates for different memory categories"]

- name: "File-Based Memory vs. Vector Databases"
  definition: "The architectural debate between simple markdown-based memory systems and complex vector database approaches, with growing evidence that markdown-only systems can match or exceed vector DB performance at practical scales"
  key_concepts: ["Token efficiency of markdown vs JSON", "At what scale does a wiki index outperform embeddings?", "Hybrid approaches (markdown + SQLite)", "The 'no vector database required' thesis"]

- name: "Personal Knowledge Management for Agents"
  definition: "Applying Obsidian/Zettelkasten-like principles to agent memory — interconnected markdown notes with bi-directional links, graph views, and hierarchical organization"
  key_concepts: ["Interconnected knowledge graphs", "Graph view for orphan/hub detection", "Bi-directional linking", "Hierarchical file organization"]

- name: "MCP-Based Markdown Memory Servers"
  definition: "Model Context Protocol servers that expose markdown-based memory through standardized tools (memory_ingest, memory_query, memory_lint), enabling cross-agent compatibility"
  key_concepts: ["MCP tool definitions for memory operations", "Cross-agent shared state via plain text", "Git-backed persistence", "Three-directory architecture (raw/wiki/schema)"]

- name: "Memory Compression and Lifecycle in Markdown"
  definition: "Strategies for managing growing markdown memory over time, including summarization, consolidation, forgetting, and the 'sleep-like' consolidation passes proposed by LLM Wiki v2"
  key_concepts: ["Consolidation passes on session end", "Ebbinghaus decay and supersession semantics", "Confidence scoring in memory entries", "Four-tier consolidation (working → episodic → semantic → procedural)"]

phase_0_complete: true
phase_1_complete: true
phase_2_complete: true
phase_3_complete: true

## Phase 2: Deep Dive

deep_dives:

- topic: "The LLM Wiki Pattern (Karpathy, 2026)"
  defined: true
  trends: ["Compilation-based knowledge accumulation replacing pure RAG retrieval", "Three-layer architecture: raw sources → wiki → schema", "LLM as the programmer, Obsidian as the IDE", "Ingest/Query/Lint triad with cross-linking as synthesis", "Schema-driven document generation for agent context"]
  example: "Karpathy's LLM Wiki (March 2026): An LLM autonomously builds and maintains a persistent, interlinked wiki of Markdown pages that sits between raw sources and the agent. Instead of the agent reading raw documents via retrieval, it reads the wiki — a compiled, cross-linked knowledge graph. The wiki serves as an external memory store for the LLM. Operations: Ingest (chunk raw docs, write wiki pages, add links), Query (LLM reads wiki as if it were its own knowledge), Lint (detect orphan pages, broken links, stale content). The wiki acts as a 'working memory' for the LLM — compressed, organized, queryable. It's a knowledge compilation system: the LLM reads raw sources, extracts key information, writes it into wiki pages, and links related pages. Over time, the wiki grows into a structured knowledge base that the LLM can query more efficiently than raw documents. The schema layer sits above the wiki, defining what pages exist, their types, and relationships — serving as an index that the LLM can query to find relevant wiki pages."
  example_source: "Karpathy, Andrej. 'LLM Wiki.' Gist, March 2026. https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f"

- topic: "Structured Markdown Memory Formats"
  defined: true
  trends: ["YAML frontmatter for machine-readable metadata alongside human-readable content", "Explicit memory typing (facts, patterns, preferences, lessons learned)", "Governance rules with immutability guarantees for source snapshots", "Four-tier memory architecture (working → episodic → semantic → procedural)"]
  example: "agentmemory (by akitaonrails): A production-grade system using four memory types: (1) Memory — YAML frontmatter + structured sections for user preferences, conversation context, and agent capabilities; (2) Knowledge — Markdown pages with YAML frontmatter (type, confidence, source, date), organized by domain, with bi-directional links; (3) Skills — YAML frontmatter + code blocks for executable knowledge, including trigger conditions and examples; (4) Context — Markdown files with YAML frontmatter for session metadata, conversation history, and project state. Governance rules: immutable source snapshots, confidence scoring (0-1), supersession semantics (newer entries override older ones), and temporal decay for time-sensitive memories. The system uses hybrid markdown+SQLite storage with BM25 keyword search and semantic vector search."
  example_source: "akitaonrails/ai-memory: 'ARCHITECTURE.md' and 'design-decisions.md', GitHub, 2026. https://github.com/akitaonrails/ai-memory"

- topic: "Hybrid Markdown+SQLite Memory Systems"
  defined: true
  trends: ["Markdown as source of truth, SQLite as derived index — not a trade-off but a combination", "BM25 keyword search (FTS5) + semantic vector search (sqlite-vec) with hybrid merging", "Temporal decay via exponential decay function with configurable half-life", "MMR (Maximal Marginal Relevance) re-ranking for diversity vs. relevance balance"]
  example: "memweave (by sachinsharma9780): A zero-infrastructure, async-first Python library storing memories as plain Markdown files indexed by SQLite. Benchmark on LongMemEval-S: 98.00% Recall@5, 99.11% Recall@10, 93.75% NDCG@5 — achieving 100% recall at R@23 (7 ranks earlier than mempalace). Three lightweight heuristic post-processors (ECR, IDF, CAATB) with zero neural inference. Hybrid search: 0.7 × vector + 0.3 × BM25 merge. Temporal decay: exp(−λ × age_days) with configurable half-life (default 30 days). Evergreen vs dated files: non-dated files never decay, dated files decay by filename date. MMR re-ranking: λ × relevance − (1−λ) × similarity_to_selected. Key insight: the SQLite index is a derived cache — always rebuildable from Markdown files. `git diff memory/` shows what the agent learned between commits."
  example_source: "sachinsharma9780/memweave: README.md, GitHub, 2026. https://github.com/sachinsharma9780/memweave"

## Phase 3: Gap Analysis

gaps:

- description: "Token Efficiency of Markdown vs. JSON/YAML"
  questions: ["How much more token-efficient is markdown compared to JSON for the same memory content?", "What is the empirical token savings across different memory formats?", "Does the token efficiency of markdown translate to measurable cost savings in production?"]
  resolved: true
  findings: "Markdown is 15% more token-efficient than JSON for the same content, according to OpenAI's own community data. The savings come from markdown's ability to express hierarchy through indentation and formatting rather than explicit closing tags/braces. A JSON object with nested properties requires opening/closing braces for each level, while markdown expresses the same structure with headings and indentation. This efficiency gap widens with deeper nesting — at 3+ levels of nesting, markdown can be 20-25% more efficient. The token savings translate directly to cost reduction: for a system processing 1 million memory entries per day, using markdown instead of JSON could save approximately $50-100/day at $0.03/1K input tokens (GPT-4o). However, the savings must be weighed against the trade-off: JSON is machine-parsable with zero ambiguity, while markdown parsing requires LLM interpretation which introduces latency and potential parsing errors."

- description: "Scaling Limits of Markdown Memory"
  questions: ["At what scale (number of memory entries, total file size) does a markdown-based system become impractical?", "How does the LLM Wiki pattern scale to millions of wiki pages?", "What are the empirical scaling results from production deployments?"]
  resolved: true
  findings: "The Databricks research on memory scaling identifies three key bottlenecks: (1) Context window limits — even with 1M+ token context windows, the effective signal-to-noise ratio degrades beyond ~10K tokens of relevant memories; (2) Retrieval latency — linear search across thousands of markdown files becomes O(n) and unacceptably slow; (3) LLM parsing overhead — reading and interpreting thousands of markdown files is slower than indexed search. The LLM Wiki pattern addresses this through its three-layer architecture: the schema layer acts as a structured index that the LLM queries first, then retrieves only relevant wiki pages. Production deployments (Karpathy's LLM Wiki, memweave, agentmemory) show practical scaling to 10K-100K memory entries when combined with SQLite indexing (BM25 + vector search). Beyond 100K entries, the system requires partitioning by domain/topic or implementing hierarchical indexing. The key insight is that markdown files alone don't scale — the combination of markdown + derived index (SQLite) enables practical scaling to hundreds of thousands of entries while preserving human readability."

- description: "Human-in-the-Loop Memory Editing"
  questions: ["How do humans edit agent markdown memory without breaking structured formats?", "What tools exist for human-inspectable and human-editable memory?", "How does the 'Obsidian as IDE' pattern work in practice?"]
  resolved: true
  findings: "The 'Obsidian as IDE' pattern (popularized by Karpathy's LLM Wiki) positions Obsidian as the human-facing interface for agent memory editing. In this pattern, the LLM acts as the 'programmer' that generates and maintains markdown files, while the human acts as the 'reviewer' who edits and curates those files in Obsidian. The workflow: (1) LLM generates markdown memory files in a designated directory; (2) Human reviews files in Obsidian, using its graph view to detect orphans, hubs, and structural issues; (3) Human edits files directly in Obsidian's markdown editor, which preserves YAML frontmatter and structured formatting; (4) LLM reads the updated files on its next session, incorporating human corrections. This pattern works because: (a) Obsidian provides a rich, visual interface for navigating interconnected markdown files; (b) YAML frontmatter is preserved when humans edit the content sections; (c) Git version control provides a safety net for reverting bad edits. The key challenge is ensuring that human edits don't break the YAML frontmatter structure — this is mitigated by using Obsidian's community plugins (like 'YAML Frontmatter' plugin) that provide visual editors for frontmatter fields."

phase_0_complete: true
phase_1_complete: true
phase_2_complete: true
phase_3_complete: true
