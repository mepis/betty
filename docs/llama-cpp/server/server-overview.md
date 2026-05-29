# Server Overview

The `llama-server` tool provides a REST API for serving GGUF models, enabling integration with frontend applications, chat interfaces, and AI workflows.

**Tags**: `server`, `api`, `rest`, `deployment`

---

## Quick Start

```bash
# Start the server with a model
llama-server -m models/your-model.gguf

# With custom port
llama-server -m models/your-model.gguf -p 8080

# With GPU offloading
llama-server -m models/your-model.gguf -ngl 35
```

## API Endpoints

### Chat Completion

```
POST /v1/chat/completions
```

### Embeddings

```
POST /v1/embeddings
```

### Completions

```
POST /v1/completions
```

### Model Info

```
GET /v1/models
```

## Configuration

The server supports extensive configuration through command-line flags:

- **Model loading**: `--model`, `--ctx-size`, `--n-gpu-layers`
- **Network**: `--host`, `--port`, `--ssl`
- **Sampling**: `--temp`, `--top-p`, `--top-k`
- **Batching**: `--threads`, `--batch-size`, `--parallel`

## Concurrency

llama-server supports multiple concurrent connections:

- Slot-based request handling
- Configurable parallelism
- Request queuing when slots are full

## Security

- SSL/TLS support with OpenSSL
- CORS configuration
- Request rate limiting (experimental)

## Monitoring

- Health check endpoint (`/health`)
- Metrics (when enabled)
- Logging configuration

---

## See Also

- [[llama-cpp/server-flags/usage-and-model\|Usage & Model Flags]] — Server model loading options
- [[llama-cpp/server-flags/context-and-attention\|Context & Attention Flags]] — Context window configuration
- [[llama-cpp/server-flags/slot-management\|Slot Management Flags]] — Concurrency settings
