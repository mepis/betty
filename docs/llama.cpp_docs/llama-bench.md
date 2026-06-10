# Llama Bench Binary Documentation

## Overview

The `llama-bench` binary benchmarks the performance of llama models. It measures tokens per second across different configurations and hardware setups.

## Command-Line Flags

### General Options

| Flag                  | Description                               | Default |
| --------------------- | ----------------------------------------- | ------- |
| `-h, --help, --usage` | Print usage and exit                      | -       |
| `--version`           | Show version and build info               | -       |
| `--license`           | Show source code license and dependencies | -       |

### Model Options

| Flag                 | Description                   | Default |
| -------------------- | ----------------------------- | ------- |
| `-m, --model`        | Model path to load            | -       |
| `-mu, --model-url`   | Model download URL            | -       |
| `-dr, --docker-repo` | Docker Hub model repository   | -       |
| `-hf, --hf-repo`     | Hugging Face model repository | -       |
| `-hff, --hf-file`    | Hugging Face model file       | -       |
| `-hft, --hf-token`   | Hugging Face access token     | -       |

### Benchmark Options

| Flag                 | Description                      | Default |
| -------------------- | -------------------------------- | ------- |
| `-npp`               | Number of prompt tokens          | -       |
| `-ntg`               | Number of text generation tokens | -       |
| `-npl`               | Number of parallel prompts       | -       |
| `--output-format`    | Output format (md/jsonl)         | md      |
| `-kvu, --kv-unified` | Use unified KV buffer            | Auto    |

### CPU Options

| Flag                      | Description                    | Default              |
| ------------------------- | ------------------------------ | -------------------- |
| `-t, --threads`           | Number of CPU threads          | Hardware concurrency |
| `-tb, --threads-batch`    | Threads for batch processing   | Same as --threads    |
| `-C, --cpu-mask`          | CPU affinity mask (hex)        | -                    |
| `-Cr, --cpu-range`        | Range of CPUs for affinity     | -                    |
| `--cpu-strict`            | Use strict CPU placement       | 0                    |
| `--prio`                  | Process/thread priority (0-3)  | 0                    |
| `--poll`                  | Polling level (0-100)          | 50                   |
| `-Cb, --cpu-mask-batch`   | CPU affinity mask for batch    | Same as --cpu-mask   |
| `-Crb, --cpu-range-batch` | Range of CPUs for batch        | -                    |
| `--cpu-strict-batch`      | Strict CPU placement for batch | Same as --cpu-strict |
| `--prio-batch`            | Priority for batch             | Same as --prio       |
| `--poll-batch`            | Polling for batch              | Same as --poll       |

### Context Options

| Flag                 | Description            | Default |
| -------------------- | ---------------------- | ------- |
| `-c, --ctx-size`     | Size of prompt context | 0       |
| `-b, --batch-size`   | Logical batch size     | 2048    |
| `-ub, --ubatch-size` | Physical batch size    | 512     |

### Flash Attention

| Flag                | Description                       | Default |
| ------------------- | --------------------------------- | ------- |
| `-fa, --flash-attn` | Flash Attention use (on/off/auto) | auto    |

### Model Offloading

| Flag                                 | Description                 | Default |
| ------------------------------------ | --------------------------- | ------- |
| `--mlock`                            | Keep model in RAM           | 0       |
| `--mmap`                             | Memory-map model            | 1       |
| `-dio, --direct-io`                  | Use DirectIO                | 0       |
| `--numa`                             | NUMA optimization           | -       |
| `-dev, --device`                     | Devices for offloading      | -       |
| `-ngl, --gpu-layers, --n-gpu-layers` | GPU layers                  | Auto    |
| `-sm, --split-mode`                  | Split mode (none/layer/row) | layer   |
| `-ts, --tensor-split`                | Tensor split across GPUs    | -       |
| `-mg, --main-gpu`                    | Main GPU index              | 0       |
| `--override-kv`                      | Override model KV           | -       |

### Logging Options

| Flag               | Description                   | Default |
| ------------------ | ----------------------------- | ------- |
| `--log-file`       | Log to file                   | -       |
| `--log-colors`     | Colored logging (on/off/auto) | auto    |
| `-v, --verbose`    | Verbose mode                  | -       |
| `--offline`        | Offline mode                  | 0       |
| `-lv, --verbosity` | Verbosity level               | 3       |
| `--log-prefix`     | Enable log prefix             | 0       |
| `--log-timestamps` | Enable timestamps             | 0       |

## Environment Variables

| Variable                 | Description           |
| ------------------------ | --------------------- |
| `LLAMA_ARG_THREADS`      | Number of CPU threads |
| `LLAMA_ARG_MODEL`        | Model path            |
| `LLAMA_ARG_MODEL_URL`    | Model URL             |
| `LLAMA_ARG_DOCKER_REPO`  | Docker repo           |
| `LLAMA_ARG_HF_REPO`      | HF repo               |
| `LLAMA_ARG_HF_FILE`      | HF file               |
| `HF_TOKEN`               | HF access token       |
| `LLAMA_ARG_MLOCK`        | Memory lock           |
| `LLAMA_ARG_MMAP`         | Memory map            |
| `LLAMA_ARG_DIO`          | Direct IO             |
| `LLAMA_ARG_NUMA`         | NUMA strategy         |
| `LLAMA_ARG_DEVICE`       | Device list           |
| `LLAMA_ARG_N_GPU_LAYERS` | GPU layers            |
| `LLAMA_ARG_SPLIT_MODE`   | Split mode            |
| `LLAMA_ARG_TENSOR_SPLIT` | Tensor split          |
| `LLAMA_ARG_MAIN_GPU`     | Main GPU              |
| `LLAMA_ARG_CTX_SIZE`     | Context size          |
| `LLAMA_ARG_BATCH`        | Batch size            |
| `LLAMA_ARG_UBATCH`       | Batch size            |
| `LLAMA_ARG_FLASH_ATTN`   | Flash attention       |
| `LLAMA_ARG_KV_UNIFIED`   | KV unified            |
| `LLAMA_LOG_FILE`         | Log file              |
| `LLAMA_LOG_COLORS`       | Log colors            |
| `LLAMA_OFFLINE`          | Offline mode          |
| `LLAMA_LOG_VERBOSITY`    | Log verbosity         |
| `LLAMA_LOG_PREFIX`       | Log prefix            |
| `LLAMA_LOG_TIMESTAMPS`   | Log timestamps        |

## Usage Examples

```bash
# Basic benchmark
./llama-bench -m model.gguf -npp 512 -ntg 512

# Multi-GPU benchmark
./llama-bench -m model.gguf -npp 512 -ntg 512 -ts 16,16

# JSON output
./llama-bench -m model.gguf -npp 512 -ntg 512 --output-format jsonl
```

options:
-h, --help
--numa <distribute|isolate|numactl> numa mode (default: disabled)
-r, --repetitions <n> number of times to repeat each test (default: 5)
--prio <-1|0|1|2|3> process/thread priority (default: 0)
--delay <0...N> (seconds) delay between each test (default: 0)
-o, --output <csv|json|jsonl|md|sql> output format printed to stdout (default: md)
-oe, --output-err <csv|json|jsonl|md|sql> output format printed to stderr (default: none)
--list-devices list available devices and exit
-v, --verbose verbose output
--progress print test progress indicators
--no-warmup skip warmup runs before benchmarking
-fitt, --fit-target <MiB> fit model to device memory with this margin per device in MiB (default: off)
-fitc, --fit-ctx <n> minimum ctx size for --fit-target (default: 4096)

test parameters:
-m, --model <filename> (default: models/7B/ggml-model-q4_0.gguf)
-hf, -hfr, --hf-repo <user>/<model>[:quant] Hugging Face model repository; quant is optional, case-insensitive
default to Q4_K_M, or falls back to the first file in the repo if Q4_K_M doesn't exist.
example: ggml-org/GLM-4.7-Flash-GGUF:Q4_K_M
(default: unused)
-hff, --hf-file <file> Hugging Face model file. If specified, it will override the quant in --hf-repo
(default: unused)
-hft, --hf-token <token> Hugging Face access token
(default: value from HF_TOKEN environment variable)
-p, --n-prompt <n> (default: 512)
-n, --n-gen <n> (default: 128)
-pg <pp,tg> (default: )
-d, --n-depth <n> (default: 0)
-b, --batch-size <n> (default: 2048)
-ub, --ubatch-size <n> (default: 512)
-ctk, --cache-type-k <t> (default: f16)
-ctv, --cache-type-v <t> (default: f16)
-t, --threads <n> (default: 8)
-C, --cpu-mask <hex,hex> (default: 0x0)
--cpu-strict <0|1> (default: 0)
--poll <0...100> (default: 50)
-ngl, --n-gpu-layers <n> (default: 99)
-ncmoe, --n-cpu-moe <n> (default: 0)
-sm, --split-mode <none|layer|row|tensor> (default: layer)
-mg, --main-gpu <i> (default: 0)
-nkvo, --no-kv-offload <0|1> (default: 0)
-fa, --flash-attn <0|1> (default: 0)
-dev, --device <dev0/dev1/...> (default: auto)
-mmp, --mmap <0|1> (default: 1)
-dio, --direct-io <0|1> (default: 0)
-embd, --embeddings <0|1> (default: 0)
-ts, --tensor-split <ts0/ts1/..> (default: 0)
-ot --override-tensor <tensor name pattern>=<buffer type>;...
(default: disabled)
-nopo, --no-op-offload <0|1> (default: 0)
--no-host <0|1> (default: 0)

Multiple values can be given for each parameter by separating them with ','
or by specifying the parameter multiple times. Ranges can be given as
'first-last' or 'first-last+step' or 'first-last\*mult'.
