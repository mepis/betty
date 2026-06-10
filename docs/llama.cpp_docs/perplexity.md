# Perplexity Binary Documentation

## Overview

The `llama-perplexity` binary calculates perplexity scores for language models. Perplexity is a measure of how well a probability model predicts a sample, commonly used to evaluate language model quality.

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

### Perplexity Options

| Flag | Description | Default |
|------|-------------|---------|
| `-f, --file` | File containing prompt | - |
| `-p, --prompt` | Prompt to start generation with | - |
| `--ppl` | Compute perplexity | 1 |
| `--no-ppl` | Disable perplexity computation | 0 |
| `--chunks` | Max number of chunks to process | -1 |
| `--ppl-stride` | Stride for perplexity calculation | 0 |
| `--ppl-output-type` | Output type (0/1) | 0 |
| `--hellaswag` | Compute HellaSwag score | 0 |
| `--hellaswag-tasks` | Number of HellaSwag tasks | 400 |
| `--winogrande` | Compute Winogrande score | 0 |
| `--winogrande-tasks` | Number of Winogrande tasks | 0 |
| `--multiple-choice` | Compute multiple choice score | 0 |
| `--multiple-choice-tasks` | Number of tasks | 0 |
| `--kl-divergence` | Compute KL divergence | 0 |
| `--save-all-logits` | Save all logits to file | - |

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
| `LLAMA_ARG_PERF` | Performance timings |
| `LLAMA_LOG_FILE` | Log file |
| `LLAMA_LOG_COLORS` | Log colors |
| `LLAMA_OFFLINE` | Offline mode |
| `LLAMA_LOG_VERBOSITY` | Log verbosity |
| `LLAMA_LOG_PREFIX` | Log prefix |
| `LLAMA_LOG_TIMESTAMPS` | Log timestamps |

## Usage Examples

```bash
# Calculate perplexity on a file
./llama-perplexity -m model.gguf -f test.txt

# With custom context size
./llama-perplexity -m model.gguf -f test.txt -c 4096

# Compute HellaSwag score
./llama-perplexity -m model.gguf -f hellaswag.txt --hellaswag
```
