# llama.cpp — Build & Server Reference

Comprehensive reference for every build flag, CMake option, and server CLI/environment variable in **llama.cpp**.

> **Source**: `/home/jon/git/betty/llama/llama.cpp/`  
> **Target audience**: Developers deploying or building llama.cpp

---

## Quick Navigation

### Build Options

| Page | Summary |
|------|---------|
| [[llama-cpp/build-options/cmake-overview\|CMake Overview]] | Top-level CMake options, build presets, and build targets |
| [[llama-cpp/build-options/backend-options\|Backend Options]] | GPU accelerators: CUDA, ROCm, Vulkan, Metal, SYCL, Vulkan, etc. |
| [[llama-cpp/build-options/ggml-options\|GGML Options]] | Low-level GGML library tuning, cache policies, tensor ops |
| [[llama-cpp/build-options/build-flags-reference\|Build Flags Reference]] | Complete table of every `-D...` CMake flag |

### Server Flags

| Page | Summary |
|------|---------|
| [[llama-cpp/server-flags/usage-and-model\|Usage & Model]] | `--model`, `--alias`, `--host`, `--port`, model loading |
| [[llama-cpp/server-flags/slot-management\|Slot Management]] | Multi-user slots: `--slots`, `--n_ctx`, `--n_batch`, `--n_ubatch` |
| [[llama-cpp/server-flags/sampling-params\|Sampling Parameters]] | Temperature, top_k, top_p, grammar, penalties, repeat |
| [[llama-cpp/server-flags/context-and-attention\|Context & Attention]] | Context length, flash attention, rope scaling, KV cache |
| [[llama-cpp/server-flags/gpu-and-backends\|GPU & Backends]] | GPU layer offload, tensor splits, backend selection |
| [[llama-cpp/server-flags/embeddings-and-multimodal\|Embeddings & Multimodal]] | Embedding mode, image projection (mmproj), batched embeddings |
| [[llama-cpp/server-flags/logging-and-debugging\|Logging & Debugging]] | Verbosity, timing, cache, trace, debug flags |
| [[llama-cpp/server-flags/advanced-and-experimental\|Advanced & Experimental]] | Speculative decoding, chat templates, JSON mode, API key |
| [[llama-cpp/server-flags/flags-reference\|Flags Reference]] | Complete table of every `--flag` and `LLAMA_ARG_*` env var |

### Cross-Cutting

| Page | Summary |
|------|---------|
| [[llama-cpp/architecture\|Architecture]] | System design, data flow, component relationships |
| [[llama-cpp/tags\|Tags]] | Tag index organized by category |

---

## How to Use This Documentation

1. **Finding a flag**: Use the [[llama-cpp/server-flags/flags-reference\|Flags Reference]] table or [[llama-cpp/build-options/build-flags-reference\|Build Flags Reference]] table.
2. **Understanding a category**: Start with the relevant category page (e.g., [[llama-cpp/server-flags/sampling-params\|Sampling Parameters]]).
3. **Deep dive**: Read [[llama-cpp/architecture\|Architecture]] for system-wide design.

## Environment Variables vs CLI Flags

Every server CLI flag has a corresponding `LLAMA_ARG_*` environment variable. For example:

```bash
# CLI flag
llama-server --host 0.0.0.0 --port 8080

# Equivalent environment variables
LLAMA_ARG_HOST=0.0.0.0 LLAMA_ARG_PORT=8080 llama-server
```

Environment variables take precedence when both are specified.
