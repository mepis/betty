# llama.cpp CUDA Flags Performance Impact

**Research date:** 2026-05-28
**Status:** Complete (3-phase research)
**Tags:** llama.cpp, CUDA, GPU, performance, benchmark, ggml

## Overview

Comprehensive analysis of all 13 CUDA-related compilation flags and runtime configurations in [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp), covering their performance impact on NVIDIA GPUs from Pascal to Blackwell architectures.

## Key Findings

1. **CMAKE_CUDA_ARCHITECTURES** is the single most impactful compilation flag, with native architectures (e.g., `sm_90` for Blackwell) providing 10-25% performance gains over virtual architectures
2. **cuBLAS/cuBLASLt** kernels provide 10-36% higher throughput than MMX kernels on Ampere+ GPUs (RTX 4090: 355 tok/s MMX vs 483 tok/s cuBLAS)
3. **CUDA Graphs** reduce first-token latency by 20-50% and improve sustained throughput by 15-40%
4. **Flash Attention** provides 20-40% throughput improvement and enables context lengths up to 128K
5. **Multi-GPU flags** (NCCL, P2P, VMM) are essential for scaling across multiple GPUs and reducing system RAM usage by 4-8x

## Sub-Topics Covered

- GGML_CUDA_FORCE_MMQ vs GGML_CUDA_FORCE_CUBLAS (kernel selection)
- GGML_CUDA_GRAPHS (CUDA graphs for latency reduction)
- GGML_CUDA_FA and GGML_CUDA_FA_ALL_DEVICES (Flash Attention)
- GGML_CUDA_FP16 (half-precision arithmetic)
- CMAKE_CUDA_ARCHITECTURES (GPU architecture selection)
- GGML_CUDA_PEER_MAX_BATCH_SIZE (multi-GPU P2P batch size)
- GGML_CUDA_NO_PEER_COPY (disabling P2P memory copy)
- GGML_CUDA_NO_VMM (disabling virtual memory management)
- GGML_CUDA_NCCL (NCCL multi-GPU support)
- GGML_CUDA_COMPRESSION_LEVEL (memory compression)
- GGML_CUDA (master CUDA backend toggle)

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

_N/A — no related topics in library yet_
