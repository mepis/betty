---
tags: [configuration, json, schema, reference]
---

# Configuration Reference

All benchmark configuration is stored in `src/backend/configs.json`. This file is auto-generated and managed by the [[config]] page, but can be edited manually.

See also: [[USER-MANUAL]]

## configs.json

```json
{
  "export_configs": {
    "GGML_CUDA_ENABLE_UNIFIED_MEMORY": "1",
    "CUDA_SCALE_LAUNCH_QUEUES": "4x",
    "LLAMA_CACHE": "llama_cache",
    "GGML_CUDA_P2P": "on",
    "LLAMA_ARG_FIT": "on",
    "LLAMA_ARG_FIT_TARGET": "256",
    "LLAMA_ARG_FIT_CTX": "131072"
  },
  "max_sys_mem": 93,
  "llama_port": 11434,
  "llama_host": "localhost",
  "model": "path/to/model.gguf",
  "model_directory": "~/.betty/models",
  "llama_cache": "llama_cache",
  "gpu_selection": {
    "enabled": false,
    "gpus": [0]
  },
  "split_params": {
    "layer_split": { "enabled": false, "value": "layer" },
    "tensor_split": { "enabled": false, "value": "16,12,12" },
    "primary_gpu": { "enabled": false, "value": 0 }
  },
  "spec_params": {
    "spec_type": { "enabled": false, "value": "draft-mtp" },
    "spec_draft_n_max": { "enabled": false, "value": 3 }
  },
  "build_cores": 14,
  "skip_build": true,
  "build_make_params": {
    "enable_ccache": "1",
    "enable_lto": "1",
    "enable_cuda": "1",
    "enable_cuda_fa": "1",
    "enable_cuda_graphs": false,
    "enable_cuda_nccl": "1",
    "enable_cuda_per_max_batch_size": "1",
    "peer_batch_size": "512",
    "enable_cuda_peer_copy": "1",
    "enable_cuda_custom_arch": false,
    "enable_cuda_fa_all_quants": "1",
    "cuda_all_quants": "1",
    "enable_cuda_fp16": false,
    "enable_cuda_scheduled_max_copies": "1",
    "cuda_max_scheduled_copies": 10,
    "enable_cuda_compression_level": false,
    "enable_ggml_cuda_force_mmq": false,
    "enable_ggml_native": true
  },
  "cuda_configs": {
    "cuda_version": "13.3",
    "cudacxx": "/usr/local/cuda-13.2/bin/nvcc"
  },
  "model_configs": {
    "temp": 0.6,
    "top_p": 0.95,
    "min_p": 0,
    "top_k": 20
  },
  "server_params": {
    "cont_batching": true,
    "flash_attn": { "enabled": true, "value": 1 },
    "reasoning": { "enabled": true, "value": 1 },
    "profiling": true,
    "presence_penalty": { "enabled": true, "value": 0 },
    "reasoning_budget": { "enabled": true, "value": 2048 },
    "reasoning_budget_message": { "enabled": true, "value": "Proceed to final answer." },
    "rope_scaling": { "enabled": true, "value": "yarn" },
    "jinja": false,
    "parallel": { "enabled": true, "value": 1 },
    "n_predict": { "enabled": false, "value": 512 },
    "n_keep": { "enabled": false, "value": 0 },
    "stream": { "enabled": true, "value": false },
    "cache_prompt": { "enabled": true, "value": true },
    "gpu_layers": { "enabled": true, "value": 999 }
  },
  "benchmark_messages": [
    "Develop a design doc for a self-hosted tetris clone web-based game.",
    "Audit the design doc.",
    "Recommend optimizations.",
    "Create a social-media marketing campaign for it."
  ],
  "test_params": {
    "context_length": 32768,
    "context_length_multiplier": 2,
    "context_length_max": 262144,
    "gpu_layer_offload": 999,
    "gpu_layer_offload_step": 0,
    "gpu_layer_off_max": 999,
    "batch_size": 128,
    "batch_size_step": 128,
    "batch_size_max": 16384,
    "u_batch_size": 64,
    "u_batch_size_step": 64,
    "u_batch_size_max": 4096,
    "cache_ram": 4096,
    "cache_ram_step": 1024,
    "cache_ram_max": 4096
  }
}
```

## Benchmark Flow

```
1. Build (optional)
   ├── Clone/pull llama.cpp repo
   ├── Run cmake with configured flags
   └── Run make with configured cores

2. Benchmark Run
   ├── Start llama-server with model and server params
   ├── For each test parameter combination:
   │   ├── Send benchmark messages sequentially
   │   ├── Accumulate context with each message
   │   └── Record tokens/s, time, and memory
   └── Stop llama-server

3. Results
   └── Streamed via SSE to the frontend
```
