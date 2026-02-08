# Betty - llama.cpp REST API

A Node.js REST API wrapper for llama.cpp that provides OpenAI-compatible endpoints for text completion, chat, embeddings, and model management.

## Features

- 🚀 OpenAI-compatible API endpoints
- 💬 Chat completions with message history
- 📝 Text completions
- 🔢 Text embeddings for semantic search
- 🎯 Model management
- 🔄 Automatic llama.cpp process management
- 🛡️ Comprehensive error handling
- 📊 Request logging
- ⚙️ Environment-based configuration
- 🔌 CORS enabled

## Prerequisites

- Node.js 14 or higher
- llama.cpp built with server executable
- A GGUF model file
- For GPU acceleration: NVIDIA CUDA toolkit (optional but recommended)

## Installation

1. **Clone and navigate to the project:**
   ```bash
   cd betty
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build llama.cpp with CUDA support (recommended for NVIDIA GPUs):**
   ```bash
   cd llama.cpp
   cmake -B build -DGGML_CUDA=ON
   cmake --build build --config Release -j $(nproc)
   cd ..
   ```

   The server binary will be at `./llama.cpp/build/bin/llama-server`.

   **For CPU-only build:**
   ```bash
   cd llama.cpp
   cmake -B build
   cmake --build build --config Release -j $(nproc)
   cd ..
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure your settings:
   ```env
   PORT=3000
   LLAMA_PORT=8080
   LLAMA_EXECUTABLE=./llama.cpp/build/bin/llama-server
   MODEL_PATH=/path/to/your/model.gguf
   CONTEXT_SIZE=4096
   THREADS=4
   GPU_LAYERS=-1
   ```

## GPU Configuration (NVIDIA CUDA)

Betty supports multi-GPU setups for distributing model layers across multiple NVIDIA GPUs.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GPU_LAYERS` | Number of layers to offload to GPU (-1 = all) | `-1` |
| `MAIN_GPU` | Primary GPU device index (0-based) | `0` |
| `SPLIT_MODE` | Multi-GPU split strategy | `row` |
| `TENSOR_SPLIT` | VRAM distribution ratios per GPU | (empty) |
| `FLASH_ATTENTION` | Enable flash attention | `true` |

### Split Modes

- **`none`** - Use only the main GPU
- **`layer`** - Split layers across GPUs (simpler, good for different GPU models)
- **`row`** - Split tensor rows across GPUs (tensor parallelism, best performance)

### Example: Multi-GPU Configuration

For a setup with 3 GPUs (12GB, 12GB, 16GB VRAM):

```env
GPU_LAYERS=-1
MAIN_GPU=0
SPLIT_MODE=row
TENSOR_SPLIT=12,12,16
FLASH_ATTENTION=true
```

The `TENSOR_SPLIT` values represent proportional VRAM allocation. The example allocates work based on each GPU's memory capacity.

### Verifying GPU Usage

Check that your GPUs are being utilized:
```bash
watch -n 1 nvidia-smi
```

## Usage

### Start the Server

```bash
npm start
```

The API will start on `http://localhost:3000` (or your configured PORT).

### Development Mode

For auto-restart on file changes:
```bash
npm run dev
```

## API Endpoints

### 1. Health Check

Check if the API and llama.cpp server are running.

```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "llamaServer": {
    "isRunning": true,
    "baseUrl": "http://localhost:8080",
    "pid": 12345
  },
  "uptime": 123.456
}
```

### 2. Text Completions

Generate text completions from a prompt.

```bash
POST /v1/completions
```

**Request Body:**
```json
{
  "prompt": "Once upon a time",
  "max_tokens": 100,
  "temperature": 0.8,
  "top_p": 0.95,
  "top_k": 40,
  "repeat_penalty": 1.1,
  "stop": ["\n\n"]
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The capital of France is",
    "max_tokens": 50,
    "temperature": 0.7
  }'
```

**Response:**
```json
{
  "id": "cmpl-1234567890",
  "object": "text_completion",
  "created": 1234567890,
  "model": "llama",
  "choices": [
    {
      "text": " Paris, which is located in the northern part of the country.",
      "index": 0,
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 6,
    "completion_tokens": 15,
    "total_tokens": 21
  }
}
```

### 3. Chat Completions

Generate chat-style completions with message history.

```bash
POST /v1/chat/completions
```

**Request Body:**
```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is the capital of France?"}
  ],
  "max_tokens": 100,
  "temperature": 0.8,
  "top_p": 0.95
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello! How are you?"}
    ],
    "max_tokens": 100
  }'
```

**Response:**
```json
{
  "id": "chatcmpl-1234567890",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "llama",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm doing well, thank you for asking. How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 18,
    "total_tokens": 38
  }
}
```

### 4. Embeddings

Generate vector embeddings for text.

```bash
POST /v1/embeddings
```

**Request Body:**
```json
{
  "input": "Hello, world!",
  "model": "llama"
}
```

**Multiple Inputs:**
```json
{
  "input": ["Hello, world!", "Goodbye, world!"]
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": "The quick brown fox jumps over the lazy dog"
  }'
```

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.123, -0.456, 0.789, ...],
      "index": 0
    }
  ],
  "model": "llama",
  "usage": {
    "prompt_tokens": 9,
    "total_tokens": 9
  }
}
```

### 5. List Models

Get information about available models.

```bash
GET /v1/models
```

**Example:**
```bash
curl http://localhost:3000/v1/models
```

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "llama",
      "object": "model",
      "created": 1234567890,
      "owned_by": "local"
    }
  ]
}
```

### 6. Get Specific Model

Get information about a specific model.

```bash
GET /v1/models/:model
```

**Example:**
```bash
curl http://localhost:3000/v1/models/llama
```

## Configuration

All configuration is done through environment variables. See `.env.example` for available options:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3000` |
| `LLAMA_PORT` | llama.cpp server port | `8080` |
| `LLAMA_HOST` | llama.cpp server host | `localhost` |
| `LLAMA_EXECUTABLE` | Path to llama.cpp server binary | `./llama.cpp/build/bin/llama-server` |
| `MODEL_PATH` | Path to GGUF model file | `./models/model.gguf` |
| `CONTEXT_SIZE` | Context window size | `4096` |
| `THREADS` | Number of threads | `4` |
| `BATCH_SIZE` | Batch size for processing | `512` |
| `SEED` | Random seed (-1 for random) | `-1` |
| `GPU_LAYERS` | Layers to offload to GPU (-1 = all) | `-1` |
| `MAIN_GPU` | Primary GPU device index | `0` |
| `SPLIT_MODE` | Multi-GPU split mode (none/layer/row) | `row` |
| `TENSOR_SPLIT` | VRAM ratios per GPU (e.g., "12,12,16") | (empty) |
| `FLASH_ATTENTION` | Enable flash attention | `true` |
| `HEALTH_CHECK_INTERVAL` | Health check interval (ms) | `5000` |
| `HEALTH_CHECK_TIMEOUT` | Health check timeout (ms) | `60000` |
| `HEALTH_CHECK_RETRIES` | Health check retry attempts | `15` |
| `LOG_LEVEL` | Logging level | `dev` |

## Error Handling

The API returns consistent error responses:

```json
{
  "error": {
    "message": "Error description",
    "type": "error_type",
    "code": "error_code"
  }
}
```

Common error codes:
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (invalid endpoint)
- `500` - Internal Server Error
- `503` - Service Unavailable (llama.cpp server down)

## OpenAI SDK Compatibility

This API is compatible with OpenAI's client libraries. You can use them by pointing the base URL to your Betty server:

### Python

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="not-needed"  # API key not required but must be set
)

# Chat completion
response = client.chat.completions.create(
    model="llama",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.choices[0].message.content)
```

### JavaScript/TypeScript

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: 'not-needed'  // API key not required but must be set
});

const completion = await openai.chat.completions.create({
  model: 'llama',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});

console.log(completion.choices[0].message.content);
```

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────────────┐
│   Express Server    │
│   (Port 3000)       │
├─────────────────────┤
│ Routes              │
│ • /v1/completions   │
│ • /v1/chat/...      │
│ • /v1/embeddings    │
│ • /v1/models        │
└──────┬──────────────┘
       │ HTTP Proxy
       ▼
┌─────────────────────┐
│  llama.cpp Server   │
│  (Port 8080)        │
│  [Child Process]    │
└─────────────────────┘
```

The API spawns and manages the llama.cpp server as a child process, automatically starting it on launch and stopping it on shutdown.

## Graceful Shutdown

The server handles `SIGTERM` and `SIGINT` signals gracefully:

1. Stops accepting new requests
2. Waits for existing requests to complete
3. Terminates the llama.cpp server process
4. Exits cleanly

Press `Ctrl+C` to trigger graceful shutdown.

## Logging

All HTTP requests are logged with:
- Request method and path
- Response status code
- Response time
- Response size

llama.cpp server output is prefixed with `[llama.cpp]`.

## Troubleshooting

### llama.cpp server fails to start

**Problem:** Error message "Failed to start llama.cpp server"

**Solutions:**
- Verify `LLAMA_EXECUTABLE` path is correct
- Ensure llama.cpp server is built (`make server` in llama.cpp directory)
- Check that `MODEL_PATH` points to a valid GGUF file
- Verify the model file is not corrupted

### Port already in use

**Problem:** Error "EADDRINUSE: address already in use"

**Solutions:**
- Change `PORT` or `LLAMA_PORT` in `.env`
- Kill the process using the port: `lsof -ti:3000 | xargs kill`

### Out of memory errors

**Problem:** llama.cpp crashes with memory errors

**Solutions:**
- Reduce `CONTEXT_SIZE` in `.env`
- Use a smaller model
- Increase system swap space
- Enable GPU offloading with `GPU_LAYERS` if you have a GPU

### Slow response times

**Solutions:**
- Increase `THREADS` to match your CPU cores
- Enable GPU offloading with `GPU_LAYERS`
- Reduce `CONTEXT_SIZE`
- Use a smaller/quantized model

## Development

Project structure:

```
betty/
├── src/
│   ├── index.js              # Entry point & server setup
│   ├── config.js             # Configuration loader
│   ├── services/
│   │   └── llamaService.js   # llama.cpp process manager
│   ├── routes/
│   │   ├── completions.js    # Completion endpoint
│   │   ├── chat.js           # Chat endpoint
│   │   ├── embeddings.js     # Embeddings endpoint
│   │   └── models.js         # Models endpoint
│   └── middleware/
│       ├── errorHandler.js   # Error handling
│       └── logger.js         # Request logging
├── package.json
├── .env.example
└── README.md
```

## Changelog

### [Unreleased] - 2026-01-29

#### Added
- **Automatic Port Retry**: Express server now automatically tries alternative ports (3000, 3001, 3002, etc.) if the configured port is in use. Attempts up to 10 ports before failing. ([#src/index.js](src/index.js))
- **Server Shutdown Endpoint**: New `POST /api/shutdown` endpoint allows graceful shutdown of both the API server and llama.cpp server via HTTP request. ([#src/index.js](src/index.js))
- **Admin Menu in Frontend**: Added an admin menu modal in the sidebar footer (gear icon) containing:
  - Server status information (API Server and llama.cpp status)
  - Shutdown server button with confirmation dialog
  - Organized "Danger Zone" section for destructive operations
  - ([#frontend/src/components/Sidebar.vue](frontend/src/components/Sidebar.vue))

#### Fixed
- **Duplicate Menu Button**: Resolved issue where hamburger menu button was duplicated when sidebar was collapsed. Removed redundant buttons from ChatView and CompletionsView components. ([#frontend/src/views/ChatView.vue](frontend/src/views/ChatView.vue), [#frontend/src/views/CompletionsView.vue](frontend/src/views/CompletionsView.vue))

#### Changed
- Updated API endpoint list to include `/api/shutdown` endpoint
- Reorganized frontend sidebar footer to include admin controls
- Improved console output to show when fallback ports are used

#### Technical Details
- Port retry logic uses event-based error handling for `EADDRINUSE` errors
- Shutdown endpoint includes 100ms delay to ensure HTTP response is sent before process termination
- Admin menu modal provides extensible structure for future administrative features

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- [llama.cpp](https://github.com/ggerganov/llama.cpp) - The underlying LLM inference engine
- [Express](https://expressjs.com/) - Web framework
- OpenAI - API specification inspiration
