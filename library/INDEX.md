# Research Library Index

## Topic Entries

| Topic | Date | Status | Tags |
|-------|------|--------|------|
| [llama.cpp CUDA Flags Performance Impact](topics/llama-cuda-flags-performance/) | 2026-05-28 | Complete | llama.cpp, CUDA, GPU, performance, benchmark, ggml |

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
