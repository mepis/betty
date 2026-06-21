---
tags: [qa, huggingface, models, gguf, download]
---

# QA: Model Download

Practical examples for searching, downloading, and managing GGUF models from HuggingFace.

See also: [[models]] • [[config]]

## Example 1: Search and Download via UI

1. **Search**
   - Go to Models tab
   - Enter query: `llama 3.1 gguf`
   - Check "GGUF only" filter
   - Click **Search**

2. **Select a model**
   - Click a result card
   - Review model details (downloads, likes, tags)
   - Select a `.gguf` file from the file list

3. **Download**
   - Click **Download**
   - Watch the progress bar
   - File is saved to `~/.betty/models/<model-id>/`

4. **Use the model**
   - Go to Settings tab
   - Under Run Options → General → Model
   - Select your downloaded model from the dropdown

## Example 2: Search via API

```bash
# Search for GGUF models
curl "http://localhost:3456/api/hf/search?q=llama+3.1+gguf&limit=10&filter=gguf"

# Get model details
curl "http://localhost:3456/api/hf/model/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF"

# List model files
curl "http://localhost:3456/api/hf/model/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/files"

# Download a specific file
curl -X POST http://localhost:3456/api/hf/download \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF",
    "filename": "Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf"
  }'
# Note: This returns an SSE stream, not a JSON response
```

## Example 3: List and Manage Downloads

```bash
# List all downloaded models
curl http://localhost:3456/api/hf/downloads

# List models in a directory
curl "http://localhost:3456/api/models?directory=~/.betty/models"

# Delete a downloaded model
curl -X DELETE "http://localhost:3456/api/hf/download/bartowski_Meta-Llama-3.1-8B-Instruct-GGUF"
```

## Example 4: Popular Model Providers

| Provider | Specialization | Example Search |
|----------|---------------|----------------|
| `bartowski` | Wide architecture support | `bartowski llama gguf` |
| `unsloth` | Unsloth-distilled models | `unsloth qwen gguf` |
| `ggml-org` | Official collection | `ggml-org` |
| `MaziyarPanahi` | High-quality quantizations | `MaziyarPanahi gguf` |

## Example 5: Multi-Part Model Downloads

Some models are split across multiple `.gguf` files. To download all parts:

1. Search for the model
2. Open model details
3. Download each `.gguf` part sequentially
4. All parts are saved to the same subdirectory under `~/.betty/models/`

## Example 6: Check Download Status

```bash
# Check progress of an in-progress download
curl "http://localhost:3456/api/hf/download/<modelId>"
# Returns: { success: true, data: { status, progress, total, downloaded } }
```
