# Betty User Manual

A comprehensive guide to using Betty — the llama.cpp benchmark tool.

## Table of Contents

- [Getting Started](#getting-started)
  - [Overview](#overview)
  - [Key Features](#key-features)
  - [Architecture](#architecture)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Quick Start](#quick-start)
- [Dashboard](dashboard.md)
- [Config](config.md)
- [Models](models.md)
- [Reports](reports.md)
- [Configuration Reference](configuration-reference.md)
- [API Reference](api-reference.md)
- [Troubleshooting](troubleshooting.md)

---

## Getting Started

### Overview

Betty is a web-based benchmarking tool for [llama.cpp](https://github.com/ggerganov/llama.cpp). It provides a full web interface for building llama.cpp, running benchmarks, managing model downloads from HuggingFace, and saving/reviewing results.

### Key Features

- **Build llama.cpp** — Clone, configure, and compile llama.cpp with custom CUDA options directly from the web UI
- **Run Benchmarks** — Start/stop benchmarks with real-time streaming results, live logs, and system memory monitoring
- **Model Management** — Search, browse, and download GGUF models from HuggingFace
- **Config Profiles** — Save and load benchmark configurations for quick switching
- **Reports** — Save benchmark results as named reports, view raw markdown, inspect per-run configs
- **Systemd Integration** — Install benchmark launches as systemd user services for automatic restarts
- **GPU Management** — Multi-GPU selection, tensor splitting, layer offloading controls

### Architecture

```
Browser (Vue.js SPA) ←→ Express API Server ←→ llama.cpp (built & managed by Betty)
     ↑                        ↑
     │                        └── Spawns llama-server for each benchmark run
     └── SSE for live status, logs, and results
```

### Prerequisites

- **Node.js** 18+ (for the API server)
- **GPU with CUDA** (NVIDIA, recommended for best performance)
- **CUDA Toolkit** 13.2+ (or install via Betty's installer)
- **CMake** and **build-essential** (for compiling llama.cpp)
- **Git** (for cloning llama.cpp)

### Installation

#### Install Script

Betty includes an interactive installer (`install.sh`) for setting up the system:

```bash
chmod +x install.sh
./install.sh
```

You'll be prompted to choose:

| Option | Description |
|--------|-------------|
| 1 | Install APT packages (build tools, libraries) |
| 2 | Install CUDA 13.2 |
| 3 | Install a systemd user service |
| 4 | Run all (APT → CUDA → Service) |

#### Manual Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd betty

# 2. Install Node.js dependencies
npm install

# 3. Start the server
npm start
```

### Configuration

Copy `.env.example` to `.env` and customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | `3456` | HTTP server port |
| `API_HOST` | `0.0.0.0` | Bind address (`0.0.0.0` for all interfaces) |
| `NET_INTERFACE` | `eth0` | Network interface for IP detection |
| `CORS_ORIGIN` | `*` | CORS allowed origins (comma-separated or `*`) |

### Quick Start

1. **Start the server:**

   ```bash
   npm start
   ```

   This builds the frontend and starts the API server.

2. **Open the web UI:**

   Navigate to `http://localhost:3456` (or the port you configured).

3. **Download a model (optional):**

   Go to the [[Models|Models]] tab, search for a GGUF model (e.g., "llama 3"), select a file, and download it.

4. **Run a benchmark:**

   - Go to the [[Dashboard|Dashboard]] tab
   - Click **Start Benchmark**
   - Watch live results stream in the table and logs scroll in real time
