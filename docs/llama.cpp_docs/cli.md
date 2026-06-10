# CLI Binary Documentation

## Overview

The `llama-cli` binary provides a command-line interface for interacting with llama models. It supports interactive chat, completion, and various generation options.

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

### Generation Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --prompt` | Prompt to start generation with | - |
| `-sys, --system-prompt` | System prompt | - |
| `-sysf, --system-prompt-file` | System prompt file | - |
| `-n, --predict, --n-predict` | Number of tokens to predict | -1 |
| `-i, --interactive` | Interactive mode | 0 |
| `-if, --interactive-first` | Interactive first | 0 |
| `-i, --interactive` | Interactive mode | 0 |
| `-mli, --multiline-input` | Multiline input | 0 |
| `--in-prefix` | Input prefix | - |
| `--in-suffix` | Input suffix | - |
| `--in-prefix-bos` | Prefix BOS to input | 0 |
| `-r, --reverse-prompt` | Reverse prompt | - |
| `-sp, --special` | Special tokens output | 0 |
| `-cnv, --conversation` | Conversation mode | Auto |
| `-st, --single-turn` | Single turn chat | 0 |
| `-e, --escape` | Process escapes | 1 |
| `--ptc, --print-token-count` | Print token count every N | -1 |
| `--prompt-cache` | Prompt cache file | - |
| `--prompt-cache-all` | Cache all | 0 |
| `--prompt-cache-ro` | Cache read-only | 0 |
| `--warmup` | Warmup run | 1 |
| `--spm-infill` | SPM infill pattern | 0 |

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
| `--sampler-seq` | Sampler sequence | Default |
| `--ignore-eos` | Ignore EOS token | 0 |
| `--temp, --temperature` | Temperature | 0.80 |
| `--top-k` | Top-K sampling | 40 |
| `--top-p` | Top-P sampling | 0.95 |
| `--min-p` | Min-P sampling | 0.05 |
| `--top-nsigma` | Top-n-sigma | -1.0 |
| `--xtc-probability` | XTC probability | 0.00 |
| `--xtc-threshold` | XTC threshold | 0.10 |
| `--typical` | Typical sampling | 1.00 |
| `--repeat-last-n` | Repeat last N | 64 |
| `--repeat-penalty` | Repeat penalty | 1.00 |
| `--presence-penalty` | Presence penalty | 0.00 |
| `--frequency-penalty` | Frequency penalty | 0.00 |
| `--mirostat` | Mirostat sampling | 0 |
| `--mirostat-lr` | Mirostat learning rate | 0.10 |
| `--mirostat-ent` | Mirostat target entropy | 5.00 |
| `-l, --logit-bias` | Logit bias | - |
| `--grammar` | Grammar | - |
| `--grammar-file` | Grammar file | - |
| `-j, --json-schema` | JSON schema | - |
| `-jf, --json-schema-file` | JSON schema file | - |
| `-bs, --backend-sampling` | Backend sampling | 0 |

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
| `LLAMA_ARG_PERF` | Performance timings |
| `LLAMA_ARG_SHOW_TIMINGS` | Show timings |
| `LLAMA_ARG_TOP_K` | Top-K sampling |
| `LLAMA_ARG_BACKEND_SAMPLING` | Backend sampling |
| `LLAMA_LOG_FILE` | Log file |
| `LLAMA_LOG_COLORS` | Log colors |
| `LLAMA_OFFLINE` | Offline mode |
| `LLAMA_LOG_VERBOSITY` | Log verbosity |
| `LLAMA_LOG_PREFIX` | Log prefix |
| `LLAMA_LOG_TIMESTAMPS` | Log timestamps |

## Usage Examples

```bash
# Interactive chat
./llama-cli -m model.gguf -i

# Generate from prompt
./llama-cli -m model.gguf -p "Once upon a time" -n 256

# With system prompt
./llama-cli -m model.gguf -sys "You are a helpful assistant" -i

# With JSON output
./llama-cli -m model.gguf -j '{"type": "object"}'
```
