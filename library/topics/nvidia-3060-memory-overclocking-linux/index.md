# Nvidia 3060 12GB Memory Overclocking Results in Linux

**Research date:** 2026-06-23
**Status:** Complete (3-phase research)
**Tags:** nvidia-3060, memory-overclocking, linux, gpu-overclocking, LLM-inference, NVML, nvidia-smi, GDDR6, bandwidth

## Overview

This research investigates memory overclocking on the NVIDIA GeForce RTX 3060 12GB under Linux, with focus on measurable performance gains for local LLM inference workloads. The RTX 3060 12GB is one of the most popular consumer GPUs for local LLM inference due to its 12GB VRAM, 360 GB/s memory bandwidth, and sub-$250 price point. Memory overclocking directly increases memory bandwidth — the single most critical factor for LLM inference speed.

## Key Findings

1. **Memory overclocking yields +800 to +1,400 MHz offsets** (10–18.6% memory speed increase), translating to 384–427 GB/s effective bandwidth vs. stock 360 GB/s.

2. **LLM inference gains of 5–15% token-per-second** from memory overclocking, with one community report showing ~0.5 t/s improvement on a quad-3060 system running llama3:70b-instruct-q4_K_M.

3. **Energy efficiency improvement of 12.5% TPM/W** with combined memory and core overclocking (from 0.16 to 0.18 tokens-per-minute-per-Watt).

4. **Linux provides excellent overclocking tooling** — NVML-based tools (`nvidia_oc`, `pynvml`), CLI tools (`nvidia-oc`), GUI apps (LACT, GreenWithEnvy), and kernel-level control (`nvidia-smi`).

5. **The RTX 3060 12GB is power-limited at stock settings** (170W), meaning overclocking gains are constrained by the power limit. Maximum configurable limit is 187W.

## Sub-Topics Covered

- Linux NVIDIA overclocking tools (nvidia-smi, NVML, nvidia-settings, LACT, nvidia_oc, nvidia-oc)
- Memory clock offset mechanics and bandwidth calculations
- LLM inference performance gains and token-per-second benchmarks
- Stability, thermal, and power constraints
- Wayland vs X11 display server considerations
- Core vs memory clock interdependency
- Automation and persistence (systemd, cron, startup scripts)

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

- [llama.cpp CUDA Flags Performance Impact](../llama-cuda-flags-performance/) — covers CUDA flags and GPU memory management for LLM inference
- [llama.cpp Parameters Reference](../llama-cpp-parameters-reference/) — covers GPU offloading and KV cache settings
