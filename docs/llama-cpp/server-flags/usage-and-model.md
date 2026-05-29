# Usage & Model Flags

Model loading, server host/port, and basic usage configuration.

**Tags**: `server`, `cli`, `model`, `host`, `port`, `configuration`

---

## Model Loading

### `--model` / `LLAMA_ARG_MODEL`
**Type**: `string` (required)  
**Description**: Path to the model file (GGUF format). This is the only required argument.

```bash
llama-server --model /path/to/model.gguf
```

### `--alias` / `LLAMA_ARG_MODEL_ALIAS`
**Type**: `string`  
**Default**: model filename  
**Description**: Display name for the model in the API response.

```bash
llama-server --model model.gguf --alias "My Custom Model"
```

### `--mmproj` / `LLAMA_ARG_MM_PROJ`
**Type**: `string`  
**Description**: Path to a multimodal projector file (for vision models like LLaVA).

```bash
llama-server --model llava.gguf --mmproj llava-mmproj.gguf
```

### `--control-vector` / `LLAMA_ARG_CONTROL_VECTOR`
**Type**: `string` (repeatable)  
**Description**: Path to a control vector file. Can be specified multiple times.

```bash
llama-server --model model.gguf --control-vector cv1.bin --control-vector cv2.bin
```

---

## Server Host & Port

### `--host` / `LLAMA_ARG_HOST`
**Type**: `string`  
**Default**: `127.0.0.1`  
**Description**: Host address to bind the server to.

```bash
# Listen on all interfaces
llama-server --model model.gguf --host 0.0.0.0
```

### `--port` / `LLAMA_ARG_PORT`
**Type**: `integer`  
**Default**: `8080`  
**Description**: Port number for the HTTP server.

```bash
llama-server --model model.gguf --port 3000
```

### `--path` / `LLAMA_ARG_PATH`
**Type**: `string`  
**Default**: `/`  
**Description**: Base path for the API (URL prefix).

```bash
# API will be at /api/v1/...
llama-server --model model.gguf --path /api/v1
```

---

## Thread Configuration

### `--threads` / `LLAMA_ARG_N_THREADS`
**Type**: `integer`  
**Default**: hardware-dependent  
**Description**: Number of threads to use for generation.

```bash
llama-server --model model.gguf --threads 8
```

### `--threads-batch` / `LLAMA_ARG_N_THREADS_BATCH`
**Type**: `integer`  
**Default**: same as `--threads`  
**Description**: Number of threads to use for prompt processing (prefill).

```bash
llama-server --model model.gguf --threads 4 --threads-batch 8
```

---

## Cache Configuration

### `--cache-type-k` / `LLAMA_ARG_CACHE_TYPE_K`
**Type**: `string`  
**Default**: `f16`  
**Description**: KV cache data type for keys. Options: `f16`, `f32`, `q8_0`, `q4_0`.

### `--cache-type-v` / `LLAMA_ARG_CACHE_TYPE_V`
**Type**: `string`  
**Default**: `f16`  
**Description**: KV cache data type for values. Options: `f16`, `f32`, `q8_0`, `q4_0`.

### `--cache-reuse` / `LLAMA_ARG_CACHE_REUSE`
**Type**: `integer`  
**Default**: `80` (percent)  
**Description**: Minimum cache match percentage to reuse a slot.

---

## Logging

### `--log-file` / `LLAMA_ARG_LOG_FILE`
**Type**: `string`  
**Description**: Path to log file for persistent logging.

```bash
llama-server --model model.gguf --log-file /var/log/llama.log
```

---

## Model Parameters Override

### `--model-params-cache` / `LLAMA_ARG_MODEL_PARAMS_CACHE`
**Type**: `boolean`  
**Description**: Cache model parameters to avoid re-parsing.

### `--ctx-size` / `--n_ctx` / `LLAMA_ARG_N_CTX`
**Type**: `integer`  
**Default**: model default  
**Description**: Context size (number of tokens).

```bash
llama-server --model model.gguf --ctx-size 8192
```

---

## See Also

- [[llama-cpp/server-flags/slot-management\|Slot Management]] — Multi-user slot configuration
- [[llama-cpp/server-flags/context-and-attention\|Context & Attention]] — Context and KV cache
- [[llama-cpp/server-flags/flags-reference\|Flags Reference]] — Complete flag table
