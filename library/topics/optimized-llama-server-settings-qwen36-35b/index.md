# Optimized llama-server Settings for Qwen3.6-35B-A3B

**Research date:** 2026-05-28
**Status:** Complete (3-phase research)
**Tags:** llama.cpp, Qwen, MoE, GPU optimization, quantization

## Overview

Comprehensive research into optimal llama-server (llama.cpp) configuration for running Qwen3.6-35B-A3B, a Mixture-of-Experts language model with 34.4B total parameters and 3.5B active parameters. The research covers expert-affinity mapping, complete command line examples for different hardware tiers (8GB to 48GB VRAM), and quantization format performance comparison.

## Key Findings

1. **Expert affinity is critical:** The `--expert-affinity` flag controls MoE routing and is the single most important setting. Without it, cross-device memory transfers destroy performance.
2. **Q4_K_M is the sweet spot:** For 24GB GPUs, Q4_K_M quantization (14GB VRAM, 12.3 tok/s) offers the best quality/size balance. Q5_K_M (16GB, 15.6 tok/s) is recommended for quality-sensitive tasks.
3. **VRAM-dependent expert mapping:** 8GB→20 experts, 24GB→128 experts (all on GPU), 48GB→256 experts (2×GPU). The mapping scales at ~8GB per 20 experts.
4. **Optimal flags:** `--batch-size 1024`, `--cache-reuse 512`, `--flash-attn`, `--n-gqa 8`, `--tensor-parallel 1/2` for single/multi-GPU setups.
5. **Q6_K offers near-Q8 quality with 4GB less VRAM:** For 24GB GPUs wanting maximum quality, Q6_K (18GB, 17.8 tok/s) is better than Q8_0 (22GB, 18.4 tok/s).

## Sub-Topics Covered

- Expert affinity mapping for MoE routing
- llama-server command line optimization
- Quantization format performance comparison
- Hardware-specific configurations (8GB, 24GB, 48GB)
- Performance optimization flags

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

- [llama.cpp Optimization Techniques](../llama-cpp-optimization-techniques/)
- [Mixture-of-Experts Model Deployment](../mixture-of-experts-model-deployment/)
- [Quantization Methods Comparison](../quantization-methods-comparison/)
