# ANALYTICAL REPORT: Compacting Sessions for LLM Agents

## Executive Summary

This report presents a comprehensive analysis of session compaction techniques for long-running LLM agents — the mechanisms by which AI agents manage their conversation history when it exceeds the model's context window. The research spans the full spectrum of compaction approaches, from the most widely deployed (LLM-based summarization) to the most cutting-edge (KV cache compression and formal commitment-based frameworks). The findings reveal a field in rapid convergence: no single technique dominates, and production systems combine multiple strategies in layered architectures.

The research journey began with a broad survey of the compaction landscape, identifying seven distinct methods organized across five categories: summarization-based, structural/extractive, external memory/episodic retrieval, hybrid edge-preservation, and KV cache-level compression. Three sub-topics were deep-dived: summarization-based compaction (the most widely deployed), external memory and episodic retrieval (the most promising for long-term agents), and compaction chains and evaluation (the most critical operational concern). Three gaps were identified and resolved: KV cache-level compression, the Context Codec formal framework, and prompt caching interactions.

The central finding is that context compaction is now a first-class platform concern, not an optimization trick. Long-running agents accumulate O(N²) token costs with each tool call, suffer from the "lost-in-the-middle" attention deficit, and face hard context-window ceilings (200K–1M tokens). Without deliberate compaction, sessions are both expensive and increasingly unreliable after tens of thousands of tokens. The field has converged on four viable strategies — provider-native summarization APIs, structured "anchored iterative" compaction with persistent section templates, external memory offload, and retrieval-augmented episodic memory — and production platforms combine them in layered architectures.

## Methodology

This research was conducted across four phases following the deep-research skill's execution plan:

- **Phase 0 (Library Check):** Checked the Merlin Library for existing entries. Found tangentially related entries on pi.dev (which mentions compaction at a surface level) and wiki-style RAG systems (token cost analysis), but no dedicated entry on session compaction.
- **Phase 1 (Foundational Survey):** Conducted 4 broad searches across multiple formulations, identifying 7 sub-topics across the compaction landscape. Consulted 20+ authoritative sources including Anthropic's engineering blog, Microsoft's agent framework documentation, LangChain's Deep Agents blog, and multiple arXiv papers.
- **Phase 2 (Deep Dive):** Systematically explored the 3 most critical sub-topics with targeted searches and deep source consultation: summarization-based compaction, external memory/episodic retrieval, and compaction chains/evaluation.
- **Phase 3 (Gap Analysis):** Identified and resolved 3 gaps: KV cache-level compression (KVTC, PRISM), the Context Codec formal framework, and prompt caching interactions.
- **Stopping Criteria:** Both (A) all gaps addressed and (B) self-critique determined that further research would yield only incremental detail.

## Detailed Findings

### 1. The Compaction Problem: Why It Matters

Every API call to a frontier model bills the full conversation history as input tokens. A naive 20-step agent loop where each step produces 1,000 tokens yields 210,000 cumulative input tokens — not the 20,000 a per-step estimate suggests. At Claude Sonnet pricing, this O(N²) growth turns a 100-step debugging session into a non-trivial line item; at Opus rates, the same session can cost two orders of magnitude more than the first call.

Beyond cost, two additional failure modes compound:

- **"Lost in the Middle" effect:** Liu et al. (Transactions of the ACL) demonstrated that model performance peaks when relevant information sits at the very beginning or end of a context, degrading sharply — by over 30 percentage points on multi-document QA — when the answer document falls in the middle of a 20-document context. This is caused by how Rotary Position Embeddings (RoPE) attenuate mid-sequence attention and persists in explicitly long-context models.
- **Context rot:** Anthropic's engineering blog identifies a third failure mode — the gradual degradation of model behavior as irrelevant tool outputs, outdated intermediate states, and redundant re-reads accumulate. A 2025 industry survey attributed 65% of enterprise AI task failures to context drift or memory loss rather than raw token exhaustion.

The concrete trigger for compaction is the context-window ceiling. Most frontier models in 2025–2026 offer 200K tokens (Claude Sonnet/Opus) or up to 1M (Gemini 2.0). Anthropic's Claude Code auto-compact fires at approximately 98% of the effective window (total context minus reserved output tokens).

### 2. The Seven Methods: A Taxonomy

The field has organized around seven distinct compression methods, each operating at a different level of abstraction:

| Method | Mechanism | Compression | Hallucination Risk | Speed |
|---|---|---|---|---|
| **LLM Summarization** | Rewrites into sections | 70–90% | Medium | Slow (full LLM call) |
| **Opaque Compression** | Model-internal reduction | Variable | Unknown | Variable |
| **Verbatim Compaction** | Deletes noise, keeps text | 50–70% | Zero | 3,300+ tok/s |
| **Token Pruning (LLMlingua)** | Removes low-info tokens | 2–20× | Low | 3–6× faster |
| **Observation Masking** | Replaces outputs with placeholders | ~100% per output | Zero | Free |
| **ACON Adaptive Control** | Task-aware observation trimming | 26–54% | Low | Distillable |
| **Multi-Agent Isolation** | Separate context per agent | Architectural | Zero | Parallel |

### 3. Deep Dive: Summarization-Based Compaction

**Definition:** The most widely deployed compaction approach, where an LLM rewrites conversation history into organized sections (completed work, current state, pending tasks), replacing raw history with a structured narrative.

**How it works:** A model call summarizes the prior conversation into a compact narrative, which replaces the raw history. Hierarchical variants apply rolling summaries recursively — summarize turns 1–50, then turns 1–100 including the first summary, and so on. Map-reduce applies this in parallel: chunk the history, independently summarize each chunk (map), then combine the partial summaries into a final condensation (reduce).

**Production implementations:**
- **Anthropic's `compact_20260112` API** and **Claude Code's `/compact` command** use server-side summarization at ~98% context threshold. The `pause_after_compaction: true` flag lets integrators inject additional verbatim context (e.g., the 3 most recent tool results) before the session continues.
- **Google ADK** implements an event-count variant: fires after `compaction_interval` completed workflow events, summarizes a sliding window defined by `overlap_size`, and writes the result back to the session as a new compaction event.
- **Microsoft Azure AI Agent Framework** provides a structured compaction framework with MessageGroups, triggers, and strategies.
- **LangChain Deep Agents** implements three-tier compression: offloading large tool results to filesystem, offloading large tool inputs when context crosses 85% threshold, and summarization as a final fallback with dual in-context summary + filesystem preservation.

**Quality evaluation:** Factory.ai's benchmark of 36,611 production software engineering messages represents the most rigorous public evaluation: structured summarizer scored 3.70/5 overall, while all three tested methods (Factory, Anthropic, OpenAI) scored only 2.19–2.45/5 on artifact tracking (which files were modified). After a 178-message debugging session, Anthropic's compaction remembered "401 error on the authentication endpoint" while Factory's structured compaction remembered "/api/auth/login endpoint… stale Redis connection" — demonstrating that structured summaries preserve technical specificity better than freeform narratives.

**Key tradeoffs:** Summarization achieves the highest compression ratios, but the model rewrites the original text. Code snippets get paraphrased. File paths become "the auth module." Line numbers vanish. Error messages are described rather than preserved verbatim. The art of compaction lies in the selection of what to keep versus what to discard, as overly aggressive compaction can result in the loss of subtle but critical context whose importance only becomes apparent later (Anthropic, 2025).

### 4. Deep Dive: External Memory & Episodic Retrieval

**Definition:** Approaches where the agent continuously writes important facts, decisions, and state into an external memory store (vector DB, knowledge graph, file system) and retrieves relevant segments on demand, mirroring OS virtual memory architecture.

**How it works:** Rather than compacting conversation history into a summary, the agent continuously writes important facts, decisions, and state into an external memory store — typically structured files, a key-value store, or a knowledge graph — and reads from it explicitly at each step. This is the approach taken by MemGPT/Letta, which drew inspiration from OS virtual memory: the LLM's context window acts as fast "main memory," while an external store acts as "disk." The agent uses tool calls (core_memory_replace, archival_memory_insert) to move information in and out of active context.

**Production implementations:**
- **MemGPT/Letta:** Uses a heartbeat/request_heartbeat control-flow mechanism to ensure tool chains keep running long enough for writes to happen. Letta's V1 agent blog documents the complexity of this architecture.
- **Cognee:** Extends with a knowledge graph layer: ingested information is classified, chunked, entity-extracted (subject–relation–object triplets), and committed to a graph database. A memify pass then prunes stale nodes, strengthens frequently traversed connections, and adds derived facts. Cognee reports processing over one million pipelines per month in production with 14 different retrieval modes.
- **Zylos:** Uses markdown-file approach: structured memory/ files act as the persistent store, with the agent reading and writing them explicitly.
- **Amazon Bedrock AgentCore Memory:** Qdrant-backed episodic memory layer.
- **Mem0:** Used by AutoGPT and Cursor community extensions.

**Position paper insight:** The February 2025 position paper "Episodic Memory is the Missing Piece for Long-Term LLM Agents" argues that the single-shot learning property — recording specific past events with their temporal and spatial context — is precisely what current agents lack, and that RAG-over-turns is the closest practical approximation.

**Key tradeoffs:** No compaction chains — facts persist with full fidelity as long as the external store is intact. Supports cross-session continuity natively. Memory can be versioned, audited, and shared across agent instances. However, requires the agent to proactively decide what to write to external memory. Missed writes mean silently lost context. Write latency adds overhead at each significant step.

### 5. Deep Dive: Compaction Chains & Evaluation

**Definition:** The compounding error problem when agents undergo dozens of compaction cycles over days, and the challenge of benchmarking compaction quality beyond single-session factual recall.

**Compaction chain degradation:** Each summary is itself summarized in the next compaction cycle, progressively smoothing out specifics. This is the fundamental limitation of generative summarization approaches. The degradation is not captured by single-session benchmarks — real persistent agents undergo dozens of compaction cycles, and compaction chain degradation is a distinct failure mode.

**Evaluation landscape:**
- **LoCoMo (Snap Research, 2024):** 50 multi-session conversations, each averaging 300–600 turns over 19–35 sessions (9K–26K tokens per conversation). Tasks include single-hop and multi-hop factual QA, temporal QA, event summarization. Findings confirm that models systematically fail at temporal and causal connections across sessions — precisely the failure mode that compaction chains exacerbate.
- **Context-Bench (Letta, October 2025):** Focuses on chained file operations, cross-project relationship tracing, and multi-step decision consistency — the specific failure modes of compaction chains.
- **Factory.ai's probe-based framework:** 6 dimensions (accuracy, context awareness, artifact trail, completeness, continuity, instruction following) scored 0–5 using an LLM judge (GPT-5.2). Critical finding: compression ratio is a misleading primary metric. All three tested methods achieved 98–99% compression, yet quality scores differed meaningfully (3.35–3.70) and the technical specificity of preserved information differed dramatically.

**ACON (Microsoft/KAIST, arxiv:2510.00615):** Reduces memory usage by 26–54% (peak tokens) while largely preserving task performance on AppWorld, OfficeBench, and Multi-objective QA. Distilled compressors preserved 95%+ of teacher accuracy. Small LMs improved by 32% on AppWorld, 20% on OfficeBench, and 46% on Multi-objective QA via Acon-guided compression. Acon's key innovation: failure-driven, task-aware compression guideline optimization that is entirely gradient-free and applicable to any LLMs, including API-based models.

**Common evaluation pitfalls:**
1. Single-session evaluation — most benchmarks test one compaction event; real persistent agents undergo dozens of compaction cycles.
2. Factual recall over task continuation — asking "what was discussed?" is easier than "can you continue the task correctly?" yet most benchmarks use the former.
3. No artifact tracking — file modification history, tool call results, and intermediate decisions are the hardest to preserve and the most practically important for coding agents.
4. Static gold labels — conversations with predetermined correct answers do not model the open-ended nature of real agent sessions.

### 6. Structural & Extractive Compression

Zero- or near-zero-cost techniques that reduce token count through engineering discipline:

- **Tool result deduplication:** If the same file is read N times, only the most recent read is kept in context. Older identical outputs are replaced with a `[deduplicated: <timestamp>]` marker.
- **Canonicalization:** Tool outputs are normalized to a standard format before being inserted (e.g., JSON → compact-JSON, verbose error stacktraces truncated to first 20 lines + last 5 lines).
- **Error purging:** Once an error is resolved (subsequent tool call succeeds), prior error messages are removed from context — implemented deterministically without a model call.
- **LLMLingua-2:** Frames compression as a binary token classification task — keep or drop each token — using a fine-tuned BERT-sized encoder trained via GPT-4 distillation. Achieves up to 20× compression with minimal accuracy loss, 3–6× faster than generative summarization, end-to-end latency improvements of 1.6–2.9×.
- **Focus Agent (arxiv:2601.07190):** An agent-centric architecture inspired by Physarum polycephalum (slime mold) that autonomously decides when to consolidate key learnings into a persistent "Knowledge" block and actively withdraws (prunes) raw interaction history. Achieves 22.7% token reduction (14.9M → 11.5M tokens) while maintaining identical accuracy on SWE-bench Lite instances, performing 6.0 autonomous compressions per task on average.

### 7. KV Cache-Level Compression (Gap Resolution)

KVTC (KV Cache Transform Coding, ICLR 2026) applies classical media compression (PCA decorrelation, adaptive quantization, entropy coding) to compress KV caches by ~20×. It operates at the inference engine level, not the API level — fundamentally different from summarization. PRISM (Chungnam National University, arxiv:2603.21576) takes this further with O(1) photonic block selection, achieving 100% accuracy from 4K–64K tokens at k=32 with 16× traffic reduction.

The key architectural insight: attention heads split into retrieval heads (attend to distant tokens) and streaming heads (attend to nearby tokens), with ~25–50% classified as retrieval heads. NVIDIA's Vera Rubin architecture dedicates an entire DPU (ICMS) to KV cache management with flash-backed storage — confirming that KV cache management is now a first-class system design problem.

**Critical distinction:** KV compression operates inside the GPU, reducing memory footprint without API round trips, but operates at the token level rather than the semantic level — it preserves information at the mathematical level but cannot make semantic decisions about what to keep or discard, unlike summarization. The two approaches are complementary, not competitive.

### 8. The Context Codec Framework (Gap Resolution)

Context Codec (Trukhina & Vashkelis, arxiv:2605.17304, May 2026) represents dialogue state as typed, source-grounded semantic atoms with canonical identity, equivalence, conflict, confidence, risk, and evidence spans. It separates five concerns — extraction, normalization, representation, rendering, and verification — and introduces metrics for Critical Atom Recall, Weighted Atom Recall, Commitment Density, and round-trip recoverability.

CCL (Context Compression Language) is an ASCII-first compact rendering of canonical JSON atoms. In a diagnostic study, CCL-Core occupies a useful middle ground between structured prose and JSON: more explicit and auditable than prose, usually more compact than JSON, and less risky than heavily minified notation.

The framework represents a fundamentally different philosophy: instead of compressing tokens, compress commitments. A semantic commitment is any proposition, constraint, decision, preference, state variable, or safety boundary that can change the correctness of a future response. The framework is nascent — only a small diagnostic study exists, no production deployments found.

### 9. Prompt Caching Interactions (Gap Resolution)

Prompt caching and compaction have fundamental tension — compaction is a hard semantic break that invalidates all prior cached prefixes. The interaction is now well-documented in production:

**Optimal architecture (Anthropic):** Stable system prompt prefix + `cache_control: { type: "ephemeral" }` breakpoint at end of system prompt → compaction block with its own `cache_control` marker → new turns appended. On subsequent turns, both system prompt and compaction summary are served from cache; only new turns are billed as fresh input.

**Cost math:** A 20-turn coding agent with 12K stable prefix + 40K dynamic history on Claude Sonnet 4.6 ($3/MTok input):
- No optimization: ~$0.156/turn
- Caching alone: $0.1236/turn (85% savings on prefix)
- Caching + compaction (60% reduction): $0.0516/turn (58% cheaper than caching alone, 90%+ cheaper than no optimization)

**Critical edge case:** A Claude Code bug (v2.1.62) increased KV cache hit rates without adding a compaction-event cache invalidation trigger, causing stale pre-compaction prefixes to be served into post-compaction contexts — a reminder that cache invalidation logic must be carefully managed alongside compaction.

**Provider comparison:**
- Anthropic: Explicit cache_control, write premium (1.25×–2×), cheapest reads (0.1×), 5-min or 1-hour TTL
- OpenAI: Fully automatic, no write premium, 50–90% discount (model-dependent), no TTL control
- Google: Implicit (auto) + explicit (manual), charges storage ($1–4.50/MTok/hr), 75–90% discount

### 10. Hybrid Approach: Keep Edges, Summarize the Middle

The most widely deployed production strategy combines the above approaches into a three-region architecture:

1. **System prompt** (full, unchanged) — always preserved verbatim
2. **Recent N turns** (verbatim, for coherence) — typically the 5–10 most recent interactions
3. **Compact summary** (replaces all prior history) — structured narrative of completed work, current state, pending tasks

This hybrid pattern is used by Claude Code, Google ADK, Microsoft Azure AI Agent compaction, and LangChain Deep Agents. It preserves coherence at the edges (the model always sees the current instruction and recent actions) while controlling growth. The "middle" summary is a lossy single point of failure, and compaction chains compound error across multi-day sessions.

## Conclusion

Session compaction for LLM agents has evolved from an afterthought optimization to a first-class platform concern. The field has converged on a layered architecture: structural techniques (deduplication, canonicalization) provide zero-cost baseline compression; summarization-based approaches handle the bulk of context reduction with structured section templates; external memory offload preserves critical facts with full fidelity; and retrieval-augmented episodic memory enables cross-session continuity. KV cache-level compression and formal commitment-based frameworks represent the next frontier — operating at the inference engine and semantic level respectively.

No single technique dominates. Production systems combine them in layered architectures that address cost, correctness, latency, and debuggability simultaneously. The most critical unresolved challenge remains compaction chain degradation — the compounding error problem when agents undergo dozens of compaction cycles over days — which current benchmarks do not adequately capture.

## Future Work & Recommendations

1. **Develop compaction chain benchmarks:** The field needs benchmarks that model sequential, lossy compressions over days-long agent runs (not single compaction events), with artifact tracking, task continuation accuracy, and cross-compaction coherence as primary metrics. LoCoMo-Plus and Context-Bench are promising starting points.

2. **Invest in commitment-level compression:** The Context Codec framework's philosophy of compressing semantic commitments rather than raw tokens warrants further exploration, particularly for safety-critical applications where losing a single constraint can make a future response incorrect. Production deployments and larger-scale evaluations would validate whether CCL's auditability advantage translates to practical benefits.

3. **Optimize caching-compaction interactions:** As prompt caching becomes universal across providers, the compaction cache invalidation problem will grow more critical. Research should focus on (a) cache-aware compaction strategies that minimize invalidation, (b) cross-provider standardization of compaction event signaling, and (c) hybrid approaches that combine KV-level caching with API-level summarization for maximum cost efficiency.

## Citations

ACON (Agent Context Optimization). 2025. "Acon: Optimizing Context Compression for Long-horizon LLM Agents." arXiv:2510.00615v2. Microsoft/KAIST.

Anthropic. 2025. "Effective context engineering for AI agents." Anthropic Engineering Blog. September 29.

Factory.ai. 2026. Context compression evaluation of 36,611 production software engineering messages. Reported in MorphLLM, "Context Compression for LLMs: 7 Methods Compared with Benchmarks (2026)." March 13.

Jiang, et al. 2023. "LLMLingua: Distilling Instructions for Language Model Compression."

Kang, Minki, et al. 2025. "Acon: Optimizing Context Compression for Long-horizon LLM Agents." arXiv:2510.00615.

Kargar, Isaac. 2025. "The Fundamentals of Context Management and Compaction in LLMs." Medium.

KVTC. 2026. "KV Cache Transform Coding for Compact Storage in LLM Inference." ICLR 2026. OpenReview.

LangChain. 2026. "Context Management for Deep Agents." LangChain Blog. January 28.

Liu, et al. 2023. "Lost in the Middle: How Language Models Use Long Contexts." Transactions of the ACL.

MemGPT/Letta architecture. 2024. Virtual memory hierarchy for LLM agents.

Microsoft. 2026. "Compaction | Microsoft Learn." Microsoft Agent Framework Documentation.

MorphLLM. 2026. "Prompt Caching: How Anthropic, OpenAI, and Google Cut LLM Costs by 90%." April 5.

Park, Hyoseok, and Yeonsang Park. 2026. "PRISM: Breaking the O(n) Memory Wall in Long-Context LLM Inference via O(1) Photonic Block Selection." arXiv:2603.21576.

OpenAI. 2025. "Context Engineering - Short-Term Memory Management with Sessions." OpenAI Agents SDK Cookbook. September 9.

Trukhina, Natalia, and Vadim Vashkelis. 2026. "Compress the Context, Keep the Commitments: A Formal Framework for Verifiable LLM Context Compression." arXiv:2605.17304. EMILAB.

Verma, Nikhil. 2026. "Active Context Compression: Autonomous Memory Management in LLM Agents." arXiv:2601.07190.

Zylos. 2026. "Agent Context Compaction for Long-Running Sessions: Techniques and Tradeoffs." Zylos Research. April 21.
