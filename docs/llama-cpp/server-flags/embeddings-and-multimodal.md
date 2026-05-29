# Embeddings & Multimodal

Embedding mode, image projection (mmproj), batched embeddings, and multimodal models.

**Tags**: `server`, `cli`, `embedding`, `multimodal`, `vision`, `mmproj`

---

## Embedding Mode

### `--embedding` / `LLAMA_ARG_EMBEDDING`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Enable embedding mode. Returns vector embeddings instead of text generation.

```bash
llama-server --model model.gguf --embedding
```

In embedding mode, the `/embeddings` endpoint returns dense vector representations of input text.

### `--batched-embeddings` / `LLAMA_ARG_BATCHED_EMBEDDINGS`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Process embeddings in batches for improved throughput.

```bash
llama-server --model model.gguf --embedding --batched-embeddings
```

### `--parallel` / `LLAMA_ARG_N_PARALLEL`
**Type**: `integer`  
**Default**: `1`  
**Description**: Number of parallel streams for embedding requests.

```bash
llama-server --model model.gguf --embedding --parallel 4
```

---

## Multimodal (Vision)

### `--mmproj` / `LLAMA_ARG_MM_PROJ`
**Type**: `string`  
**Description**: Path to the multimodal projector model (GGUF format). Required for vision models like LLaVA.

```bash
llama-server --model llava-7b.gguf --mmproj llava-mmproj-v1.5.gguf
```

### `--mm-batch-size` / `LLAMA_ARG_MM_BATCH_SIZE`
**Type**: `integer`  
**Default**: `8`  
**Description**: Multimodal batch size. Number of images to process in parallel.

```bash
llama-server --model llava.gguf --mmproj llava-mmproj.gguf --mm-batch-size 16
```

---

## Embedding API

### Request Format

```json
POST /v1/embeddings
{
  "input": "Hello, world!",
  "model": "llama-embedding"
}
```

### Response Format

```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [0.1, 0.2, 0.3, ...]
    }
  ],
  "usage": {
    "prompt_tokens": 4,
    "total_tokens": 4
  }
}
```

---

## See Also

- [[llama-cpp/server-flags/context-and-attention\|Context & Attention]] — Context settings for embeddings
- [[llama-cpp/server-flags/advanced-and-experimental\|Advanced & Experimental]] — Chat templates for multimodal
- [[llama-cpp/server-flags/flags-reference\|Flags Reference]] — Complete flag table
