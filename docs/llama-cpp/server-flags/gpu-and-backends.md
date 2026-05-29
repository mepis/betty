# GPU & Backends

GPU layer offload, tensor splits, backend selection, and GPU memory management.

**Tags**: `server`, `cli`, `gpu`, `cuda`, `offload`, `tensor-split`, `vram`

---

## GPU Layer Offload

### `--n-gpu-layers` / `LLAMA_ARG_N_GPU_LAYERS`
**Type**: `integer`  
**Default**: `0` (CPU only)  
**Description**: Number of model layers to offload to GPU. `999` = all layers.

```bash
# Offload all layers to GPU
llama-server --model model.gguf --n-gpu-layers 999

# Offload half the layers
llama-server --model model.gguf --n-gpu-layers 16
```

> **Note**: More layers on GPU = faster inference but more VRAM usage. The tokenizer and final projection typically remain on CPU.

### `--tensor-split` / `LLAMA_ARG_tensor_split`
**Type**: `string`  
**Default**: empty (single GPU)  
**Description**: Split tensor across multiple GPUs. Comma-separated ratios.

```bash
# Split evenly across 2 GPUs
llama-server --model model.gguf --n-gpu-layers 999 --tensor-split 50,50

# Split across 4 GPUs (75% on first, rest shared)
llama-server --model model.gguf --n-gpu-layers 999 --tensor-split 75,8,8,8
```

### `--devices` / `LLAMA_ARG_DEVICES`
**Type**: `string`  
**Default**: empty (auto-detect)  
**Description**: Comma-separated list of device IDs to use.

```bash
# Use specific GPU
llama-server --model model.gguf --devices 1

# Use GPUs 0 and 2
llama-server --model model.gguf --devices 0,2
```

---

## GPU Memory Management

### `--gpu-layers` / `LLAMA_ARG_gpu_layers`
**Type**: `integer`  
**Default**: `0`  
**Description**: Alias for `--n-gpu-layers`.

### `--no-mmap` / `LLAMA_ARG_NO_MMAP`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Disable memory-mapped I/O. Loads model entirely into RAM/VRAM.

```bash
# Force full load into memory (faster access, more RAM)
llama-server --model model.gguf --no-mmap
```

### `--mlock` / `LLAMA_ARG_MLOCK`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Lock model in RAM. Prevents swapping to disk.

```bash
llama-server --model model.gguf --mlock
```

---

## Backend Selection

### `--devices` / `LLAMA_ARG_DEVICES`
**Type**: `string`  
**Description**: Specify backend devices. Format depends on backend.

```bash
# CUDA device 0
llama-server --model model.gguf --devices cuda:0

# Multiple devices
llama-server --model model.gguf --devices cuda:0,cuda:1
```

---

## Vulkan-Specific

### `--vulkan-size` / `LLAMA_ARG_VULKAN_SIZE`
**Type**: `integer`  
**Default**: `0`  
**Description**: Vulkan compute pool size. `0` = auto.

### `--vulkan-allocator` / `LLAMA_ARG_VULKAN_ALLOCATOR`
**Type**: `string`  
**Default**: `std`  
**Options**: `std`, `arena`, `linear`  
**Description**: Vulkan memory allocator strategy.

```bash
llama-server --model model.gguf --vulkan-allocator arena
```

---

## GPU Memory Planning

### VRAM Usage Estimation

```
Model VRAM ≈ model_size_bytes * (n_gpu_layers / total_layers)
KV Cache VRAM ≈ n_ctx * n_layer * n_head * head_size * 2 * cache_type_bytes
```

For a 7B Q4_K_M model (~4GB):
- All layers on GPU: ~4GB model + KV cache
- Half layers on GPU: ~2GB model + partial KV cache

### Troubleshooting OOM

```bash
# Reduce VRAM usage
llama-server --model model.gguf \
  --n-gpu-layers 20 \
  --cache-type-k q8_0 \
  --cache-type-v q8_0 \
  --n-ctx 4096
```

---

## See Also

- [[llama-cpp/build-options/backend-options\|Backend Options]] — Build-time GPU configuration
- [[llama-cpp/server-flags/context-and-attention\|Context & Attention]] — KV cache settings
- [[llama-cpp/server-flags/flags-reference\|Flags Reference]] — Complete flag table
