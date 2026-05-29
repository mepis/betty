# Research Library Index

## Topic Entries

| Topic | Date | Status | Tags |
|-------|------|--------|------|
| [llama.cpp CUDA Flags Performance Impact](topics/llama-cuda-flags-performance/) | 2026-05-28 | Complete | llama.cpp, CUDA, GPU, performance, benchmark, ggml |
| [Optimized llama-server Settings for Qwen3.6-35B-A3B](topics/optimized-llama-server-settings-qwen36-35b/) | 2026-05-28 | Complete | llama.cpp, Qwen, MoE, GPU optimization, quantization |
| [llama.cpp gRPC Server](topics/llama-cpp-grpc-server/) | 2026-05-29 | Complete | llama.cpp, gRPC, LLM-serving, LocalAI, inference, distributed-inference |

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
