---
tags: [config, build, cuda, profiles, gpu, cmake]
---

# Config

The Config page lets you build llama.cpp and tune all benchmark parameters.

See also: [[USER-MANUAL]] • [[configuration-reference]]

## Build llama.cpp

At the top of the page, you can trigger a full build of llama.cpp:

1. Click **Build** to start
2. Watch the progress bar and build logs in real time
3. Use **Reset** to clear the build state

The build process clones/pulls the llama.cpp repository and runs cmake with your configured options.

## Config Profiles

Save and load configuration profiles for quick switching:

1. Enter a profile name and click **Save** to store the current configuration
2. Click **Load** next to any saved profile to restore it
3. Click the **trash icon** to delete a profile

## Build Options Tab

Configure how llama.cpp is compiled:

### Basic Options

| Option | Description |
|--------|-------------|
| **Enable ccache** | Use compiler cache for faster rebuilds |
| **Enable LTO** | Link-time optimization for smaller binaries |

### CUDA Options

| Option | Description |
|--------|-------------|
| **Enable CUDA** | Build with CUDA GPU support |
| **Enable Flash Attention** | Flash attention acceleration |
| **Enable CUDA Graphs** | CUDA graph capture for faster inference |
| **Enable NCCL** | Multi-GPU NCCL support |
| **Enable Per-Max Batch Size** | Per-max batch size optimization |
| **Enable Peer Copy** | GPU peer-to-peer memory access |
| **Enable Custom CUDA Architecture** | Custom compute capability |
| **Enable FP16** | FP16 precision support |
| **Enable Scheduled Max Copies** | Scheduled copy optimization |
| **Enable Compression Level** | Compression level control |
| **Enable Force MMQ** | Force matrix multiplication quantization |
| **Enable GGML Native** | Native GGML (mutually exclusive with Custom CUDA Architecture) |

### Build Parameters

| Parameter | Description |
|-----------|-------------|
| **Peer Batch Size** | Batch size for peer copy operations |
| **Max Scheduled Copies** | Maximum scheduled copies for CUDA |
| **Compression Level** | Compression level for quantization |

### Quantization & Precision

| Option | Description |
|--------|-------------|
| **Enable FA All Quants** | Flash attention with all quantization types |
| **Enable CUDA All Quants** | CUDA support for all quantization types |

### CUDA Configuration

| Parameter | Description |
|-----------|-------------|
| **CUDA Version** | CUDA toolkit version string |
| **NVCC Path** | Path to the NVCC compiler |

## Run Options Tab

Configure benchmark execution parameters:

### General

| Parameter | Default | Description |
|-----------|---------|-------------|
| **Max System Memory (%)** | `93` | Maximum system memory to use |
| **Llama Port** | `11434` | Port for llama-server |
| **Llama Host** | `localhost` | Host for llama-server |
| **Model** | *(auto-populated)* | Model file path |
| **Build Cores** | `14` | Number of cores for building |
| **Skip Build** | `true` | Skip the build step |

### Environment Exports

Environment variables passed to the build process:

| Variable | Description |
|----------|-------------|
| `GGML_CUDA_ENABLE_UNIFIED_MEMORY` | Unified memory for GPU |
| `CUDA_SCALE_LAUNCH_QUEUES` | Scale launch queue multiplier |
| `GGML_CUDA_P2P` | Peer-to-peer support |
| `LLAMA_ARG_FIT` | Model fitting |
| `LLAMA_ARG_FIT_TARGET` | Fit target size |
| `LLAMA_ARG_FIT_CTX` | Fit context size |

### Benchmark Messages

Custom messages used to fill context during benchmarking. Each message is sent sequentially with accumulated history. Edit these to match your use case.

### Model Configs

| Parameter | Default | Description |
|-----------|---------|-------------|
| **Temperature** | `0.6` | Sampling temperature |
| **Top P** | `0.95` | Nucleus sampling threshold |
| **Min P** | `0` | Minimum probability threshold |
| **Top K** | `20` | Top-K sampling |

### Test Parameters

| Parameter | Default | Step | Max | Description |
|-----------|---------|------|-----|-------------|
| **Context Length** | `32768` | — | `262144` | Starting context size |
| **Context Length Multiplier** | `2` | — | — | Multiplier for context scaling |
| **Context Length Max** | `262144` | — | — | Maximum context length |
| **GPU Layer Offload** | `999` | — | `999` | Number of layers on GPU |
| **Batch Size** | `128` | `128` | `16384` | Batch size |
| **Batch Size Max** | `16384` | — | — | Maximum batch size |
| **U Batch Size** | `64` | `64` | `4096` | Ubatch size |
| **U Batch Size Max** | `4096` | — | — | Maximum ubatch size |
| **Cache RAM (GB)** | `4096` | `1024` | `4096` | RAM cache size |

### Spec Params

Speculative decoding parameters:

| Parameter | Description |
|-----------|-------------|
| **Spec Type** | Type of speculative decoding (e.g., `draft-mtp`) |
| **Spec Draft N-Max** | Maximum draft tokens |

### Split Params

Multi-GPU splitting parameters:

| Parameter | Description |
|-----------|-------------|
| **Layer Split** | Split by layer |
| **Tensor Split** | Comma-separated tensor split ratios (e.g., `16,12,12`) |
| **Primary GPU** | Primary GPU index |

### GPU Selection

Enable multi-GPU mode and select which GPUs to use:

1. Toggle **Enable GPU Selection**
2. Enter a GPU index and click **Add**
3. Click **X** on a GPU chip to remove it

## Additional Actions

| Button | Description |
|--------|-------------|
| **Kill Port** | Kill any process on the llama server port |
| **Stop llama.service** | Stop the systemd llama service |
| **Delete Build** | Remove the llama.cpp build directory |
| **Reset** | Reset config form to current saved values |
| **Save Config** | Save current configuration to `configs.json` |
