# Server Flags Reference

Complete table of every `--flag` and corresponding `LLAMA_ARG_*` environment variable.

**Tags**: `server`, `cli`, `reference`, `complete-list`, `environment-variables`

---

## Model & Path

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--model` | `LLAMA_ARG_MODEL` | string | (required) | Path to model file |
| `--alias` | `LLAMA_ARG_MODEL_ALIAS` | string | filename | Model display name |
| `--mmproj` | `LLAMA_ARG_MM_PROJ` | string | — | Multimodal projector path |
| `--control-vector` | `LLAMA_ARG_CONTROL_VECTOR` | string | — | Control vector file (repeatable) |

## Server Host & Port

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--host` | `LLAMA_ARG_HOST` | string | `127.0.0.1` | Server bind address |
| `--port` | `LLAMA_ARG_PORT` | int | `8080` | Server port |
| `--path` | `LLAMA_ARG_PATH` | string | `/` | API base path |
| `--api-key` | `LLAMA_ARG_API_KEY` | string | — | API authentication key |
| `--api-key-file` | `LLAMA_ARG_API_KEY_FILE` | string | — | Path to API key file |
| `--simple-io` | `LLAMA_ARG_SIMPLE_IO` | bool | `false` | Simplified I/O mode |

## Threads & Batching

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--threads` | `LLAMA_ARG_N_THREADS` | int | auto | Generation thread count |
| `--threads-batch` | `LLAMA_ARG_N_THREADS_BATCH` | int | same as threads | Prefill thread count |
| `--n-batch` | `LLAMA_ARG_N_BATCH` | int | `2048` | Logical batch size |
| `--n-ubatch` | `LLAMA_ARG_N_UBATCH` | int | `512` | Physical batch size |
| `--n-predict` | `LLAMA_ARG_N_PREDICT` | int | `-1` | Max tokens per request |
| `--cont-batching` | `LLAMA_ARG_CONT_BATCHING` | bool | `true` | Continuous batching |

## Context & Attention

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--n-ctx` | `LLAMA_ARG_N_CTX` | int | model default | Context size per slot |
| `--n-max-ctx` | `LLAMA_ARG_N_MAX_CTX` | int | `2048` | Max total context |
| `--flash-attn` | `LLAMA_ARG_FLASH_ATTN` | bool | `false` | Enable Flash Attention |
| `--rope-scaling` | `LLAMA_ARG_ROPE_SCALING` | string | model default | RoPE scaling: none/linear/yarn/dynamic |
| `--rope-freq-base` | `LLAMA_ARG_ROPE_FREQ_BASE` | float | model default | RoPE base frequency |
| `--rope-freq-scale` | `LLAMA_ARG_ROPE_FREQ_SCALE` | float | model default | RoPE frequency scale |
| `--n-yarn-orig-ctx` | `LLAMA_ARG_N_YARN_ORIG_CTX` | int | `0` | YaRN original context |
| `--yarn-ext-factor` | `LLAMA_ARG_YARN_EXT_FACTOR` | float | `-1.0` | YaRN extension factor |
| `--yarn-attn-factor` | `LLAMA_ARG_YARN_ATTN_FACTOR` | float | `1.0` | YaRN attention factor |
| `--yarn-beta-fast` | `LLAMA_ARG_YARN_BETA_FAST` | float | `32.0` | YaRN beta fast |
| `--yarn-beta-slow` | `LLAMA_ARG_YARN_BETA_SLOW` | float | `1.0` | YaRN beta slow |

## KV Cache

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--cache-type-k` | `LLAMA_ARG_CACHE_TYPE_K` | string | `f16` | KV cache type for keys |
| `--cache-type-v` | `LLAMA_ARG_CACHE_TYPE_V` | string | `f16` | KV cache type for values |
| `--cache-reuse` | `LLAMA_ARG_CACHE_REUSE` | int | `80` | Cache reuse threshold (%) |

## Slots & Parallelism

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--slots` | `LLAMA_ARG_N_PARALLEL` | int | `1` | Number of parallel slots |
| `--keepalive` | `LLAMA_ARG_KEEPALIVE` | string | `5m` | Slot keep-alive duration |

## GPU & Backends

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--n-gpu-layers` | `LLAMA_ARG_N_GPU_LAYERS` | int | `0` | Layers to offload to GPU |
| `--tensor-split` | `LLAMA_ARG_TENSOR_SPLIT` | string | — | GPU tensor split ratios |
| `--devices` | `LLAMA_ARG_DEVICES` | string | — | Device IDs |
| `--vulkan-size` | `LLAMA_ARG_VULKAN_SIZE` | int | `0` | Vulkan compute pool size |
| `--vulkan-allocator` | `LLAMA_ARG_VULKAN_ALLOCATOR` | string | `std` | Vulkan allocator: std/arena/linear |

## Memory

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--mmap` | `LLAMA_ARG_MMAP` | bool | `true` | Use memory-mapped I/O |
| `--mlock` | `LLAMA_ARG_MLOCK` | bool | `false` | Lock model in RAM |
| `--no-mmap` | `LLAMA_ARG_NO_MMAP` | bool | `false` | Disable mmap |

## Sampling

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--temp` | `LLAMA_ARG_TEMP` | float | `0.8` | Temperature |
| `--top-k` | `LLAMA_ARG_TOP_K` | int | `40` | Top-K sampling |
| `--top-p` | `LLAMA_ARG_TOP_P` | float | `0.9` | Top-p (nucleus) sampling |
| `--min-p` | `LLAMA_ARG_MIN_P` | float | `0.05` | Min-p sampling |
| `--typ-p` | `LLAMA_ARG_TYP_P` | float | `1.0` | Tail-free sampling |
| `--dynatemp-range` | `LLAMA_ARG_DYNATEMP_RANGE` | float | `0.0` | Dynamic temp range |
| `--dynatemp-exponent` | `LLAMA_ARG_DYNATEMP_EXP` | float | `1.0` | Dynamic temp exponent |
| `--repeat-last-n` | `LLAMA_ARG_REPEAT_LAST_N` | int | `64` | Repetition window |
| `--repeat-penalty` | `LLAMA_ARG_REPEAT_PENALTY` | float | `1.1` | Repetition penalty |
| `--presence-penalty` | `LLAMA_ARG_PRESENCE_PENALTY` | float | `0.0` | Presence penalty |
| `--frequency-penalty` | `LLAMA_ARG_FREQUENCY_PENALTY` | float | `0.0` | Frequency penalty |
| `--penalize-nl` | `LLAMA_ARG_PENALIZE_NL` | bool | `true` | Penalize newlines |
| `--seed` | `LLAMA_ARG_SEED` | int | random | Random seed |
| `--mirostat` | `LLAMA_ARG_MIROSTAT` | int | `0` | Mirostat: 0/1/2 |
| `--mirostat-learn` | `LLAMA_ARG_MIROSTAT_LEARN` | float | `0.1` | Mirostat learning rate |
| `--mirostat-tau` | `LLAMA_ARG_MIROSTAT_TAU` | float | `5.0` | Mirostat target perplexity |

## DRY (Don't Repeat Yourself)

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--dry-multiplier` | `LLAMA_ARG_DRY_MULTIPLIER` | float | `0.0` | DRY penalty strength |
| `--dry-base` | `LLAMA_ARG_DRY_BASE` | float | `1.75` | DRY base value |
| `--dry-allowed-length` | `LLAMA_ARG_DRY_ALLOWED_LENGTH` | int | `2` | DRY allowed length |
| `--dry-penalty-last-n` | `LLAMA_ARG_DRY_PENALTY_LAST_N` | int | `-1` | DRY window |
| `--dry-sequences` | `LLAMA_ARG_DRY_SEQUENCE` | string | — | DRY sequences (repeatable) |

## Grammar & JSON

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--grammar` | `LLAMA_ARG_GRAMMAR` | string | — | GBNF grammar constraint |
| `--json-schema` | `LLAMA_ARG_JSON_SCHEMA` | string | — | JSON schema constraint |
| `--jinja` | `LLAMA_ARG_JINJA` | bool | `false` | Enable Jinja2 templates |

## Chat Templates

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--chat-template` | `LLAMA_ARG_CHAT_TEMPLATE` | string | — | Chat template string |
| `--chat-template-file` | `LLAMA_ARG_CHAT_TEMPLATE_FILE` | string | — | Chat template file path |

## Embeddings

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--embedding` | `LLAMA_ARG_EMBEDDING` | bool | `false` | Enable embedding mode |
| `--batched-embeddings` | `LLAMA_ARG_BATCHED_EMBEDDINGS` | bool | `false` | Batched embedding processing |
| `--parallel` | `LLAMA_ARG_N_PARALLEL` | int | `1` | Parallel embedding streams |

## Multimodal

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--mmproj` | `LLAMA_ARG_MM_PROJ` | string | — | Multimodal projector path |
| `--mm-batch-size` | `LLAMA_ARG_MM_BATCH_SIZE` | int | `8` | Multimodal batch size |

## Speculative Decoding

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--speculative` | `LLAMA_ARG_SPECULATIVE` | int | `0` | Speculative token count |
| `--spec-draft` | `LLAMA_ARG_SPEC_DRAFT` | string | — | Draft model path |
| `--spec-probs` | `LLAMA_ARG_SPEC_PROBS` | bool | `false` | Return spec probabilities |

## Logging & Debugging

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--verbose` | `LLAMA_ARG_VERBOSE` | bool | `false` | Verbose output |
| `--verbose-prompt` | `LLAMA_ARG_VERBOSE_PROMPT` | bool | `false` | Prompt timing |
| `--verbose-cache` | `LLAMA_ARG_VERBOSE_CACHE` | bool | `false` | Cache statistics |
| `--verbose-chat` | `LLAMA_ARG_VERBOSE_CHAT` | bool | `false` | Chat template details |
| `--log-file` | `LLAMA_ARG_LOG_FILE` | string | — | Log file path |
| `--debug` | `LLAMA_ARG_DEBUG` | bool | `false` | Debug-level logging |
| `--trace` | `LLAMA_ARG_TRACE` | bool | `false` | Trace-level logging |

## Model Parameters

| CLI Flag | Environment Variable | Type | Default | Description |
|----------|---------------------|------|---------|-------------|
| `--model-params-cache` | `LLAMA_ARG_MODEL_PARAMS_CACHE` | bool | `false` | Cache model parameters |

---

## Boolean Flag Negation

All boolean flags can be negated with `--no-` prefix:

```bash
--flash-attn    # Enable
--no-flash-attn # Disable

--mmap          # Enable (default)
--no-mmap       # Disable

--cont-batching # Enable (default)
--no-cont-batching # Disable
```

---

## See Also

- [[llama-cpp/server-flags/usage-and-model\|Usage & Model]] — Model loading and server setup
- [[llama-cpp/server-flags/sampling-params\|Sampling Parameters]] — Temperature, top_k, top_p
- [[llama-cpp/server-flags/context-and-attention\|Context & Attention]] — Context and attention settings
- [[llama-cpp/build-options/build-flags-reference\|Build Flags Reference]] — CMake build flags
