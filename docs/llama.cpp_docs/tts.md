# TTS Binary Documentation

## Overview

The `llama-tts` binary provides text-to-speech functionality using llama models. It converts text input into audio output.

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
| `-mv, --model-vocoder` | Vocoder model path | - |
| `-mu, --model-url` | Model download URL | - |
| `-dr, --docker-repo` | Docker Hub model repository | - |
| `-hf, --hf-repo` | Hugging Face model repository | - |
| `-hff, --hf-file` | Hugging Face model file | - |
| `-hft, --hf-token` | Hugging Face access token | - |
| `-hfv, --hf-repo-v` | HF vocoder repo | - |
| `-hffv, --hf-file-v` | HF vocoder file | - |

### TTS Options

| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output` | Output file | - |
| `-p, --prompt` | Prompt text | - |
| `--tts-speaker-file` | Speaker file path | - |
| `--tts-use-guide-tokens` | Use guide tokens | 0 |

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

### Flash Attention

| Flag | Description | Default |
|------|-------------|---------|
| `-fa, --flash-attn` | Flash Attention use (on/off/auto) | auto |

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
| `LLAMA_ARG_BATCH` | Batch size |
| `LLAMA_ARG_UBATCH` | Batch size |
| `LLAMA_ARG_FLASH_ATTN` | Flash attention |
| `LLAMA_LOG_FILE` | Log file |
| `LLAMA_LOG_COLORS` | Log colors |
| `LLAMA_OFFLINE` | Offline mode |
| `LLAMA_LOG_VERBOSITY` | Log verbosity |
| `LLAMA_LOG_PREFIX` | Log prefix |
| `LLAMA_LOG_TIMESTAMPS` | Log timestamps |

## Usage Examples

```bash
# Generate speech from text
./llama-tts -m model.gguf -p "Hello, world!" -o output.wav

# With vocoder model
./llama-tts -m model.gguf -mv vocoder.gguf -p "Hello" -o output.wav
```
