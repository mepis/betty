# Research Library Index

## Topic Entries

| Topic | Date | Status | Tags |
|-------|------|--------|------|
| [llama.cpp CUDA Flags Performance Impact](topics/llama-cuda-flags-performance/) | 2026-05-28 | Complete | llama.cpp, CUDA, GPU, performance, benchmark, ggml |
| [Optimized llama-server Settings for Qwen3.6-35B-A3B](topics/optimized-llama-server-settings-qwen36-35b/) | 2026-05-28 | Complete | llama.cpp, Qwen, MoE, GPU optimization, quantization |
| [llama.cpp gRPC Server](topics/llama-cpp-grpc-server/) | 2026-05-29 | Complete | llama.cpp, gRPC, LLM-serving, LocalAI, inference, distributed-inference |
| [OpenAI Compatible APIs](topics/openai-compatible-apis/) | 2026-05-29 | Complete | openai, api, llm, protocol, llama.cpp, ollama, vllm, litellm, openwebui, mcp, gateway, enterprise |
| [LLM Harness](topics/llm-harness/) | 2026-05-29 | Complete | llm, agent-harness, orchestration, security, taxonomy, etclovg, mcp, a2a, data-governance, prism |
| [Qdrant](topics/qdrant/) | 2026-05-29 | Complete | vector-database, qdrant, rust, hybrid-search, hnsw, distributed, embeddings |
| [RAG Systems](topics/rag-systems/) | 2026-05-29 | Complete | rag, retrieval, embeddings, vector-databases, llm, architecture, evaluation, frameworks |
| [Agent Memory Strategies](topics/agent-memory-strategies/) | 2026-05-29 | Complete | agent-memory, llm-architecture, memory-benchmarks, privacy-security, multi-agent-systems |
| [Agent Memory Using Markdown](topics/agent-memory-using-markdown/) | 2026-05-29 | Complete | agent-memory, markdown, llm-wiki, structured-text, mcp |
| [Using Go to Build Agentic Systems](topics/using-go-to-build-agentic-systems/) | 2026-05-29 | Complete | golang, ai, agent, tool-calling, mcp, llm, framework |
| [pi.dev SDK](topics/pi-dev-sdk/) | 2026-06-03 | Complete | pi.dev, SDK, agent-harness, TypeScript, coding-agent, OpenClaw, extensions, RPC, Lit |
| [Opencode.ai Directory Restriction Mechanisms](topics/opencode-ai-directory-restriction/) | 2026-06-04 | Complete | opencode, agent-harness, security, permissions, sandboxing, directory-restriction, filesystem, anomaly |
| [Opencode Web UI Chat Message Handling](topics/opencode-web-ui-chat-message-handling/) | 2026-06-12 | Complete | opencode, web-ui, chat, message-handling, SolidJS, streaming, virtualization, agent-harness |
| [Searching for and Downloading Models from Huggingface for llama.cpp](topics/huggingface-models-llama-cpp/) | 2026-06-17 | Complete | huggingface, gguf, llama.cpp, model-download, quantization, hf_transfer, model-management |

## Detail

### llama.cpp CUDA Flags Performance Impact

**Date:** 2026-05-28
**Status:** Complete

**Summary:** Comprehensive analysis of all 13 CUDA-related compilation flags and runtime configurations in llama.cpp, covering their performance impact on NVIDIA GPUs from Pascal to Blackwell architectures.

**Key Findings:**
- CMAKE_CUDA_ARCHITECTURES provides 10-25% performance gain for native architectures
- cuBLAS kernels provide 10-36% higher throughput than MMX on Ampere+ GPUs
- CUDA Graphs reduce first-token latency by 20-50%
- Flash Attention provides 20-40% throughput improvement
- Multi-GPU flags essential for scaling and memory efficiency

### Optimized llama-server Settings for Qwen3.6-35B-A3B

**Date:** 2026-05-28
**Status:** Complete

**Summary:** Comprehensive research into optimal llama-server configuration for Qwen3.6-35B-A3B, a Mixture-of-Experts language model with 128 experts. Covers expert-affinity mapping, complete command line examples for 8GB–48GB VRAM hardware, and quantization performance comparison.

**Key Findings:**
- Expert affinity (`--expert-affinity`) is the single most critical setting for MoE models
- Q4_K_M (14GB VRAM, 12.3 tok/s) is optimal for 24GB GPUs; Q5_K_M (16GB, 15.6 tok/s) for quality-sensitive tasks
- Expert mapping scales linearly: ~8GB VRAM per 20 experts
- Q6_K offers near-Q8 quality with 4GB less VRAM than Q8_0
- Optimal flags: `--batch-size 1024`, `--cache-reuse 512`, `--flash-attn`, `--n-gqa 8`

### llama.cpp gRPC Server

**Date:** 2026-05-29
**Status:** Complete

**Summary:** Comprehensive analysis of gRPC-based inference servers built on top of llama.cpp, covering three distinct approaches: a focused standalone server (kherud/grpc-llama.cpp), a multi-model API platform (LocalAI), and a custom distributed inference protocol (llama.cpp RPC server).

**Key Findings:**
- Three distinct serving approaches serve different use cases: standalone gRPC server, multi-model platform, and distributed inference protocol
- gRPC outperforms HTTP/REST by 30-50% in latency for inference serving
- LocalAI is the most production-ready option with authentication, rate limiting, and Kubernetes support
- CVE-2026-27940 is a critical buffer overflow in the underlying gguf library affecting all llama.cpp-based servers
- No standalone gRPC server provides built-in authentication — all designed for trusted environments

### OpenAI Compatible APIs

**Date:** 2026-05-29
**Status:** Complete

**Summary:** Comprehensive research mapping the OpenAI-compatible API ecosystem — from the underlying specification through local server implementations, AI gateway/proxy layers, and frontend integrations. Covers llama.cpp, Ollama, vLLM, LiteLLM, OpenRouter, OpenWebUI, and the emerging Model Context Protocol (MCP).

**Key Findings:**
- The OpenAI-compatible API is a de facto standard without formal governance; OpenAI maintains an official OpenAPI spec at github.com/openai/openai-openapi
- Diverse server ecosystem from simple (llama.cpp, Ollama) to production-grade (vLLM, SGLang)
- Gateway layer (LiteLLM Proxy, OpenRouter) fills critical enterprise gaps in auth, routing, and observability
- Frontend ecosystem (OpenWebUI, LobeChat) enables plug-and-play local model access
- MCP emerging as complementary protocol for universal tool integration

### LLM Harness

**Date:** 2026-05-29
**Status:** Complete

**Summary:** Comprehensive research into the LLM harness ecosystem — the structural backbone that orchestrates LLM agent execution. Covers the ETCLOVG taxonomy, full-stack and specialized harnesses, multi-agent systems, protocol standardization (MCP, A2A), safety frameworks (PRISM, Microsoft AGT), and the critical data governance gap.

**Key Findings:**
- "Agent = Model + Harness" — harness quality matters more than model quality (13.7-point Terminal Bench gain with zero model changes)
- ETCLOVG taxonomy provides 7-layer framework: Execution, Tools, Context, Lifecycle, Observation, Validation, Guardrails
- Data governance is the biggest gap: uncertified data causes 60-80% of agent failures in production
- PRISM zero-fork defense-in-depth and Microsoft AGT address OWASP agentic AI risks
- Protocol fragmentation: MCP (Anthropic) and A2A (Google) competing standards
- OpenAI introduced "Model-Native Harnesses" in May 2026
- 50+ open-source projects mapped across the harness ecosystem

---

## RAG Systems

**Date:** 2026-05-29

Retrieval-Augmented Generation (RAG) is the dominant paradigm for grounding large language models in proprietary, up-to-date, and verifiable knowledge. This research covers the full RAG ecosystem: pipeline architecture, chunking strategies, embedding models, vector databases, advanced patterns (agentic RAG, graph RAG, hybrid search), evaluation frameworks (RAGAS, eRAG), tooling (LangChain, LlamaIndex, DSPy), and production deployment considerations.

**Key findings:**
- Component selection matters more than framework choice
- Hybrid search (BM25 + vector) improves recall by 15–25 points
- BGE-M3 and Voyage-3 are top embedding models for RAG
- RAGAS provides standardized evaluation without human annotation
- Agentic and programmatic RAG represent the next frontier

---

## Agent Memory Strategies

**Date:** 2026-05-29

Agent memory strategies encompass the architectures, mechanisms, and frameworks that enable AI agents to store, retrieve, manage, and evolve their memories over time. This research covers memory taxonomy (episodic, semantic, procedural, working), long-term memory architectures (vector stores, knowledge graphs, hybrid), retrieval strategies, memory management (forgetting, compression, conflict resolution, privacy), production frameworks (Mem0, Zep, LangGraph Store), evaluation benchmarks (MemBench, Memora, Evo-Memory, LOCCO), self-evolving memory systems (ReMe), and privacy/security concerns (MEXTRA attack, MemPot, A-MemGuard).

**Key findings:**
- Hybrid vector-graph architectures are becoming the standard for long-term memory
- Memory management (forgetting, conflict resolution) is as important as storage and retrieval
- Production frameworks (Mem0, Zep, LangGraph Store) provide mature, configurable solutions
- Dedicated benchmarks now measure memory quality independently of downstream task performance
- Self-evolving memory systems (ReMe) significantly outperform static memory agents
- Privacy attacks (MEXTRA) demonstrate real risks requiring dedicated defense mechanisms

---

## Agent Memory Using Markdown

**Date:** 2026-05-29

This research investigates using Markdown as the primary memory representation format for AI agents. Key findings:

- **The LLM Wiki pattern** (Karpathy, 2026) transforms RAG from retrieval-only to compilation-based knowledge accumulation with a three-layer architecture (raw sources → wiki → schema)
- **Markdown is 15% more token-efficient than JSON**, with savings widening to 20-25% at deeper nesting levels
- **Hybrid Markdown+SQLite systems** achieve 98% Recall@5 on LongMemEval-S while maintaining human readability, scaling to 100K+ entries
- **Production-grade formats** (neocortex.md, ClawMem, agentmemory, memweave) provide explicit schemas, governance rules, and four-tier memory architectures
- **The "Obsidian as IDE" pattern** enables human-in-the-loop memory editing without breaking structured formats

---

## Qdrant

**Date:** 2026-05-29

Qdrant is a vector database written in Rust that provides disk-based storage, strong payload filtering, hybrid search with sparse vectors, and a balance of managed (Qdrant Cloud) and self-hosted deployment options. It is particularly well-suited for production RAG systems that require complex payload filtering and cost-efficient scaling.

**Key findings:**
- Disk-based storage enables ~10x lower hardware costs than in-memory alternatives
- Unified indexing (v1.13+) eliminates filtered search performance penalty
- Sparse vector support enables hybrid search via Reciprocal Rank Fusion
- Free tier supports up to 8M vectors (with binary quantization)
- ACORN algorithm (v1.16+) improves filtered search accuracy

---

## Using Go to Build Agentic Systems

**Date:** 2026-05-29

This research examines the Go ecosystem for building agentic AI systems, with particular focus on tool calling mechanisms. The Go ecosystem has matured from simple LLM API wrappers to comprehensive agent frameworks with native tool calling support, MCP protocol integration, and production-ready architectures.

**Key findings:**
- **Three architectural approaches coexist:** SDK-level tool calling (OpenAI function calling), protocol-level tool discovery (MCP), and framework-level orchestration (Blades, pi-agent-go, AgenticGoKit)
- **MCP-first architectures dominate:** The most mature Go agent frameworks are built around the Model Context Protocol, reflecting its emergence as the de facto standard for tool discovery
- **Go's type system provides unique advantages:** Compile-time validation of tool definitions, automatic JSON schema generation, and structured output parsing enable both flexibility and type safety
- **Robust MCP ecosystem:** Official SDKs from Anthropic and Google, plus third-party implementations (mcp-go, ToolHive, MCP Toolbox), create a comprehensive tool infrastructure
- **Performance advantages:** Compiled execution with goroutine-based concurrency enables efficient parallel tool execution, making Go ideal for production agentic systems

**Notable frameworks:** Blades (go-kratos), pi-agent-go, AgenticGoKit, JoakimCarlsson/ai, Gollm, ChatGPT-CLI

**Notable MCP libraries:** MCP Go SDK (Anthropic), MCP Go Server, MCP Toolbox (Google), ToolHive (Stacklok), MCP Toolbox Go SDK

---

## pi.dev SDK

**Date:** 2026-06-03

The pi.dev SDK is the programmatic interface for embedding Mario Zechner's open-source coding agent into custom applications. Built as a TypeScript monorepo with 5 layered packages (pi-ai, pi-agent-core, pi-coding-agent, pi-tui, pi-web-ui), it exposes `createAgentSession()` as its primary factory, yielding a fully-configurable `AgentSession` with event streaming, tool execution, session management, and extension support.

**Key findings:**
- **Layered DAG architecture:** 5 core packages with strict downward-only dependencies; each independently usable
- **Minimal agent core:** ~418-line agent loop, ~1,500 lines total for pi-agent-core; <1,000 token system prompt
- **Rich event system:** 25+ typed events across 7 categories for extension hooks
- **Four integration modes:** Interactive TUI, print/JSON, RPC (JSONL over stdin/stdout), direct SDK embedding
- **OpenClaw as canonical integration:** 145k+ stars, multi-channel (WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Teams)
- **Most extensible open-source agent:** 25+ events vs Claude Code's 14 hooks; in-process TypeScript vs shell-based hooks
- **Session tree:** JSONL storage with branching, forking, cloning via id/parentId linking

---

## Opencode.ai Directory Restriction Mechanisms

**Date:** 2026-06-04

OpenCode.ai (by Anomaly) restricts AI agents to specific directories through a permission-based, tool-centric model rather than OS-level sandboxing. The primary mechanism is the `external_directory` permission that triggers when tools access paths outside the working directory, combined with per-agent permission overrides and wildcard pattern matching.

**Key findings:**
- **Permission system is tool-centric, not path-centric:** Each tool (read, edit, glob, grep, bash, etc.) gated with allow/ask/deny actions using wildcard pattern matching; last-match-wins semantics
- **external_directory is the primary directory boundary:** Defaults to "ask" for user approval when tools access paths outside the working directory
- **Per-agent permission overrides fully supported:** Different agents can have different access levels via JSON config or Markdown agent files
- **Subagent permission inheritance changed May 2026:** PR #26597 introduced parent deny inheritance; fixed by PR #26845/#27201 to only inherit edit-class denies
- **No OS-level sandboxing:** Docker container isolation recommended for production; symlink escape vulnerabilities patched multiple times (issues #8313, #6403; PRs #7515, #8727, #10366, #11351)
- **Per-agent filesystem path boundaries remain unimplemented:** Issue #5529 (Dec 2025, 11+ 👍) proposes fs.allow/fs.deny but no implementation exists

---

## Opencode Web UI Chat Message Handling

**Date:** 2026-06-12

OpenCode's web UI handles chat messages through a 5-layer architecture: SDK type definitions → WebSocket event stream → directory-level sync with optimistic updates → virtualized timeline rendering → part-specific tool rendering. Built on Solid.js with fine-grained reactivity.

**Key findings:**
- **WebSocket event-driven sync** — Server pushes `message.updated`, `message.part.updated`, `message.part.delta` (streaming) events; client applies via event reducer with binary search O(log n) upserts
- **Optimistic UI** — Messages render immediately before server confirmation, then reconcile
- **User messages as anchors** — Only `UserMessage[]` drives the timeline; assistant messages grouped under parent via `parentID`
- **11 part types** — Text, reasoning, tool, file, subtask, step-start/finish, snapshot, patch, agent, retry, compaction
- **Context tool grouping** — Consecutive `read`/`glob`/`grep`/`list` calls collapsed into single collapsible
- **Paced streaming** — ~24ms intervals snapping to word boundaries; auto-scroll with 90-frame grace period
- **Virtualized rendering** — `virtua/solid` with 16-session row cache; row reuse by equality check

---

## Searching for and Downloading Models from Huggingface for llama.cpp

**Date:** 2026-06-17

This research covers the complete ecosystem for discovering, evaluating, and downloading GGUF-format language models from Hugging Face for use with llama.cpp. Hugging Face hosts over 183,000 GGUF-compatible models as of 2026, making it the largest repository of GGUF files. The research maps three download mechanisms (llama.cpp's `-hf` flag, `huggingface-cli`, `hf_transfer`), the model provider ecosystem (bartowski, unsloth, ggml-org), llama.cpp's model management system (router mode, presets), and third-party discovery tools.

**Key findings:**
- Three download mechanisms serve different use cases: llama.cpp's `-hf` flag is simplest (one command), `huggingface-cli` offers maximum flexibility (selective files, resume, custom dirs), and `hf_transfer` delivers >1GB/s speeds for large files
- The GGUF provider ecosystem has consolidated around bartowski (50+ architectures), unsloth (Unsloth-distilled GGUFs), and ggml-org (official collection)
- llama.cpp's model management system (Dec 2025) brings Ollama-style multi-model capabilities via router mode with INI preset files
- The March 2026 cache migration to `~/.cache/huggingface/hub/` resolved interoperability issues with other Hugging Face tools
- Ollama natively supports Hugging Face GGUF URLs since Oct 2024 (`ollama run hf.co/user/model:quant`)
