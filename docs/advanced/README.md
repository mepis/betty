# Advanced Topics

Deep dive into Betty's advanced features and configuration options.

## Overview

This section covers advanced topics for power users and production deployments:

- **RAG System** - Document retrieval and embeddings
- **Model Management** - Advanced model configuration
- **Authentication** - User management and security
- **GPU Configuration** - Multi-GPU and optimization
- **Deployment** - Production deployment guides

## RAG (Retrieval-Augmented Generation)

Betty's RAG system allows you to upload documents and query them using semantic search.

### How It Works

1. **Upload** - Documents are uploaded via the API or web interface
2. **Chunk** - Text is split into manageable chunks with overlap
3. **Embed** - Each chunk is converted to a vector embedding
4. **Store** - Embeddings are stored in MongoDB with metadata
5. **Retrieve** - User queries are embedded and matched against stored vectors
6. **Augment** - Retrieved chunks are added to the prompt context
7. **Generate** - The model generates a response using the retrieved context

### Configuration

```env
# Enable RAG features
ENABLE_RAG=true

# Upload settings
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=50

# Chunking parameters
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Retrieval settings
RETRIEVAL_TOP_K=5
SIMILARITY_THRESHOLD=0.7
```

### Supported File Types

- PDF (`.pdf`)
- Text files (`.txt`)
- Markdown (`.md`)
- Microsoft Word (`.docx`)
- HTML (`.html`)

## Model Management

Betty provides tools for downloading and managing GGUF models.

### Model Directory Structure

```
models/
├── llama-2-7b-chat.Q4_K_M.gguf
├── mistral-7b-instruct.Q4_K_M.gguf
└── codellama-13b.Q5_K_S.gguf
```

### Downloading Models

**Via Web Interface:**
1. Go to Models view
2. Browse available models
3. Click "Download"
4. Wait for completion

**Manually:**
```bash
cd models
wget https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf
```

### Quantization Types

- **Q4_K_M** - 4-bit, medium quality, recommended
- **Q5_K_S** - 5-bit, small, better quality
- **Q5_K_M** - 5-bit, medium, balanced
- **Q8_0** - 8-bit, high quality, slower

## Authentication

Betty supports user authentication and role-based access control.

### Setup

```env
# Enable authentication
ENABLE_AUTH=true

# JWT configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=7d

# Registration
ALLOW_REGISTRATION=false

# Default admin
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=changeme
```

### User Roles

- **Admin** - Full access to all features
- **User** - Access to chat, completions, documents

### API Authentication

Include JWT token in requests:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/v1/chat/completions
```

## GPU Configuration

Optimize GPU usage for maximum performance.

### Single GPU

```env
GPU_LAYERS=-1         # All layers on GPU
MAIN_GPU=0           # GPU device ID
FLASH_ATTENTION=true # Enable if supported
```

### Multi-GPU

```env
GPU_LAYERS=-1
MAIN_GPU=0
TENSOR_SPLIT=3,1      # 75% GPU 0, 25% GPU 1
SPLIT_MODE=row        # row or layer
```

### Performance Tips

1. **Maximize GPU layers**: Set `GPU_LAYERS=-1` to offload all layers
2. **Enable Flash Attention**: Requires compute capability 7.0+
3. **Increase batch size**: Larger batches = better GPU utilization
4. **Use appropriate quantization**: Q4_K_M for speed, Q8_0 for quality

### Monitoring

```bash
# Watch GPU usage
watch -n 1 nvidia-smi

# Check GPU memory
nvidia-smi --query-gpu=memory.used,memory.total --format=csv
```

## Deployment

### Docker

Create `Dockerfile`:

```dockerfile
FROM node:18

# Install build dependencies
RUN apt-get update && apt-get install -y cmake build-essential

WORKDIR /app

# Copy application
COPY . .

# Install dependencies
RUN npm install

# Build llama.cpp
RUN cd llama.cpp && \
    cmake -B build -DGGML_CUDA=ON && \
    cmake --build build --config Release

# Build frontend
RUN npm run build-frontend

EXPOSE 3000

CMD ["npm", "start"]
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name betty.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Process Management (PM2)

```bash
# Install PM2
npm install -g pm2

# Start Betty
pm2 start src/index.js --name betty

# Enable auto-restart on system boot
pm2 startup
pm2 save

# Monitor
pm2 monit
```

### systemd Service

Create `/etc/systemd/system/betty.service`:

```ini
[Unit]
Description=Betty LLM API
After=network.target mongodb.service

[Service]
Type=simple
User=betty
WorkingDirectory=/opt/betty
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable betty
sudo systemctl start betty
sudo systemctl status betty
```

## Monitoring & Logging

### Application Logs

```env
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_FILE_PATH=./logs/betty.log
```

### Request Logging

Betty logs all API requests with:
- Timestamp
- Method and endpoint
- Response time
- Status code
- User (if authenticated)

### Health Monitoring

```bash
# Health endpoint
curl http://localhost:3000/health

# Response
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

## Performance Optimization

### Memory Usage

- **Reduce context size**: Lower `CONTEXT_SIZE`
- **Use smaller model**: Choose Q4 over Q8 quantization
- **Limit GPU layers**: Set `GPU_LAYERS` to specific count

### Speed

- **Enable GPU**: Set `GPU_LAYERS=-1`
- **Flash Attention**: Enable if GPU supports it
- **Larger batches**: Increase `BATCH_SIZE`
- **More threads**: Set `THREADS` to CPU core count

### Quality

- **Higher quantization**: Use Q8_0 instead of Q4_K_M
- **Larger model**: 13B or 70B instead of 7B
- **Adjust sampling**: Lower temperature for factual, higher for creative

## Security Best Practices

1. **Enable authentication** in production
2. **Use strong JWT secrets** (32+ random bytes)
3. **Run behind HTTPS** (use nginx/caddy with SSL)
4. **Disable registration** unless needed
5. **Set CORS properly** (don't use `*` in production)
6. **Keep dependencies updated**
7. **Monitor logs** for suspicious activity
8. **Back up MongoDB** regularly

## Scaling Strategies

### Vertical Scaling

- Add more RAM for larger context
- Add more VRAM for larger models
- Faster CPUs for better inference

### Horizontal Scaling

- Run multiple Betty instances
- Use load balancer (nginx, HAProxy)
- Shared MongoDB for user/document data
- Separate llama.cpp servers per instance

### Caching

- Cache embeddings for frequently-accessed documents
- Cache model responses for common queries
- Use Redis for session storage

## Troubleshooting

For common issues, see the [Troubleshooting Guide](/guide/troubleshooting.html).

Advanced issues:

- **OOM with large models**: Use multi-GPU or smaller quantization
- **Slow RAG queries**: Optimize chunk size, use indexing
- **Authentication failures**: Check JWT_SECRET and MongoDB connection

## Next Steps

- [Installation Guide](/guide/installation.html) - Get started
- [Configuration](/guide/configuration.html) - Detailed configuration
- [API Reference](/api/) - API documentation
- [Troubleshooting](/guide/troubleshooting.html) - Common issues
