# Research Library Index

## Topic Entries

| Topic | Date | Status | Tags |
|-------|------|--------|------|
| [llama.cpp CUDA Flags Performance Impact](topics/llama-cuda-flags-performance/) | 2026-05-28 | Complete | llama.cpp, CUDA, GPU, performance, benchmark, ggml |
| [Optimized llama-server Settings for Qwen3.6-35B-A3B](topics/optimized-llama-server-settings-qwen36-35b/) | 2026-05-28 | Complete | llama.cpp, Qwen, MoE, GPU optimization, quantization |
| [llama.cpp gRPC Server](topics/llama-cpp-grpc-server/) | 2026-05-29 | Complete | llama.cpp, gRPC, LLM-serving, LocalAI, inference, distributed-inference |
| [OpenAI Compatible APIs](topics/openai-compatible-apis/) | 2026-05-29 | Complete | openai, api, llm, protocol, llama.cpp, ollama, vllm, litellm, openwebui, mcp, gateway, enterprise |
| [LLM Harness](topics/llm-harness/) | 2026-05-29 | Complete | llm, agent-harness, orchestration, security, taxonomy, etclovg, mcp, a2a, data-governance, prism |

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
