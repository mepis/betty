# MTMD Binary Documentation

## Overview

The `llama-mtmd` binary provides multimodal text and image processing capabilities for llama models. It supports vision-language models that can process both text and images.

## Command-Line Flags

### General Options

| Flag | Description | Default |
|------|-------------|---------|
| `-h, --help, --usage` | Print usage and exit | - |
| `--version` | Show version and build info | - |
| `--license` | Show source code license and dependencies | - |

### Model Options

| Flag | Description | Default |
|------|-------------|---------|
| `-m, --model` | Model path to load | - |
| `-mu, --model-url` | Model download URL | - |
| `-dr, --docker-repo` | Docker Hub model repository | - |
| `-hf, --hf-repo` | Hugging Face model repository | - |
| `-hff, --hf-file` | Hugging Face model file | - |
| `-hft, --hf-token` | Hugging Face access token | - |

### Multimodal Options

| Flag | Description | Default |
|------|-------------|---------|
| `-mm, --mmproj` | Multimodal projector file | - |
| `-mmu, --mmproj-url` | Multimodal projector URL | - |
| `--mmproj-auto` | Auto-load mmproj | 1 |
| `--mmproj-offload` | GPU offload for mmproj | 1 |
| `--image` | Image file (comma-separated) | - |
| `--audio` | Audio file (comma-separated) | - |
| `--image-min-tokens` | Min image tokens | -1 |
| `--image-max-tokens` | Max image tokens | -1 |

### Generation Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --prompt` | Prompt text | - |
| `-sys, --system-prompt` | System prompt | - |
| `-n, --predict` | Number of tokens to predict | -1 |
| `-i, --interactive` | Interactive mode | 0 |
| `-if, --interactive-first` | Interactive first | 0 |
| `-r, --reverse-prompt` | Reverse prompt | - |
| `-sp, --special` | Special tokens output | 0 |
| `--warmup` | Warmup run | 1 |
| `--jinja` | Use Jinja template | 1 |
| `--reasoning-format` | Reasoning format | auto |
| `--reasoning-budget` | Reasoning token budget | -1 |
| `--reasoning-budget-message` | Budget message | - |

### CPU Options

| Flag | Description | Default |
|------|-------------|---------|
| `-t, --threads` | Number of CPU threads | Hardware concurrency |
| `-tb, --threads-batch` | Threads for batch processing | Same as --threads |
| `-C, --cpu-mask` | CPU affinity mask (hex) | - |
| `-Cr, --cpu-range` | Range of CPUs for affinity | - |
| `--cpu-strict` | Use strict CPU placement | 0 |
| `--prio` | Process/thread priority (0-3) | 0 |
| `--poll` | Polling level (0-100) | 50 |
| `-Cb, --cpu-mask-batch` | CPU affinity mask for batch | Same as --cpu-mask |
| `-Crb, --cpu-range-batch` | Range of CPUs for batch | - |
| `--cpu-strict-batch` | Strict CPU placement for batch | Same as --cpu-strict |
| `--prio-batch` | Priority for batch | Same as --prio |
| `--poll-batch` | Polling for batch | Same as --poll |

### Context Options

| Flag | Description | Default |
|------|-------------|---------|
| `-c, --ctx-size` | Size of prompt context | 0 |
| `-b, --batch-size` | Logical batch size | 2048 |
| `-ub, --ubatch-size` | Physical batch size | 512 |
| `--keep` | Tokens to keep from initial prompt | 0 |
| `--swa-full` | Use full-size SWA cache | 0 |

### Flash Attention

| Flag | Description | Default |
|------|-------------|---------|
| `-fa, --flash-attn` | Flash Attention use (on/off/auto) | auto |

### Sampling Options

| Flag | Description | Default |
|------|-------------|---------|
| `-s, --seed` | RNG seed | Random |
| `--temp, --temperature` | Temperature | 0.80 |
| `--top-k` | Top-K sampling | 40 |
| `--top-p` | Top-P sampling | 0.95 |
| `--min-p` | Min-P sampling | 0.05 |
| `--mirostat` | Mirostat sampling | 0 |
| `--grammar` | Grammar | - |
| `-j, --json-schema` | JSON schema | - |

### Model Offloading

| Flag | Description | Default |
|------|-------------|---------|
| `--mlock` | Keep model in RAM | 0 |
| `--mmap` | Memory-map model | 1 |
| `-dio, --direct-io` | Use DirectIO | 0 |
| `--numa` | NUMA optimization | - |
| `-dev, --device` | Devices for offloading | - |
| `-ngl, --gpu-layers, --n-gpu-layers` | GPU layers | Auto |
| `-sm, --split-mode` | Split mode (none/layer/row) | layer |
| `-ts, --tensor-split` | Tensor split across GPUs | - |
| `-mg, --main-gpu` | Main GPU index | 0 |
| `--override-kv` | Override model KV | - |

### Logging Options

| Flag | Description | Default |
|------|-------------|---------|
| `--log-file` | Log to file | - |
| `--log-colors` | Colored logging (on/off/auto) | auto |
| `-v, --verbose` | Verbose mode | - |
| `--offline` | Offline mode | 0 |
| `-lv, --verbosity` | Verbosity level | 3 |
| `--log-prefix` | Enable log prefix | 0 |
| `--log-timestamps` | Enable timestamps | 0 |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `LLAMA_ARG_THREADS` | Number of CPU threads |
| `LLAMA_ARG_MODEL` | Model path |
| `LLAMA_ARG_MODEL_URL` | Model URL |
| `LLAMA_ARG_DOCKER_REPO` | Docker repo |
| `LLAMA_ARG_HF_REPO` | HF repo |
| `LLAMA_ARG_HF_FILE` | HF file |
| `HF_TOKEN` | HF access token |
| `LLAMA_ARG_MLOCK` | Memory lock |
| `LLAMA_ARG_MMAP` | Memory map |
| `LLAMA_ARG_DIO` | Direct IO |
| `LLAMA_ARG_NUMA` | NUMA strategy |
| `LLAMA_ARG_DEVICE` | Device list |
| `LLAMA_ARG_N_GPU_LAYERS` | GPU layers |
| `LLAMA_ARG_SPLIT_MODE` | Split mode |
| `LLAMA_ARG_TENSOR_SPLIT` | Tensor split |
| `LLAMA_ARG_MAIN_GPU` | Main GPU |
| `LLAMA_ARG_CTX_SIZE` | Context size |
| `LLAMA_ARG_N_PREDICT` | Tokens to predict |
| `LLAMA_ARG_BATCH` | Batch size |
| `LLAMA_ARG_UBATCH` | Batch size |
| `LLAMA_ARG_FLASH_ATTN` | Flash attention |
| `LLAMA_ARG_MMPROJ` | MMproj file |
| `LLAMA_ARG_MMPROJ_URL` | MMproj URL |
| `LLAMA_ARG_MMPROJ_AUTO` | MMproj auto |
| `LLAMA_ARG_MMPROJ_OFFLOAD` | MMproj offload |
| `LLAMA_ARG_IMAGE_MIN_TOKENS` | Image min tokens |
| `LLAMA_ARG_IMAGE_MAX_TOKENS` | Image max tokens |
| `LLAMA_ARG_JINJA` | Jinja |
| `LLAMA_ARG_THINK` | Reasoning format |
| `LLAMA_ARG_THINK_BUDGET` | Reasoning budget |
| `LLAMA_ARG_THINK_BUDGET_MESSAGE` | Reasoning budget message |
| `LLAMA_LOG_FILE` | Log file |
| `LLAMA_LOG_COLORS` | Log colors |
| `LLAMA_OFFLINE` | Offline mode |
| `LLAMA_LOG_VERBOSITY` | Log verbosity |
| `LLAMA_LOG_PREFIX` | Log prefix |
| `LLAMA_LOG_TIMESTAMPS` | Log timestamps |

## Usage Examples

```bash
# Process image and text
./llama-mtmd -m model.gguf -mm mmproj.gguf -p "Describe this image" --image photo.jpg

# Interactive multimodal chat
./llama-mtmd -m model.gguf -mm mmproj.gguf -i --image photo.jpg
```
