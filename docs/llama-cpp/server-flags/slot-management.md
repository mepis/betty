# Slot Management

Multi-user slot configuration, batching, and request handling.

**Tags**: `server`, `cli`, `slots`, `batching`, `multi-user`, `performance`

---

## Slot Configuration

Slots are independent conversation contexts. Each slot can serve a different user or conversation.

### `--slots` / `LLAMA_ARG_N_PARALLEL`
**Type**: `integer`  
**Default**: `1`  
**Description**: Number of parallel slot streams (concurrent conversations).

```bash
# Allow 4 concurrent conversations
llama-server --model model.gguf --slots 4
```

### `--n-ctx` / `LLAMA_ARG_N_CTX`
**Type**: `integer`  
**Default**: model default (typically 4096 or 8192)  
**Description**: Context size per slot (max tokens per conversation).

```bash
# 8192 token context per slot
llama-server --model model.gguf --n-ctx 8192
```

### `--n-max-ctx` / `LLAMA_ARG_N_MAX_CTX`
**Type**: `integer`  
**Default**: `2048`  
**Description**: Maximum total context size across all slots.

```bash
# Allow up to 32768 total context across all slots
llama-server --model model.gguf --n-max-ctx 32768
```

---

## Batching

### `--n-batch` / `LLAMA_ARG_N_BATCH`
**Type**: `integer`  
**Default**: `2048`  
**Description**: Logical batch size (max tokens per batch for prompt processing).

```bash
llama-server --model model.gguf --n-batch 4096
```

### `--n-ubatch` / `LLAMA_ARG_N_UBATCH`
**Type**: `integer`  
**Default**: `512`  
**Description**: Physical batch size (actual GPU/CPU batch size).

```bash
llama-server --model model.gguf --n-ubatch 1024
```

### `--n-predict` / `LLAMA_ARG_N_PREDICT`
**Type**: `integer`  
**Default**: `-1` (unlimited)  
**Description**: Maximum number of tokens to predict per request.

```bash
# Limit to 1024 generated tokens per request
llama-server --model model.gguf --n-predict 1024
```

---

## Slot Behavior

### `--keepalive` / `LLAMA_ARG_KEEPALIVE`
**Type**: `string`  
**Default**: `5m`  
**Description**: Slot keep-alive duration. Format: `<number><unit>` where unit is `s` (seconds), `m` (minutes), `h` (hours).

```bash
# Keep slots alive for 30 minutes
llama-server --model model.gguf --keepalive 30m
```

### `--mlock` / `LLAMA_ARG_MLOCK`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Force system to keep model in RAM (mlock). Prevents swapping.

```bash
llama-server --model model.gguf --mlock
```

### `--mmap` / `LLAMA_ARG_MMAP`
**Type**: `boolean`  
**Default**: `true`  
**Description**: Use memory-mapped I/O for model loading. Faster loading, uses virtual memory.

```bash
# Disable mmap (loads entirely into RAM)
llama-server --model model.gguf --no-mmap
```

---

## Prompt Processing

### `--cont-batching` / `LLAMA_ARG_CONT_BATCHING`
**Type**: `boolean`  
**Default**: `true`  
**Description**: Enable continuous batching. Allows interleaving prompt processing and generation across slots.

```bash
# Disable continuous batching (simpler, may be slower)
llama-server --model model.gguf --no-cont-batching
```

### `--cache-type-k` / `LLAMA_ARG_CACHE_TYPE_K`
**Type**: `string`  
**Default**: `f16`  
**Description**: KV cache type for keys. Affects memory usage and precision.

| Value | Memory | Precision |
|-------|--------|-----------|
| `f32` | 2x | Highest |
| `f16` | 1x | High (default) |
| `q8_0` | 0.5x | Good |
| `q4_0` | 0.25x | Lower |

### `--cache-type-v` / `LLAMA_ARG_CACHE_TYPE_V`
**Type**: `string`  
**Default**: `f16`  
**Description**: KV cache type for values. Same options as `--cache-type-k`.

---

## Memory Planning

### Recommended Settings by Use Case

#### Single User, Long Context
```bash
llama-server --model model.gguf \
  --n-ctx 16384 \
  --n-batch 4096 \
  --n-ubatch 1024 \
  --slots 1
```

#### Multi-User, Short Conversations
```bash
llama-server --model model.gguf \
  --n-ctx 4096 \
  --n-batch 2048 \
  --n-ubatch 512 \
  --slots 8 \
  --keepalive 10m
```

#### GPU-Bound, Max Throughput
```bash
llama-server --model model.gguf \
  --n-gpu-layers 999 \
  --n-batch 8192 \
  --n-ubatch 2048 \
  --flash-attn \
  --slots 4
```

---

## See Also

- [[llama-cpp/server-flags/context-and-attention\|Context & Attention]] — Context and KV cache details
- [[llama-cpp/server-flags/gpu-and-backends\|GPU & Backends]] — GPU offload configuration
- [[llama-cpp/server-flags/flags-reference\|Flags Reference]] — Complete flag table
