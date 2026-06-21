# Betty — llama.cpp Benchmark Tool

A web-based benchmarking interface for [llama.cpp](https://github.com/ggerganov/llama.cpp). Build, configure, run, and analyze benchmarks for any GGUF model, all from your browser.

## Features

- 🔨 **Build llama.cpp** — Clone, configure, and compile with custom CUDA options directly from the UI
- 📊 **Run Benchmarks** — Start/stop with real-time streaming results, live logs, and system memory monitoring
- 🤖 **Model Management** — Search, browse, and download GGUF models from HuggingFace
- 💾 **Config Profiles** — Save and load benchmark configurations for quick switching
- 📋 **Reports** — Save results as named reports, inspect per-run configs, reproduce exact commands
- 🖥️ **Systemd Integration** — Install benchmark launches as systemd user services
- 🎮 **GPU Management** — Multi-GPU selection, tensor splitting, layer offloading controls

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Open `http://localhost:3456` in your browser.

## Documentation

- [User Manual](docs/USER-MANUAL.md) — Getting started, installation, and quick start
- [Dashboard](docs/dashboard.md) — Dashboard tab: status, metrics, controls, live results
- [Config](docs/config.md) — Config tab: build options, CUDA settings, run parameters
- [Models](docs/models.md) — Models tab: search and download GGUF models
- [Reports](docs/reports.md) — Reports tab: save, view, and manage benchmark reports
- [Configuration Reference](docs/configuration-reference.md) — Full `configs.json` schema reference
- [API Reference](docs/api-reference.md) — Complete API endpoint reference
- [Troubleshooting](docs/troubleshooting.md) — Common issues and solutions

## Installation

### Prerequisites

- **Node.js** 18+
- **NVIDIA GPU** with CUDA (recommended)
- **CUDA Toolkit** 13.2+
- **CMake** and **build-essential**

### Install Script

```bash
chmod +x install.sh
./install.sh
```

Options: install APT packages, install CUDA, install systemd service, or all three.

### Manual Installation

```bash
git clone <repo-url>
cd betty
npm install
npm start
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | `3456` | HTTP server port |
| `API_HOST` | `0.0.0.0` | Bind address (`0.0.0.0` for all interfaces) |
| `NET_INTERFACE` | `eth0` | Network interface for IP detection |
| `CORS_ORIGIN` | `*` | CORS allowed origins (comma-separated or `*`) |

### Benchmark Configuration

All benchmark settings are stored in `src/backend/configs.json`, managed via the Config page. See [Configuration Reference](docs/configuration-reference.md) for the full schema.

## Remote Access

```bash
API_HOST=0.0.0.0 API_PORT=3456 npm start
```

Access from another machine at `http://<your-ip>:3456`.

## Architecture

```
Browser (Vue.js SPA) ←→ Express API Server ←→ llama.cpp (built & managed by Betty)
     ↑                        ↑
     │                        └── Spawns llama-server for each benchmark run
     └── SSE for live status, logs, and results
```

- **Vue.js 3** + **Tailwind CSS** — Responsive web frontend
- **Express** — API server with SSE streaming
- **llama.cpp** — Built and managed by Betty, launched per benchmark run

## License

MIT
