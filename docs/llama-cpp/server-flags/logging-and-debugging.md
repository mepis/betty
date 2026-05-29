# Logging & Debugging

Verbosity, timing, cache, trace, and debug flags.

**Tags**: `server`, `cli`, `logging`, `debug`, `timing`, `trace`, `verbose`

---

## Verbosity

### `--verbose` / `LLAMA_ARG_VERBOSE`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Enable verbose output. Shows detailed information during startup and operation.

```bash
llama-server --model model.gguf --verbose
```

### `--log-file` / `LLAMA_ARG_LOG_FILE`
**Type**: `string`  
**Description**: Path to log file for persistent logging.

```bash
llama-server --model model.gguf --log-file /var/log/llama-server.log
```

---

## Timing

### `--verbose-prompt` / `LLAMA_ARG_VERBOSE_PROMPT`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Print prompt processing timing information.

```bash
llama-server --model model.gguf --verbose-prompt
```

### `--verbose-cache` / `LLAMA_ARG_VERBOSE_CACHE`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Print KV cache usage statistics.

```bash
llama-server --model model.gguf --verbose-cache
```

### `--verbose-chat` / `LLAMA_ARG_VERBOSE_CHAT`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Print chat template processing details.

```bash
llama-server --model model.gguf --verbose-chat
```

---

## Cache Debugging

### `--cache-type-k` / `LLAMA_ARG_CACHE_TYPE_K`
**Type**: `string`  
**Default**: `f16`  
**Description**: KV cache type for keys. Useful for debugging memory usage.

### `--cache-type-v` / `LLAMA_ARG_CACHE_TYPE_V`
**Type**: `string`  
**Default**: `f16`  
**Description**: KV cache type for values.

### `--cache-reuse` / `LLAMA_ARG_CACHE_REUSE`
**Type**: `integer`  
**Default**: `80`  
**Description**: Cache reuse threshold percentage.

---

## Debug Flags

### `--debug` / `LLAMA_ARG_DEBUG`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Enable debug-level logging. Shows internal state and detailed operations.

```bash
llama-server --model model.gguf --debug
```

### `--trace` / `LLAMA_ARG_TRACE`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Enable trace-level logging. Most verbose logging level.

```bash
llama-server --model model.gguf --trace
```

### `--model-params-cache` / `LLAMA_ARG_MODEL_PARAMS_CACHE`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Cache model parameters for faster reload.

---

## Model Information

### `--verbose` / `LLAMA_ARG_VERBOSE`
**Type**: `boolean`  
**Default**: `false`  
**Description**: When enabled, prints detailed model information at startup:
- Model architecture
- Layer count
- Vocabulary size
- Context size
- Quantization type
- Memory usage

```
llama-server --model model.gguf --verbose

llama.cpp: loading model
llama.cpp: model architecture = llama
llama.cpp: model type = 7B
llama.cpp: model params = 7.24B
llama.cpp: vocab type = bpe
llama.cpp: vocab size = 32000
llama.cpp: context size = 4096
llama.cpp: general quant type = q4_0
llama.cpp: model memory = 4.20 GB
```

---

## See Also

- [[llama-cpp/server-flags/context-and-attention\|Context & Attention]] — KV cache settings
- [[llama-cpp/server-flags/advanced-and-experimental\|Advanced & Experimental]] — Advanced debugging
- [[llama-cpp/server-flags/flags-reference\|Flags Reference]] — Complete flag table
