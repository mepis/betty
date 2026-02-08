# Installation

This guide will walk you through installing Betty and its dependencies.

## Prerequisites

Before installing Betty, ensure you have:

- **Node.js** 14 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** for cloning the repository
- **CMake** 3.14 or higher for building llama.cpp
- **C++ compiler** (GCC 11+ or Clang 11+)
- **CUDA Toolkit** (optional, for NVIDIA GPU support)
- **MongoDB** (optional, for authentication and RAG features)

### System-Specific Requirements

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y build-essential cmake git nodejs npm
```

**macOS:**
```bash
brew install cmake node
```

**Windows:**
- Install [Visual Studio 2022](https://visualstudio.microsoft.com/) with C++ tools
- Install [CMake](https://cmake.org/download/)
- Install [Node.js](https://nodejs.org/)

## Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/betty.git
cd betty
```

## Step 2: Install Node.js Dependencies

```bash
npm install
```

This installs backend dependencies. Frontend dependencies will be installed during build.

## Step 3: Build llama.cpp

Betty includes llama.cpp as a submodule. You need to build the server executable.

### Option A: CUDA Build (NVIDIA GPUs - Recommended)

```bash
cd llama.cpp
cmake -B build -DGGML_CUDA=ON
cmake --build build --config Release -j $(nproc)
cd ..
```

The server binary will be at `./llama.cpp/build/bin/llama-server`.

### Option B: CPU-Only Build

```bash
cd llama.cpp
cmake -B build
cmake --build build --config Release -j $(nproc)
cd ..
```

### Option C: Metal Build (Apple Silicon)

```bash
cd llama.cpp
cmake -B build -DGGML_METAL=ON
cmake --build build --config Release -j $(sysctl -n hw.ncpu)
cd ..
```

### Verify the Build

```bash
./llama.cpp/build/bin/llama-server --version
```

You should see version information printed.

## Step 4: Install MongoDB (Optional)

MongoDB is required for authentication and RAG features.

**Ubuntu/Debian:**
```bash
# Install MongoDB
sudo apt install -y mongodb

# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Docker:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Step 5: Download a Model

You need a GGUF model file. Here are some options:

**Option 1: Download from HuggingFace**

Visit [HuggingFace](https://huggingface.co/models?library=gguf) and download a GGUF model.

Example (7B parameter model):
```bash
mkdir -p models
cd models
wget https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf
cd ..
```

**Option 2: Use Betty's Model Manager**

You can download models through the web interface after starting Betty (see [Model Management](/advanced/model-management.html)).

## Step 6: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# API Server
PORT=3000

# llama.cpp Server
LLAMA_PORT=8080
LLAMA_HOST=localhost
LLAMA_EXECUTABLE=./llama.cpp/build/bin/llama-server

# Model Configuration
MODEL_PATH=./models/llama-2-7b-chat.Q4_K_M.gguf
CONTEXT_SIZE=4096
THREADS=4
BATCH_SIZE=512

# GPU Configuration (CUDA)
GPU_LAYERS=-1        # -1 = all layers on GPU
MAIN_GPU=0
SPLIT_MODE=row
FLASH_ATTENTION=true

# MongoDB (optional)
MONGODB_URI=mongodb://localhost:27017/betty

# Default Admin User (optional)
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=changeme
```

See [Configuration](/guide/configuration.html) for detailed explanations.

## Step 7: Build Frontend

```bash
npm run build-frontend
```

This builds the Vue.js frontend into `frontend/dist`.

## Step 8: Start Betty

```bash
npm run prod
```

Or for development with auto-reload:

```bash
npm run dev
```

Betty will:
1. Start the Express server on port ${PORT} (default: 3000). The API server automatically handles port conflicts by trying the next available ports (3001-3009) if the configured port is unavailable.

> ℹ️ You'll see a message like "Port 3000 was in use, using 3001 instead" during startup.
2. Launch the llama.cpp server on port 8080
3. Connect to MongoDB (if configured)
4. Serve the frontend at [http://localhost:3000](http://localhost:3000)

## Verify Installation

1. **Check Health Endpoint:**
   ```bash
   curl http://localhost:3000/health
   ```

   You should see:
   ```json
   {
     "status": "ok",
     "llamaServer": {
       "isRunning": true,
       "baseUrl": "http://localhost:8080",
       "pid": 12345
     }
   }
   ```

2. **Test Completion:**
   ```bash
   curl -X POST http://localhost:3000/v1/completions \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "Hello, my name is",
       "max_tokens": 20
     }'
   ```

3. **Open Web Interface:**
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Troubleshooting

### llama.cpp fails to build

- Ensure you have a C++11 compatible compiler
- Update CMake: `pip install --upgrade cmake`
- Check llama.cpp [build instructions](https://github.com/ggerganov/llama.cpp#build)

### Server fails to start

- Check that ports 3000 and 8080 are not in use
- Verify `MODEL_PATH` points to a valid GGUF file
- Check logs for error messages

### MongoDB connection errors

- Ensure MongoDB is running: `sudo systemctl status mongodb`
- Check `MONGODB_URI` in `.env`
- MongoDB is optional - you can run without it

### Out of memory

- Reduce `CONTEXT_SIZE` in `.env`
- Use a smaller model
- Enable GPU offloading with `GPU_LAYERS=-1`

## Next Steps

- [Configuration](/guide/configuration.html) - Fine-tune your setup
- [Quick Start](/guide/quickstart.html) - Make your first API call
- [Frontend Guide](/guide/frontend.html) - Use the web interface
