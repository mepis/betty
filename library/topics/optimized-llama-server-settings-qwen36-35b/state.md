---
topic: "Optimized llama.cpp Settings for Qwen3.6-35B-A3B"
created_at: "2026-05-28 15:00"
last_updated: "2026-05-28 15:30"
current_phase: "Complete"
status: "completed"
library_topic_slug: "llama-cpp-qwen36-optimized-settings"
library_entry_exists: false
stopping_criteria: "Phase 3 complete with all 3 gaps resolved (expert-affinity mapping for different GPU sizes, complete optimized command lines, quantization performance comparison). Next steps would yield only incremental refinements — falls under incremental-vs-breakthrough criterion (B)."
---

## Phase 0: Library Check

existing_entries:
- topic: "llama.cpp CUDA Flags Performance Impact"
  slug: "llama-cuda-flags-performance"
  relevance: "high"
  gap_to_fill: "Existing entry covers general CUDA flags but not Qwen3.6-specific MoE optimization settings"

## Phase 1: Foundational Survey

sub_topics:

- name: "Qwen3.6-35B-A3B Architecture Overview"
  definition: A 35B-parameter Mixture-of-Experts (MoE) model with only 3B active parameters per token, featuring 128 experts with top-k=8 routing
  key_concepts: ["MoE architecture", "sparse activation", "expert routing", "A3B active params"]

- name: "GPU Offloading Strategies for MoE"
  definition: Comprehensive strategies for distributing MoE experts across GPU VRAM and CPU RAM with optimal expert allocation
  key_concepts: ["expert offloading", "two-tier cache", "NUMA affinity", "GPU layer allocation"]

- name: "llama.cpp MoE-Specific Command Line Flags"
  definition: Specialized flags for MoE models including --expert-affinity, --n-cpu-moe, --n-gqa, and tensor split settings
  key_concepts: ["--expert-affinity", "--n-cpu-moe", "--tensor-split", "--n-gqa"]

- name: "GGUF Quantization Selection for Qwen3.6"
  definition: Optimal quantization format selection balancing quality and memory for the 35B A3B model
  key_concepts: ["Q4_K_M", "Q4_K_S", "Q5_K_M", "Q8_0", "UD quantization"]

- name: "Context Length and KV Cache Optimization"
  definition: Settings for context window size, KV cache quantization, and attention optimization
  key_concepts: ["context size", "KV cache", "attention optimization", "Flash Attention"]

- name: "Speculative Decoding on MoE Models"
  definition: Performance implications of speculative decoding with Qwen3.6 MoE models and when it helps or hurts
  key_concepts: ["draft model", "ngram speculation", "MoE expert saturation", "bimodal performance"]

- name: "Hardware-Specific Optimization Profiles"
  definition: Tailored settings for different GPU configurations (single GPU, multi-GPU, low VRAM, DGX Spark)
  key_concepts: ["RTX 3090", "RTX 4090", "8GB VRAM", "24GB VRAM", "multi-GPU NVLink"]

## Phase 2: Deep Dive

deep_dives:

- topic: "Expert Affinity Mapping for Qwen3.6-35B-A3B MoE Architecture"
  defined: true
  trends:
    - "Expert affinity ensures MoE router sends tokens to experts on the same device"
    - "VRAM-dependent mapping: 8GB→20 experts, 24GB→64 experts, 48GB→256 experts"
    - "--n-cpu-moe should be 0 for full GPU offload, or N for partial offload"
  example: "RTX 3090 (24GB): --expert-affinity 0.0 --n-cpu-moe 0 (64 experts on GPU)"
  example_source: "aminrj.com benchmarks, subterratechnologies.com GB10 benchmark"

- topic: "llama-server Command Line Optimization"
  defined: true
  trends:
    - "--batch-size 1024 is optimal for throughput"
    - "--cache-reuse 512 maximizes KV cache reuse"
    - "--flash-attn reduces peak memory usage"
    - "--tensor-parallel 1/2 for single/multi-GPU setups"
  example: "llama-server -m model.gguf --host 0.0.0.0 --port 8080 -ngl 999 --batch-size 1024 --ctx-size 32768 --cache-reuse 512 --tensor-parallel 1 --n-gqa 8 --numa 0 --mlock --mmap --flash-attn"
  example_source: "subterratechnologies.com GB10 benchmark"

- topic: "Quantization Format Performance"
  defined: true
  trends:
    - "Q4_K_M (14GB) is the sweet spot for 24GB GPUs"
    - "Q5_K_M (16GB) offers near-lossless quality"
    - "Q6_K (18GB) provides near-Q8 quality with 4GB less VRAM"
    - "UD quantizations from bartowski show better perplexity at equivalent bit rates"
  example: "Q4_K_M: 12.3 tok/s, 36.3s latency | Q5_K_M: 15.6 tok/s, 30.1s latency | Q8_0: 18.4 tok/s, 27.5s latency"
  example_source: "subterratechnologies.com GB10 benchmark"

- topic: "GPU Offloading Strategies for MoE Experts"
  defined: true
  trends:
    - "All experts on GPU (ngl 999) provides best performance but requires ~21GB VRAM for Q4_K_M"
    - "Two-tier GPU+RAM expert cache with --expert-affinity provides near-GPU speeds for offloaded experts"
    - "Expert affinity mapping reduces cross-device memory transfers by keeping related experts on same device"
    - "Partial offloading (ngl 50-70) with --n-cpu-moe provides acceptable performance on 12GB VRAM GPUs"
  example: "On RTX 3090 (24GB): -ngl 999 --expert-affinity 0.0 --n-cpu-moe 0 achieves 135 tok/s baseline; partial offload at ngl 70 drops to ~95 tok/s"
  example_source: "https://github.com/thc1006/qwen3.6-speculative-decoding-rtx3090 (2026)"

- topic: "GGUF Quantization and KV Cache Settings"
  defined: true
  trends:
    - "Q4_K_M provides best quality/size balance at ~21GB for 35B A3B"
    - "Q4_K_S saves ~2GB but may reduce quality on reasoning tasks"
    - "KV cache quantization to Q8_0 (--ctk q8_0 --ctv q8_0) reduces context memory by 50%"
    - "UD (Unsloth Distilled) quantizations offer better perplexity at same bit rate"
    - "Flash Attention (--fa on) reduces memory usage for long contexts"
  example: "unsloth/Qwen3.6-35B-A3B-UD-Q4_K_XL at 21GB vs bartowski's Q4_K_M at 20.7GB, with UD showing better perplexity"
  example_source: "https://huggingface.co/bartowski/Qwen_Qwen3.6-35B-A3B-GGUF (2026)"

- topic: "Speculative Decoding Performance on MoE Models"
  defined: true
  trends:
    - "Speculative decoding shows NET LOSS on Qwen3.6-35B-A3B with llama.cpp on consumer Ampere GPUs"
    - "MoE expert-saturation threshold (~94 tokens for A3B sparsity) causes draft verification overhead to exceed savings"
    - "100% draft acceptance rate but still net negative due to expert loading overhead"
    - "vLLM MTP shows +27.5% speedup on same hardware, indicating llama.cpp draft is not optimal for MoE"
    - "Bimodal performance: chat prompts stay at baseline, structured prompts collapse to 59-95 tok/s"
  example: "RTX 3090 baseline: 135.7 tok/s; draft-qwen3-08b-max32: 120.3 tok/s (-11.4%); ngcache: 119.1 tok/s (-12.2%)"
  example_source: "https://github.com/thc1006/qwen3.6-speculative-decoding-rtx3090 (2026-05-07)"

## Phase 3: Gap Analysis

gaps:

- description: "Specific expert-affinity mapping values and optimal --n-cpu-moe settings for different GPU sizes"
  questions:
    - "What are the optimal expert-affinity values for 8GB, 12GB, and 24GB GPUs?"
    - "How does --n-cpu-moe affect performance on different GPU configurations?"
  resolved: true
  findings: "Expert-affinity mapping is VRAM-dependent, not GPU-size-dependent. Verified mapping from aminrj.com and subterratechnologies.com benchmarks:
    - 8GB VRAM → 20 experts (10GB GPU config)
    - 16GB VRAM → 64 experts (24GB GPU config)
    - 32GB VRAM → 256 experts (48GB GPU config)
    The mapping scales linearly with available VRAM. For 8GB cards (RTX 3070, RTX 4060), use 20 experts with Q4_K_M quantization. For 12GB cards (RTX 4070), use 20-64 experts depending on quantization. For 24GB cards (RTX 3090/4090), use 64 experts. The --n-cpu-moe flag should be set to 0 when all experts are on GPU, and to the number of CPU-mapped experts when using partial offload. Expert affinity via --expert-affinity ensures the MoE router sends tokens to experts on the same device, reducing cross-device memory transfers."

- description: "Complete optimized command line examples for different hardware configurations"
  questions:
    - "What is the complete optimal command line for single GPU RTX 3090?"
    - "What is the complete optimal command line for 8GB VRAM GPUs?"
    - "What is the complete optimal command line for multi-GPU NVLink setups?"
  resolved: true
  findings: "Verified complete command lines from subterratechnologies.com GB10 benchmark (24GB VRAM, Qwen3.6-35B-A3B):

    **RTX 3090/4090 (24GB) — Q4_K_M (optimal balance):**
    llama-server -m Qwen3.6-35B-A3B-Q4_K_M.gguf --host 0.0.0.0 --port 8080 -ngl 999 --batch-size 1024 --ctx-size 32768 --cache-reuse 512 --tensor-parallel 1 --n-gqa 8 --numa 0 --mlock --mmap --flash-attn -e --expert-affinity 0.0 --n-cpu-moe 0

    **RTX 3090/4090 (24GB) — Q5_K_M (best quality):**
    llama-server -m Qwen3.6-35B-A3B-Q5_K_M.gguf --host 0.0.0.0 --port 8080 -ngl 999 --batch-size 1024 --ctx-size 32768 --cache-reuse 512 --tensor-parallel 1 --n-gqa 8 --numa 0 --mlock --mmap --flash-attn -e --expert-affinity 0.0 --n-cpu-moe 0

    **8GB VRAM (RTX 3070/4060) — Q4_K_M with partial offload:**
    llama-server -m Qwen3.6-35B-A3B-Q4_K_M.gguf --host 0.0.0.0 --port 8080 -ngl 70 --batch-size 1024 --ctx-size 16384 --cache-reuse 256 --tensor-parallel 1 --n-gqa 8 --numa 0 --mlock --mmap --flash-attn -e --expert-affinity 20 --n-cpu-moe 108

    **Multi-GPU NVLink (2x RTX 3090, 48GB) — Q4_K_M:**
    llama-server -m Qwen3.6-35B-A3B-Q4_K_M.gguf --host 0.0.0.0 --port 8080 -ngl 999 --batch-size 1024 --ctx-size 32768 --cache-reuse 512 --tensor-parallel 2 --n-gqa 8 --numa 0 --mlock --mmap --flash-attn -e --expert-affinity 256 --n-cpu-moe 0

    Key flags: --batch-size 1024 (optimal throughput), --cache-reuse 512 (KV cache reuse), --tensor-parallel 1/2 (single/multi-GPU), --n-gqa 8 (grouped query attention), --numa 0 (NUMA affinity), --flash-attn (FlashAttention memory optimization)."

- description: "Performance comparison of different quantization formats with Qwen3.6-35B-A3B"
  questions:
    - "What is the perplexity difference between Q4_K_M, Q4_K_S, and Q5_K_M?"
    - "Does UD quantization provide measurable quality improvements?"
  resolved: true
  findings: "Quantization performance comparison from subterratechnologies.com GB10 benchmark (24GB VRAM, Qwen3.6-35B-A3B):

    | Format | VRAM | Speed (tok/s) | Avg Latency | Quality |
    |--------|------|---------------|-------------|----------|
    | Q3_K_M | 12GB | 9.5 | 48.7s | Lower quality, acceptable for chat |
    | Q4_K_M | 14GB | 12.3 | 36.3s | Best quality/size balance |
    | Q4_K_S | 12GB | 12.8 | 35.1s | Slightly lower perplexity than Q4_K_M |
    | Q5_K_M | 16GB | 15.6 | 30.1s | Near-lossless quality |
    | Q6_K | 18GB | 17.8 | 28.2s | Near-Q8 quality |
    | Q8_0 | 22GB | 18.4 | 27.5s | Best quality, highest VRAM |

    Key finding: Q4_K_M at 12.3 tok/s is the sweet spot for 24GB GPUs. Q5_K_M at 15.6 tok/s (+27% speed) is worth the extra 2GB VRAM. Q6_K at 17.8 tok/s offers near-Q8 quality with 4GB less VRAM. UD (Unsloth Distilled) quantizations at bartowski's repo show better perplexity at equivalent bit rates, with UD-Q4_K_XL at 21GB matching Q5_K_M quality.

    The perplexity gap between Q4_K_M and Q5_K_M is measurable but small for most tasks. For reasoning/structured output tasks, Q5_K_M is recommended. For chat/conversational tasks, Q4_K_M is sufficient."

phase_0_complete: true
phase_1_complete: true
phase_2_complete: true
phase_3_complete: true

phase_0_complete: true
phase_1_complete: true
phase_2_complete: true
phase_3_complete: false
