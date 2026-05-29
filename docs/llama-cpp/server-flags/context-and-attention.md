# Context & Attention

Context length, flash attention, RoPE scaling, KV cache, and attention configuration.

**Tags**: `server`, `cli`, `context`, `attention`, `rope`, `kv-cache`, `flash-attention`

---

## Context Size

### `--n-ctx` / `LLAMA_ARG_N_CTX`
**Type**: `integer`  
**Default**: model default  
**Description**: Context size (number of tokens). Determines how much conversation history the model can remember.

```bash
llama-server --model model.gguf --n-ctx 8192
```

### `--n-max-ctx` / `LLAMA_ARG_N_MAX_CTX`
**Type**: `integer`  
**Default**: `2048`  
**Description**: Maximum total context size. Used with multiple slots to limit total memory.

### `--n-prompt-predict` / `LLAMA_ARG_N_PROMPT_PREDICT`
**Type**: `integer`  
**Default**: `-1` (disabled)  
**Description**: Number of tokens to predict during prompt processing (for speculative decoding).

---

## Flash Attention

### `--flash-attn` / `LLAMA_ARG_FLASH_ATTN`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Enable Flash Attention. Reduces memory usage and improves speed for long contexts.

```bash
llama-server --model model.gguf --flash-attn --n-ctx 16384
```

> **Note**: Flash attention requires sufficient GPU memory and is only available with GPU backends (CUDA, Vulkan, etc.).

---

## RoPE (Rotary Position Embedding)

### `--n-yarn-orig-ctx` / `LLAMA_ARG_N_YARN_ORIG_CTX`
**Type**: `integer`  
**Default**: `0` (disabled)  
**Description**: Original context size for YaRN (Yet another RoPE) scaling. Enables context extension beyond training length.

### `--yarn-ext-factor` / `LLAMA_ARG_YARN_EXT_FACTOR`
**Type**: `float`  
**Default**: `-1.0`  
**Description**: YaRN extension factor. Controls how much to extend the context.

### `--yarn-attn-factor` / `LLAMA_ARG_YARN_ATTN_FACTOR`
**Type**: `float`  
**Default**: `1.0`  
**Description**: YaRN attention factor. Scales attention weights for extended context.

### `--yarn-beta-fast` / `LLAMA_ARG_YARN_BETA_FAST`
**Type**: `float`  
**Default**: `32.0`  
**Description**: YaRN beta fast. Controls interpolation for short positions.

### `--yarn-beta-slow` / `LLAMA_ARG_YARN_BETA_SLOW`
**Type**: `float`  
**Default**: `1.0`  
**Description**: YaRN beta slow. Controls interpolation for long positions.

### `--rope-scaling` / `LLAMA_ARG_ROPE_SCALING`
**Type**: `string`  
**Default**: model default  
**Options**: `none`, `linear`, `yarn`, `dynamic`  
**Description**: RoPE scaling strategy for context extension.

### `--rope-freq-base` / `LLAMA_ARG_ROPE_FREQ_BASE`
**Type**: `float`  
**Default**: model default  
**Description**: RoPE base frequency. Affects position encoding.

### `--rope-freq-scale` / `LLAMA_ARG_ROPE_FREQ_SCALE`
**Type**: `float`  
**Default**: model default  
**Description**: RoPE frequency scale. `0` = auto-detect from model.

---

## KV Cache

### `--cache-type-k` / `LLAMA_ARG_CACHE_TYPE_K`
**Type**: `string`  
**Default**: `f16`  
**Description**: KV cache data type for keys.

| Value | Memory per token | Notes |
|-------|-----------------|-------|
| `f32` | 4 bytes | Highest precision, most memory |
| `f16` | 2 bytes | Good balance (default) |
| `q8_0` | 1 byte | Good quality, half memory |
| `q4_0` | 0.5 bytes | Lowest memory, some quality loss |

### `--cache-type-v` / `LLAMA_ARG_CACHE_TYPE_V`
**Type**: `string`  
**Default**: `f16`  
**Description**: KV cache data type for values. Same options as `--cache-type-k`.

### `--cache-reuse` / `LLAMA_ARG_CACHE_REUSE`
**Type**: `integer`  
**Default**: `80`  
**Description**: Minimum cache match percentage to reuse a slot. Higher = stricter matching.

---

## Batching

### `--n-batch` / `LLAMA_ARG_N_BATCH`
**Type**: `integer`  
**Default**: `2048`  
**Description**: Logical batch size for prompt processing. Larger = faster prefill but more memory.

### `--n-ubatch` / `LLAMA_ARG_N_UBATCH`
**Type**: `integer`  
**Default**: `512`  
**Description**: Physical batch size. Actual GPU/CPU batch size.

### `--n-predict` / `LLAMA_ARG_N_PREDICT`
**Type**: `integer`  
**Default**: `-1` (unlimited)  
**Description**: Max tokens to predict per request.

---

## Attention Memory Planning

### Memory Usage Formula

Approximate KV cache memory per slot:

```
KV cache (bytes) = n_ctx * n_layer * n_head * head_size * cache_type_bytes * 2
```

For a 7B model with 32 layers, 32 heads, 128 head size, f16 cache, 8192 context:

```
8192 * 32 * 32 * 128 * 2 * 2 = ~429 MB per slot
```

### Recommended Settings

#### Long Context (32K+)
```bash
llama-server --model model.gguf \
  --n-ctx 32768 \
  --flash-attn \
  --cache-type-k q8_0 \
  --cache-type-v q8_0 \
  --n-batch 8192
```

#### Memory-Constrained
```bash
llama-server --model model.gguf \
  --n-ctx 4096 \
  --cache-type-k q4_0 \
  --cache-type-v q4_0 \
  --n-batch 1024
```

#### High Performance
```bash
llama-server --model model.gguf \
  --n-ctx 16384 \
  --flash-attn \
  --cache-type-k f16 \
  --cache-type-v f16 \
  --n-batch 4096 \
  --n-ubatch 2048
```

---

## See Also

- [[llama-cpp/server-flags/slot-management\|Slot Management]] — Multi-user slot configuration
- [[llama-cpp/server-flags/gpu-and-backends\|GPU & Backends]] — GPU offload for attention
- [[llama-cpp/server-flags/flags-reference\|Flags Reference]] — Complete flag table
