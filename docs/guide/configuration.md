# Configuration

Betty is configured entirely through environment variables defined in a `.env` file.

## Configuration File

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

## Environment Variables

### API Server Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PORT` | Port for the Express API server | `3000` | `3000` |
| `LOG_LEVEL` | Logging verbosity | `dev` | `dev`, `combined`, `short` |
| `HEALTH_CHECK_INTERVAL` | Health check interval (ms) | `5000` | `5000` |
| `HEALTH_CHECK_TIMEOUT` | Health check timeout (ms) | `60000` | `60000` |
| `HEALTH_CHECK_RETRIES` | Health check retry attempts | `15` | `15` |

### llama.cpp Server Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `LLAMA_PORT` | Port for llama.cpp server | `8080` | `8080` |
| `LLAMA_HOST` | Host for llama.cpp server | `localhost` | `localhost` |
| `LLAMA_EXECUTABLE` | Path to llama-server binary | `./llama.cpp/build/bin/llama-server` | Custom path |

### Model Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MODEL_PATH` | Path to GGUF model file | `./models/model.gguf` | `./models/llama-2-7b.gguf` |
| `CONTEXT_SIZE` | Context window size in tokens | `4096` | `4096`, `8192`, `32768` |
| `THREADS` | Number of CPU threads | `4` | Match CPU core count |
| `BATCH_SIZE` | Batch size for prompt processing | `512` | `512`, `1024` |
| `SEED` | Random seed for generation | `-1` | `-1` (random), `42` |

**Context Size Guidelines:**
- Small models (7B): 2048-4096
- Medium models (13B): 4096-8192
- Large models (70B): 8192-32768 (requires lots of VRAM)

### GPU Configuration (NVIDIA CUDA)

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `GPU_LAYERS` | Layers to offload to GPU | `-1` | `-1` (all), `32`, `0` (CPU only) |
| `MAIN_GPU` | Primary GPU device index | `0` | `0`, `1`, `2` |
| `SPLIT_MODE` | Multi-GPU split strategy | `row` | `none`, `layer`, `row` |
| `TENSOR_SPLIT` | VRAM distribution per GPU | (empty) | `12,12,16` |
| `FLASH_ATTENTION` | Enable flash attention | `true` | `true`, `false` |

**GPU Layers:**
- `-1` - Offload all layers (fully GPU)
- `0` - CPU only
- `32` - Offload 32 layers (hybrid)

**Split Modes:**
- `none` - Use only MAIN_GPU
- `layer` - Distribute layers across GPUs (simpler)
- `row` - Distribute tensor rows (tensor parallelism, best performance)

**Example Multi-GPU Setup (3 GPUs):**
```env
GPU_LAYERS=-1
MAIN_GPU=0
SPLIT_MODE=row
TENSOR_SPLIT=12,12,16  # GPU 0: 12GB, GPU 1: 12GB, GPU 2: 16GB
FLASH_ATTENTION=true
```

### MongoDB Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/betty` | Custom URI |

**MongoDB is optional.** It's required for:
- User authentication
- Document storage (RAG)
- Vector embeddings storage

### Authentication Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DEFAULT_ADMIN_USERNAME` | Default admin username | `admin` | `admin` |
| `DEFAULT_ADMIN_PASSWORD` | Default admin password | `changeme` | Strong password |
| `JWT_SECRET` | JWT signing secret | (auto-generated) | Random string |
| `SESSION_SECRET` | Session signing secret | (auto-generated) | Random string |

**Security Notes:**
- Change default admin password immediately
- Use strong, random secrets in production
- Store secrets securely (e.g., environment variables, secrets manager)

### Model Download Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MODELS_DIR` | Directory for downloaded models | `./models` | Custom directory |
| `HF_TOKEN` | HuggingFace API token | (empty) | For private models |

## Example Configurations

### Minimal CPU Configuration

```env
PORT=3000
LLAMA_PORT=8080
LLAMA_EXECUTABLE=./llama.cpp/build/bin/llama-server
MODEL_PATH=./models/llama-2-7b-chat.Q4_K_M.gguf
CONTEXT_SIZE=2048
THREADS=8
GPU_LAYERS=0
```

### Single GPU Configuration

```env
PORT=3000
LLAMA_PORT=8080
LLAMA_EXECUTABLE=./llama.cpp/build/bin/llama-server
MODEL_PATH=./models/llama-2-13b-chat.Q4_K_M.gguf
CONTEXT_SIZE=4096
THREADS=4
GPU_LAYERS=-1
MAIN_GPU=0
FLASH_ATTENTION=true
```

### Multi-GPU Configuration

```env
PORT=3000
LLAMA_PORT=8080
LLAMA_EXECUTABLE=./llama.cpp/build/bin/llama-server
MODEL_PATH=./models/llama-2-70b-chat.Q4_K_M.gguf
CONTEXT_SIZE=8192
THREADS=16
GPU_LAYERS=-1
MAIN_GPU=0
SPLIT_MODE=row
TENSOR_SPLIT=24,24,24,24
FLASH_ATTENTION=true
```

### Production with Authentication

```env
# Server
PORT=3000
LLAMA_PORT=8080
LOG_LEVEL=combined

# Model
LLAMA_EXECUTABLE=./llama.cpp/build/bin/llama-server
MODEL_PATH=./models/llama-2-13b-chat.Q4_K_M.gguf
CONTEXT_SIZE=4096
THREADS=8
GPU_LAYERS=-1

# MongoDB
MONGODB_URI=mongodb://localhost:27017/betty

# Auth
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=very-secure-password-here
JWT_SECRET=random-jwt-secret-here
SESSION_SECRET=random-session-secret-here
```

## Runtime Configuration

Some settings can be configured at runtime through the API or web interface:

### API Request Parameters

Override model parameters per request:

```json
{
  "prompt": "Hello",
  "temperature": 0.7,
  "top_p": 0.9,
  "top_k": 40,
  "repeat_penalty": 1.1,
  "max_tokens": 100
}
```

### Frontend Settings Panel

The web interface provides a settings panel to configure:
- Temperature
- Top P / Top K
- Max tokens
- Repeat penalty
- Stop sequences

These are stored in browser localStorage and sent with each request.

## Verifying Configuration

### Check Environment

```bash
# View current configuration
cat .env

# Validate llama.cpp executable
./llama.cpp/build/bin/llama-server --version

# Verify model file exists
ls -lh ./models/*.gguf
```

### Check Runtime Status

```bash
# Health check
curl http://localhost:3000/health

# View server info
curl http://localhost:3000/v1/models
```

## Performance Tuning

### CPU Performance

1. **Set threads to match CPU cores:**
   ```bash
   THREADS=$(nproc)
   ```

2. **Increase batch size:**
   ```env
   BATCH_SIZE=1024
   ```

3. **Use quantized models:**
   - Q4_K_M (recommended balance)
   - Q5_K_M (higher quality)
   - Q8_0 (best quality, slower)

### GPU Performance

1. **Offload all layers:**
   ```env
   GPU_LAYERS=-1
   ```

2. **Enable flash attention:**
   ```env
   FLASH_ATTENTION=true
   ```

3. **Use tensor parallelism for multi-GPU:**
   ```env
   SPLIT_MODE=row
   ```

4. **Monitor GPU usage:**
   ```bash
   watch -n 1 nvidia-smi
   ```

### Memory Management

1. **Reduce context size:**
   ```env
   CONTEXT_SIZE=2048
   ```

2. **Use smaller batch size:**
   ```env
   BATCH_SIZE=256
   ```

3. **Use smaller model:**
   - 7B instead of 13B
   - Higher quantization (Q4 instead of Q8)

## Configuration Validation

Betty validates configuration on startup:

- Checks if model file exists
- Verifies llama.cpp executable
- Tests MongoDB connection (if configured)
- Validates GPU availability (if GPU layers > 0)

Check logs for validation warnings or errors.

## Next Steps

- [Quick Start](/guide/quickstart.html) - Make your first API call
- [GPU Configuration](/advanced/gpu-configuration.html) - Detailed GPU setup
- [Troubleshooting](/guide/troubleshooting.html) - Common issues
