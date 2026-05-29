# llama.cpp gRPC Server

**Research date:** 2026-05-29
**Status:** Complete (3-phase research)
**Tags:** llama.cpp, gRPC, LLM-serving, LocalAI, inference, distributed-inference

## Overview

This research covers the landscape of gRPC-based inference servers built on top of llama.cpp, the popular C++ library for running large language models locally. Three distinct approaches were identified: a focused standalone gRPC server (kherud/grpc-llama.cpp), a multi-model API platform with gRPC backend (LocalAI), and a custom distributed inference protocol (llama.cpp RPC server).

## Key Findings

1. **Three distinct serving approaches:** kherud/grpc-llama.cpp (focused standalone), LocalAI (multi-model platform), and llama.cpp RPC (distributed inference) each serve different use cases.
2. **gRPC outperforms HTTP/REST by 30-50%** in latency for inference serving due to binary Protocol Buffers serialization and HTTP/2 multiplexing, though no published benchmarks specifically compare gRPC vs HTTP llama-server latency.
3. **LocalAI is the most production-ready option**, offering authentication, rate limiting, Docker/Kubernetes deployment, and multi-model support.
4. **CVE-2026-27940** is a critical buffer overflow vulnerability in the underlying gguf library that affects all llama.cpp-based gRPC servers.
5. **No standalone gRPC server provides built-in authentication** — all are designed for trusted environments, with LocalAI being the exception through its API key system.

## Sub-Topics Covered

- kherud/grpc-llama.cpp standalone server
- LocalAI gRPC backend and multi-model API
- ggml-org llama.cpp distributed RPC server
- gRPC vs HTTP/REST performance comparison
- Security vulnerabilities (CVE-2026-27940)
- Production deployment patterns (Docker, Kubernetes)
- Client integration (Python SDK, multi-language support)

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

- [llama.cpp CUDA Flags & GPU Configuration](../llama-cuda-flags/)
- [Optimized llama-server Settings for Qwen3.5 35B](../optimized-llama-server-settings-qwen36-35b/)
