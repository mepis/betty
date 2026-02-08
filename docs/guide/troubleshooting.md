# Troubleshooting

Common issues and solutions for Betty.

## Installation Issues

### llama.cpp Build Fails

**Problem**: CMake or compilation errors when building llama.cpp

**Solutions**:

1. **Update build tools**:
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install build-essential cmake

   # macOS
   brew upgrade cmake
   ```

2. **Check compiler version**:
   ```bash
   gcc --version  # Should be 11+
   g++ --version  # Should be 11+
   ```

3. **Clean and rebuild**:
   ```bash
   cd llama.cpp
   rm -rf build
   cmake -B build -DGGML_CUDA=ON
   cmake --build build --config Release
   ```

4. **Check llama.cpp docs**: Visit [llama.cpp build instructions](https://github.com/ggerganov/llama.cpp#build)

### CUDA Build Fails

**Problem**: CUDA-related errors during build

**Solutions**:

1. **Verify CUDA installation**:
   ```bash
   nvcc --version
   nvidia-smi
   ```

2. **Set CUDA path**:
   ```bash
   export CUDA_PATH=/usr/local/cuda
   export PATH=$CUDA_PATH/bin:$PATH
   ```

3. **Build with specific CUDA version**:
   ```bash
   cmake -B build -DGGML_CUDA=ON -DCMAKE_CUDA_COMPILER=/usr/local/cuda/bin/nvcc
   ```

4. **Try CPU-only build first**:
   ```bash
   cmake -B build
   cmake --build build --config Release
   ```

### Node.js Dependencies Fail

**Problem**: `npm install` errors

**Solutions**:

1. **Update Node.js**:
   ```bash
   node --version  # Should be 14+
   npm --version
   ```

2. **Clear npm cache**:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Use specific Node version**:
   ```bash
   nvm install 18
   nvm use 18
   npm install
   ```

## Runtime Issues

### Server Won't Start

**Problem**: Betty fails to start or crashes immediately

**Diagnosis**:
```bash
# Check logs
npm start

# Check if ports are in use
lsof -i :3000
lsof -i :8080
```

**Solutions**:

1. **Port already in use**:
   ```env
   # Change ports in .env
   PORT=3001
   LLAMA_PORT=8081
   ```

2. **Model file not found**:
   ```bash
   # Verify model path
   ls -lh ./models/

   # Update .env
   MODEL_PATH=./models/your-model.gguf
   ```

3. **llama-server not found**:
   ```bash
   # Check executable path
   ls -lh ./llama.cpp/build/bin/llama-server

   # Update .env
   LLAMA_EXECUTABLE=./llama.cpp/build/bin/llama-server
   ```

### llama.cpp Server Crashes

**Problem**: llama.cpp process terminates unexpectedly

**Solutions**:

1. **Check available memory**:
   ```bash
   free -h  # Linux
   vm_stat  # macOS
   ```

2. **Reduce context size**:
   ```env
   CONTEXT_SIZE=2048  # Instead of 4096
   ```

3. **Reduce GPU layers**:
   ```env
   GPU_LAYERS=32  # Instead of -1
   ```

4. **Use smaller model**:
   Download a smaller quantized model (Q4_K_M instead of Q8_0)

5. **Check logs**:
   ```bash
   # llama.cpp output is logged to console
   npm start 2>&1 | tee betty.log
   ```

### Out of Memory (OOM)

**Problem**: Process killed due to insufficient memory

**Symptoms**:
- Process suddenly stops
- "Killed" message
- System becomes unresponsive

**Solutions**:

1. **Check memory usage**:
   ```bash
   nvidia-smi  # GPU memory
   free -h     # RAM
   ```

2. **Reduce memory usage**:
   ```env
   # Reduce context window
   CONTEXT_SIZE=2048

   # Reduce batch size
   BATCH_SIZE=256

   # Use smaller model
   MODEL_PATH=./models/smaller-model.gguf
   ```

3. **Enable GPU offloading**:
   ```env
   GPU_LAYERS=-1  # Move computation to GPU
   ```

4. **Increase system swap** (Linux):
   ```bash
   sudo fallocate -l 8G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### Slow Generation

**Problem**: Text generation is very slow

**Solutions**:

1. **Enable GPU acceleration**:
   ```env
   GPU_LAYERS=-1
   FLASH_ATTENTION=true
   ```

2. **Increase batch size**:
   ```env
   BATCH_SIZE=1024  # If you have VRAM
   ```

3. **Use more threads**:
   ```env
   THREADS=$(nproc)  # All CPU cores
   ```

4. **Use smaller/faster model**:
   - Prefer Q4_K_M over F16
   - Smaller parameter count (7B vs 13B)

5. **Check GPU utilization**:
   ```bash
   watch -n 1 nvidia-smi
   ```

   If GPU usage is low, increase `GPU_LAYERS`.

## API Issues

### 400 Bad Request

**Problem**: API returns 400 error

**Diagnosis**:
```bash
# Check request format
curl -v -X POST http://localhost:3000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test"}'
```

**Common Causes**:

1. **Invalid JSON**:
   ```bash
   # Bad
   -d '{prompt: "test"}'

   # Good
   -d '{"prompt": "test"}'
   ```

2. **Invalid parameters**:
   ```json
   {
     "temperature": 3.0  // Must be 0-2
   }
   ```

3. **Missing required fields**:
   ```json
   {
     // Missing "prompt" for completions
     // Missing "messages" for chat
   }
   ```

### 401 Unauthorized

**Problem**: Authentication required

**Solutions**:

1. **Disable auth** (development):
   ```env
   ENABLE_AUTH=false
   ```

2. **Include token**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/v1/completions
   ```

3. **Login first**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "password"}'
   ```

### 503 Service Unavailable

**Problem**: llama.cpp server not running

**Diagnosis**:
```bash
curl http://localhost:3000/health
```

**Solutions**:

1. **Check if llama.cpp is running**:
   ```bash
   ps aux | grep llama-server
   curl http://localhost:8080/health
   ```

2. **Manually start llama.cpp**:
   ```bash
   ./llama.cpp/build/bin/llama-server \
     -m ./models/your-model.gguf \
     -c 4096 \
     --port 8080
   ```

3. **Enable auto-start**:
   ```env
   AUTO_START_LLAMA=true
   AUTO_RESTART_LLAMA=true
   ```

### CORS Errors

**Problem**: Browser console shows CORS errors

**Solutions**:

1. **Enable CORS**:
   ```env
   CORS_ENABLED=true
   ```

2. **Add frontend origin**:
   ```env
   CORS_ORIGINS=http://localhost:5173,http://localhost:3000
   ```

3. **Allow all origins** (development only):
   ```env
   CORS_ORIGINS=*
   ```

## MongoDB Issues

### Connection Failed

**Problem**: Cannot connect to MongoDB

**Diagnosis**:
```bash
# Check if MongoDB is running
sudo systemctl status mongodb

# Test connection
mongosh
```

**Solutions**:

1. **Start MongoDB**:
   ```bash
   sudo systemctl start mongodb
   ```

2. **Check connection URI**:
   ```env
   MONGODB_URI=mongodb://localhost:27017/betty
   ```

3. **Disable MongoDB features**:
   ```env
   ENABLE_AUTH=false
   ENABLE_RAG=false
   ```

### Authentication Errors

**Problem**: MongoDB authentication fails

**Solutions**:

1. **For development** (no auth):
   ```env
   MONGODB_URI=mongodb://localhost:27017/betty
   ```

2. **With authentication**:
   ```env
   MONGODB_URI=mongodb://username:password@localhost:27017/betty?authSource=admin
   ```

## Frontend Issues

### Frontend Won't Load

**Problem**: Blank page or errors in browser

**Diagnosis**:
- Open browser console (F12)
- Check network tab
- Look for JavaScript errors

**Solutions**:

1. **Rebuild frontend**:
   ```bash
   cd frontend
   rm -rf dist node_modules
   npm install
   npm run build
   cd ..
   ```

2. **Check file permissions**:
   ```bash
   chmod -R 755 frontend/dist
   ```

3. **Verify backend is serving files**:
   ```bash
   curl http://localhost:3000/
   ```

### API Calls Fail from Frontend

**Problem**: Frontend can't reach backend

**Solutions**:

1. **Check API URL** in frontend/.env:
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   ```

2. **Enable CORS**:
   ```env
   CORS_ENABLED=true
   CORS_ORIGINS=http://localhost:5173
   ```

3. **Check browser console** for specific errors

## GPU Issues

### CUDA Out of Memory

**Problem**: GPU runs out of VRAM

**Solutions**:

1. **Reduce layers on GPU**:
   ```env
   GPU_LAYERS=32  # Instead of -1
   ```

2. **Reduce context size**:
   ```env
   CONTEXT_SIZE=2048
   ```

3. **Use smaller model**:
   Download Q4_K_M instead of Q8_0

4. **Close other GPU applications**:
   ```bash
   nvidia-smi  # Check what else is using GPU
   ```

### Multi-GPU Not Working

**Problem**: Only one GPU is utilized

**Solutions**:

1. **Set tensor split**:
   ```env
   GPU_LAYERS=-1
   TENSOR_SPLIT=3,1  # 75% GPU 0, 25% GPU 1
   SPLIT_MODE=row
   ```

2. **Verify GPUs are visible**:
   ```bash
   nvidia-smi -L
   ```

3. **Check llama.cpp build**:
   Must be built with CUDA support

## Getting Help

If you're still stuck:

1. **Check logs**: Look for error messages in console output
2. **Search issues**: [GitHub Issues](https://github.com/yourusername/betty/issues)
3. **Ask for help**: [GitHub Discussions](https://github.com/yourusername/betty/discussions)
4. **Include**:
   - Betty version
   - OS and version
   - Error messages
   - Configuration (`.env` without secrets)
   - Steps to reproduce

## FAQ

### Can I run Betty without GPU?

Yes! Set `GPU_LAYERS=0` and use a smaller model.

### What's the minimum model size?

TinyLlama 1.1B works well for testing (~600MB).

### How much VRAM do I need?

Depends on model:
- 7B Q4_K_M: 4-6 GB
- 13B Q4_K_M: 8-10 GB
- 70B Q4_K_M: 40+ GB

### Can I use multiple models simultaneously?

Not directly. Run multiple Betty instances on different ports.

### Is Betty production-ready?

Yes, with proper configuration:
- Enable authentication
- Use strong secrets
- Run behind reverse proxy (HTTPS)
- Monitor resource usage
- Set up logging

## Next Steps

- [Configuration Guide](/guide/configuration.html) - Optimize your setup
- [API Reference](/api/) - Detailed endpoint documentation
- [Advanced Topics](/advanced/) - Deep dives into features
