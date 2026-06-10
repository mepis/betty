# Server Binary Documentation

## Overview

The `llama-server` binary provides an HTTP/HTTPS server implementation for running LLM models via API. It implements the OpenAI-compatible API and supports various features including chat completions, embeddings, reranking, and multimodal models.

## Build Requirements

- CUDA support (`-DGGML_CUDA=ON`)
- OpenBLAS support (`-DGGML_BLAS=ON`)
- Server enabled (`-DLLAMA_BUILD_SERVER=ON`)

## Command-Line Flags

### General Options

| Flag | Description | Default |
|------|-------------|---------|
| `-h, --help, --usage` | Print usage and exit | - |
| `--version` | Show version and build info | - |
| `--license` | Show source code license and dependencies | - |
| `--cache-list` | Show list of models in cache | - |
| `--completion-bash` | Print source-able bash completion script | - |

### Model Options

| Flag | Description | Default |
|------|-------------|---------|
| `-m, --model` | Model path to load | - |
| `-mu, --model-url` | Model download URL | - |
| `-dr, --docker-repo` | Docker Hub model repository | - |
| `-hf, --hf-repo` | Hugging Face model repository | - |
| `-hfd, --hf-repo-draft` | Hugging Face model repository for draft model | - |
| `-hff, --hf-file` | Hugging Face model file | - |
| `-hfv, --hf-repo-v` | Hugging Face model repository for vocoder | - |
| `-hffv, --hf-file-v` | Hugging Face model file for vocoder | - |
| `-hft, --hf-token` | Hugging Face access token | - |
| `--lora` | Path to LoRA adapter (comma-separated) | - |
| `--lora-scaled` | Path to LoRA adapter with scale (FNAME:SCALE) | - |
| `--control-vector` | Add control vector (comma-separated) | - |
| `--control-vector-scaled` | Control vector with scale (FNAME:SCALE) | - |
| `--control-vector-layer-range` | Layer range for control vector | - |

### CPU Options

| Flag | Description | Default |
|------|-------------|---------|
| `-t, --threads` | Number of CPU threads | Hardware concurrency |
| `-tb, --threads-batch` | Threads for batch processing | Same as --threads |
| `-C, --cpu-mask` | CPU affinity mask (hex) | - |
| `-Cr, --cpu-range` | Range of CPUs for affinity | - |
| `--cpu-strict` | Use strict CPU placement | 0 |
| `--prio` | Process/thread priority (0-3) | 0 (normal) |
| `--poll` | Polling level (0-100) | 50 |
| `-Cb, --cpu-mask-batch` | CPU affinity mask for batch | Same as --cpu-mask |
| `-Crb, --cpu-range-batch` | Range of CPUs for batch | - |
| `--cpu-strict-batch` | Strict CPU placement for batch | Same as --cpu-strict |
| `--prio-batch` | Priority for batch | Same as --prio |
| `--poll-batch` | Polling for batch | Same as --poll |

### Context Options

| Flag | Description | Default |
|------|-------------|---------|
| `-c, --ctx-size` | Size of prompt context | 0 (loaded from model) |
| `-n, --predict, --n-predict` | Number of tokens to predict | -1 (infinity) |
| `-b, --batch-size` | Logical batch size | 2048 |
| `-ub, --ubatch-size` | Physical batch size | 512 |
| `--keep` | Tokens to keep from initial prompt | 0 |
| `--swa-full` | Use full-size SWA cache | 0 |
| `-ctxcp, --ctx-checkpoints` | Max context checkpoints per slot | 32 |
| `-cpent, --checkpoint-every-n-tokens` | Checkpoint every N tokens | 8192 |
| `-cram, --cache-ram` | Maximum cache size in MiB | 8192 |
| `-kvu, --kv-unified` | Use unified KV buffer | Auto |
| `--context-shift` | Context shift on infinite generation | 0 |
| `--chunks` | Max chunks to process | -1 (all) |

### Flash Attention

| Flag | Description | Default |
|------|-------------|---------|
| `-fa, --flash-attn` | Flash Attention use (on/off/auto) | auto |

### Sampling Options

| Flag | Description | Default |
|------|-------------|---------|
| `-s, --seed` | RNG seed | Random |
| `--sampler-seq` | Simplified sampler sequence | Default |
| `--ignore-eos` | Ignore end of stream token | 0 |
| `--temp, --temperature` | Temperature | 0.80 |
| `--top-k` | Top-K sampling | 40 |
| `--top-p` | Top-P sampling | 0.95 |
| `--min-p` | Min-P sampling | 0.05 |
| `--top-nsigma, --top-n-sigma` | Top-n-sigma sampling | -1.0 |
| `--xtc-probability` | XTC probability | 0.00 |
| `--xtc-threshold` | XTC threshold | 0.10 |
| `--typical, --typical-p` | Locally typical sampling | 1.00 |
| `--repeat-last-n` | Last N tokens for penalty | 64 |
| `--repeat-penalty` | Penalize repeats | 1.00 |
| `--presence-penalty` | Presence penalty | 0.00 |
| `--frequency-penalty` | Frequency penalty | 0.00 |
| `--dry-multiplier` | DRY sampling multiplier | 0.0 |
| `--dry-base` | DRY sampling base | 1.75 |
| `--dry-allowed-length` | DRY allowed length | 2 |
| `--dry-penalty-last-n` | DRY penalty last N | -1 |
| `--dry-sequence-breaker` | DRY sequence breaker | `\n`, `:`, `"`, `*` |
| `--adaptive-target` | Adaptive target probability | -1.0 |
| `--adaptive-decay` | Adaptive decay rate | 0.90 |
| `--dynatemp-range` | Dynamic temperature range | 0.00 |
| `--dynatemp-exp` | Dynamic temperature exponent | 1.00 |
| `--mirostat` | Mirostat sampling (0/1/2) | 0 |
| `--mirostat-lr` | Mirostat learning rate (eta) | 0.10 |
| `--mirostat-ent` | Mirostat target entropy (tau) | 5.00 |
| `-l, --logit-bias` | Logit bias (TOKEN_ID+/-BIAS) | - |
| `--grammar` | BNF-like grammar | - |
| `--grammar-file` | Grammar file | - |
| `-j, --json-schema` | JSON schema | - |
| `-jf, --json-schema-file` | JSON schema file | - |
| `-bs, --backend-sampling` | Enable backend sampling | 0 |

### Model Offloading

| Flag | Description | Default |
|------|-------------|---------|
| `--mlock` | Keep model in RAM | 0 |
| `--mmap` | Memory-map model | 1 |
| `-dio, --direct-io` | Use DirectIO | 0 |
| `--numa` | NUMA optimization (distribute/isolate/numactl) | - |
| `-dev, --device` | Devices for offloading | - |
| `--list-devices` | List available devices | - |
| `-ot, --override-tensor` | Override tensor buffer type | - |
| `-otd, --override-tensor-draft` | Override draft tensor buffer | - |
| `-cmoe, --cpu-moe` | Keep all MoE weights on CPU | 0 |
| `-ncmoe, --n-cpu-moe` | Keep first N MoE layers on CPU | 0 |
| `-cmoed, --cpu-moe-draft` | Keep all draft MoE on CPU | 0 |
| `-ncmoed, --n-cpu-moe-draft` | Keep first N draft MoE on CPU | 0 |
| `-ngl, --gpu-layers, --n-gpu-layers` | GPU layers | Auto |
| `-sm, --split-mode` | Split mode (none/layer/row) | layer |
| `-ts, --tensor-split` | Tensor split across GPUs | - |
| `-mg, --main-gpu` | Main GPU index | 0 |
| `-fit, --fit` | Fit model to device memory | on |
| `-fitt, --fit-target` | Fit target margin per device | 1024 MiB |
| `-fitc, --fit-ctx` | Minimum ctx size for fit | 4096 |
| `--override-kv` | Override model KV | - |
| `--op-offload` | Offload host ops to device | 1 |

### Server-Specific Options

| Flag | Description | Default |
|------|-------------|---------|
| `-np, --parallel` | Number of server slots | -1 (auto) |
| `-ns, --sequences` | Number of sequences | 1 |
| `-cb, --cont-batching` | Enable continuous batching | 1 |
| `--host` | IP address to bind | 127.0.0.1 |
| `--port` | Port to listen on | 8080 |
| `--path` | Path to serve static files | - |
| `--api-prefix` | API prefix path | - |
| `--webui-config` | JSON WebUI settings | - |
| `--webui-config-file` | WebUI config file | - |
| `--webui-mcp-proxy` | Enable MCP CORS proxy | 0 |
| `--tools` | Enable built-in tools | - |
| `--webui` | Enable Web UI | 1 |
| `--embedding, --embeddings` | Embedding-only mode | 0 |
| `--rerank, --reranking` | Enable reranking endpoint | 0 |
| `--api-key` | API key (comma-separated) | - |
| `--api-key-file` | API keys file | - |
| `--ssl-key-file` | SSL private key file | - |
| `--ssl-cert-file` | SSL certificate file | - |
| `--chat-template-kwargs` | Chat template kwargs (JSON) | - |
| `-to, --timeout` | Read/write timeout (seconds) | 600 |
| `--threads-http` | HTTP request threads | -1 |
| `--cache-prompt` | Enable prompt caching | 1 |
| `--cache-reuse` | Min chunk size for cache reuse | 0 |
| `--metrics` | Enable metrics endpoint | 0 |
| `--props` | Enable props endpoint | 0 |
| `--slots` | Enable slots endpoint | 1 |
| `--slot-save-path` | Path to save slot KV cache | - |
| `--media-path` | Directory for media files | - |
| `--models-dir` | Models directory (router server) | - |
| `--models-preset` | Model preset file | - |
| `--models-max` | Max models to load | 4 |
| `--models-autoload` | Auto-load models | 1 |
| `--jinja` | Use Jinja template engine | 1 |
| `--reasoning-format` | Reasoning format | auto |
| `-rea, --reasoning` | Enable reasoning (on/off/auto) | auto |
| `--reasoning-budget` | Reasoning token budget | -1 |
| `--reasoning-budget-message` | Budget exhausted message | - |
| `--chat-template` | Custom Jinja chat template | - |
| `--chat-template-file` | Custom chat template file | - |
| `--skip-chat-parsing` | Force pure content parser | 0 |
| `--prefill-assistant` | Prefill assistant message | 1 |
| `-sps, --slot-prompt-similarity` | Prompt similarity threshold | 0.10 |
| `--lora-init-without-apply` | Load LoRA without applying | 0 |
| `--sleep-idle-seconds` | Sleep after idle seconds | -1 |

### Multimodal Options

| Flag | Description | Default |
|------|-------------|---------|
| `-mm, --mmproj` | Multimodal projector file | - |
| `-mmu, --mmproj-url` | Multimodal projector URL | - |
| `--mmproj-auto` | Auto-load mmproj | 1 |
| `--mmproj-offload` | GPU offload for mmproj | 1 |
| `--image, --audio` | Image or audio file | - |
| `--image-min-tokens` | Min image tokens | -1 |
| `--image-max-tokens` | Max image tokens | -1 |

### RPC Options

| Flag | Description | Default |
|------|-------------|---------|
| `--rpc` | Comma-separated RPC servers | - |

### Speculative Decoding Options

| Flag | Description | Default |
|------|-------------|---------|
| `-td, --threads-draft` | Draft model threads | Same as --threads |
| `-tbd, --threads-batch-draft` | Draft batch threads | Same as --threads-draft |
| `-Cd, --cpu-mask-draft` | Draft CPU affinity mask | Same as --cpu-mask |
| `-Crd, --cpu-range-draft` | Draft CPU range | - |
| `--cpu-strict-draft` | Strict CPU for draft | Same as --cpu-strict |
| `--prio-draft` | Priority for draft | Same as --prio |
| `--poll-draft` | Polling for draft | Same as --poll |
| `-Cbd, --cpu-mask-batch-draft` | Draft batch CPU mask | Same as --cpu-mask |
| `-Crbd, --cpu-range-batch-draft` | Draft batch CPU range | - |
| `--cpu-strict-batch-draft` | Strict batch for draft | Same as --cpu-strict-draft |
| `--prio-batch-draft` | Priority for draft batch | Same as --prio-draft |
| `--poll-batch-draft` | Polling for draft batch | Same as --poll-draft |
| `--draft, --draft-n, --draft-max` | Draft tokens | 16 |
| `--draft-min, --draft-n-min` | Min draft tokens | 0 |
| `--draft-p-split` | Split probability | 0.10 |
| `--draft-p-min` | Min draft probability | 0.75 |
| `-cd, --ctx-size-draft` | Draft context size | 0 |
| `-devd, --device-draft` | Draft model devices | - |
| `-ngld, --gpu-layers-draft` | Draft GPU layers | Auto |
| `-md, --model-draft` | Draft model path | - |
| `--spec-replace` | Model string replacement | - |
| `--spec-type` | Speculative type | none |
| `--spec-ngram-size-n` | Ngram size N | 12 |
| `--spec-ngram-size-m` | Ngram size M | 48 |
| `--spec-ngram-min-hits` | Ngram min hits | 1 |
| `--lookup-cache-static` | Static lookup cache | - |
| `--lookup-cache-dynamic` | Dynamic lookup cache | - |

### KV Cache Options

| Flag | Description | Default |
|------|-------------|---------|
| `-ctk, --cache-type-k` | KV cache K type | F16 |
| `-ctv, --cache-type-v` | KV cache V type | F16 |
| `-ctkd, --cache-type-k-draft` | Draft KV cache K type | F16 |
| `-ctvd, --cache-type-v-draft` | Draft KV cache V type | F16 |

### TTS Options

| Flag | Description | Default |
|------|-------------|---------|
| `-mv, --model-vocoder` | Vocoder model path | - |
| `--tts-use-guide-tokens` | Use guide tokens | 0 |
| `--tts-speaker-file` | Speaker file path | - |

### Diffusion Options

| Flag | Description | Default |
|------|-------------|---------|
| `--diffusion-steps` | Diffusion steps | 128 |
| `--diffusion-visual` | Visual diffusion mode | 0 |
| `--diffusion-eps` | Epsilon for timesteps | 0 |
| `--diffusion-algorithm` | Diffusion algorithm | 4 |
| `--diffusion-alg-temp` | Algorithm temperature | 0.0 |
| `--diffusion-block-length` | Block length | 0 |
| `--diffusion-cfg-scale` | CFG scale | 0 |
| `--diffusion-add-gumbel-noise` | Add Gumbel noise | 0 |

### Logging Options

| Flag | Description | Default |
|------|-------------|---------|
| `--log-disable` | Disable logging | - |
| `--log-file` | Log to file | - |
| `--log-colors` | Colored logging (on/off/auto) | auto |
| `-v, --verbose` | Verbose mode | - |
| `--offline` | Offline mode | 0 |
| `-lv, --verbosity` | Verbosity level | 3 |
| `--log-prefix` | Enable log prefix | 0 |
| `--log-timestamps` | Enable timestamps | 0 |

### RoPE Options

| Flag | Description | Default |
|------|-------------|---------|
| `--rope-scaling` | RoPE scaling (none/linear/yarn) | - |
| `--rope-scale` | RoPE scale factor | - |
| `--rope-freq-base` | RoPE base frequency | - |
| `--rope-freq-scale` | RoPE freq scale | - |
| `--yarn-orig-ctx` | YaRN original context | - |
| `--yarn-ext-factor` | YaRN ext factor | -1.0 |
| `--yarn-attn-factor` | YaRN attn factor | -1.0 |
| `--yarn-beta-slow` | YaRN beta slow | -1.0 |
| `--yarn-beta-fast` | YaRN beta fast | -1.0 |

### Group Attention Options

| Flag | Description | Default |
|------|-------------|---------|
| `-gan, --grp-attn-n` | Group attention factor | 1 |
| `-gaw, --grp-attn-w` | Group attention width | 512 |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `LLAMA_ARG_THREADS` | Number of CPU threads |
| `LLAMA_ARG_CTX_SIZE` | Context size |
| `LLAMA_ARG_N_PREDICT` | Number of tokens to predict |
| `LLAMA_ARG_BATCH` | Batch size |
| `LLAMA_ARG_UBATCH` | Physical batch size |
| `LLAMA_ARG_SWA_FULL` | Use full-size SWA cache |
| `LLAMA_ARG_CTX_CHECKPOINTS` | Context checkpoints |
| `LLAMA_ARG_CHECKPOINT_EVERY_NT` | Checkpoint every N tokens |
| `LLAMA_ARG_CACHE_RAM` | Cache RAM size |
| `LLAMA_ARG_KV_UNIFIED` | Use unified KV buffer |
| `LLAMA_ARG_CONTEXT_SHIFT` | Context shift |
| `LLAMA_ARG_FLASH_ATTN` | Flash attention |
| `LLAMA_ARG_PERF` | Performance timings |
| `LLAMA_ARG_SHOW_TIMINGS` | Show timings |
| `LLAMA_ARG_TOP_K` | Top-K sampling |
| `LLAMA_ARG_BACKEND_SAMPLING` | Backend sampling |
| `LLAMA_ARG_POOLING` | Pooling type |
| `LLAMA_ARG_ROPE_SCALING_TYPE` | RoPE scaling type |
| `LLAMA_ARG_ROPE_SCALE` | RoPE scale |
| `LLAMA_ARG_ROPE_FREQ_BASE` | RoPE freq base |
| `LLAMA_ARG_ROPE_FREQ_SCALE` | RoPE freq scale |
| `LLAMA_ARG_YARN_ORIG_CTX` | YaRN orig ctx |
| `LLAMA_ARG_YARN_EXT_FACTOR` | YaRN ext factor |
| `LLAMA_ARG_YARN_ATTN_FACTOR` | YaRN attn factor |
| `LLAMA_ARG_YARN_BETA_SLOW` | YaRN beta slow |
| `LLAMA_ARG_YARN_BETA_FAST` | YaRN beta fast |
| `LLAMA_ARG_GRP_ATTN_N` | Group attn N |
| `LLAMA_ARG_GRP_ATTN_W` | Group attn W |
| `LLAMA_ARG_KV_OFFLOAD` | KV offload |
| `LLAMA_ARG_REPACK` | Repack |
| `LLAMA_ARG_NO_HOST` | No host buffer |
| `LLAMA_ARG_CACHE_TYPE_K` | Cache type K |
| `LLAMA_ARG_CACHE_TYPE_V` | Cache type V |
| `LLAMA_ARG_DEFRAG_THOLD` | Defrag threshold |
| `LLAMA_ARG_N_PARALLEL` | Parallel slots |
| `LLAMA_ARG_CONT_BATCHING` | Cont batching |
| `LLAMA_ARG_MMPROJ` | Multimodal projector |
| `LLAMA_ARG_MMPROJ_URL` | MMProj URL |
| `LLAMA_ARG_MMPROJ_AUTO` | MMproj auto |
| `LLAMA_ARG_MMPROJ_OFFLOAD` | MMproj offload |
| `LLAMA_ARG_IMAGE_MIN_TOKENS` | Image min tokens |
| `LLAMA_ARG_IMAGE_MAX_TOKENS` | Image max tokens |
| `LLAMA_ARG_RPC` | RPC servers |
| `LLAMA_ARG_MLOCK` | Memory lock |
| `LLAMA_ARG_MMAP` | Memory map |
| `LLAMA_ARG_DIO` | Direct IO |
| `LLAMA_ARG_NUMA` | NUMA strategy |
| `LLAMA_ARG_DEVICE` | Device list |
| `LLAMA_ARG_OVERRIDE_TENSOR` | Override tensor |
| `LLAMA_ARG_CPU_MOE` | CPU MoE |
| `LLAMA_ARG_N_CPU_MOE` | N CPU MoE |
| `LLAMA_ARG_CPU_MOE_DRAFT` | CPU MoE draft |
| `LLAMA_ARG_N_CPU_MOE_DRAFT` | N CPU MoE draft |
| `LLAMA_ARG_N_GPU_LAYERS` | GPU layers |
| `LLAMA_ARG_SPLIT_MODE` | Split mode |
| `LLAMA_ARG_TENSOR_SPLIT` | Tensor split |
| `LLAMA_ARG_MAIN_GPU` | Main GPU |
| `LLAMA_ARG_FIT` | Fit model |
| `LLAMA_ARG_FIT_TARGET` | Fit target |
| `LLAMA_ARG_FIT_CTX` | Fit ctx size |
| `LLAMA_ARG_ALIAS` | Model aliases |
| `LLAMA_ARG_TAGS` | Model tags |
| `LLAMA_ARG_MODEL` | Model path |
| `LLAMA_ARG_MODEL_URL` | Model URL |
| `LLAMA_ARG_DOCKER_REPO` | Docker repo |
| `LLAMA_ARG_HF_REPO` | HF repo |
| `LLAMA_ARG_HFD_REPO` | HF draft repo |
| `LLAMA_ARG_HF_FILE` | HF file |
| `LLAMA_ARG_HF_REPO_V` | HF vocoder repo |
| `LLAMA_ARG_HF_FILE_V` | HF vocoder file |
| `HF_TOKEN` | HF access token |
| `LLAMA_ARG_HOST` | Host address |
| `LLAMA_ARG_PORT` | Port |
| `LLAMA_ARG_STATIC_PATH` | Static path |
| `LLAMA_ARG_API_PREFIX` | API prefix |
| `LLAMA_ARG_WEBUI_CONFIG` | WebUI config |
| `LLAMA_ARG_WEBUI_CONFIG_FILE` | WebUI config file |
| `LLAMA_ARG_WEBUI_MCP_PROXY` | WebUI MCP proxy |
| `LLAMA_ARG_TOOLS` | Tools |
| `LLAMA_ARG_WEBUI` | WebUI |
| `LLAMA_ARG_EMBEDDINGS` | Embeddings |
| `LLAMA_ARG_RERANKING` | Reranking |
| `LLAMA_API_KEY` | API key |
| `LLAMA_ARG_SSL_KEY_FILE` | SSL key file |
| `LLAMA_ARG_SSL_CERT_FILE` | SSL cert file |
| `LLAMA_CHAT_TEMPLATE_KWARGS` | Chat template kwargs |
| `LLAMA_ARG_TIMEOUT` | Timeout |
| `LLAMA_ARG_THREADS_HTTP` | HTTP threads |
| `LLAMA_ARG_CACHE_PROMPT` | Cache prompt |
| `LLAMA_ARG_CACHE_REUSE` | Cache reuse |
| `LLAMA_ARG_ENDPOINT_METRICS` | Metrics endpoint |
| `LLAMA_ARG_ENDPOINT_PROPS` | Props endpoint |
| `LLAMA_ARG_ENDPOINT_SLOTS` | Slots endpoint |
| `LLAMA_ARG_MODELS_DIR` | Models dir |
| `LLAMA_ARG_MODELS_PRESET` | Models preset |
| `LLAMA_ARG_MODELS_MAX` | Models max |
| `LLAMA_ARG_MODELS_AUTOLOAD` | Models autoload |
| `LLAMA_ARG_JINJA` | Jinja |
| `LLAMA_ARG_THINK` | Reasoning format |
| `LLAMA_ARG_REASONING` | Reasoning |
| `LLAMA_ARG_THINK_BUDGET` | Reasoning budget |
| `LLAMA_ARG_THINK_BUDGET_MESSAGE` | Reasoning budget message |
| `LLAMA_ARG_CHAT_TEMPLATE` | Chat template |
| `LLAMA_ARG_CHAT_TEMPLATE_FILE` | Chat template file |
| `LLAMA_ARG_SKIP_CHAT_PARSING` | Skip chat parsing |
| `LLAMA_ARG_PREFILL_ASSISTANT` | Prefill assistant |
| `LLAMA_ARG_N_GPU_LAYERS_DRAFT` | Draft GPU layers |
| `LLAMA_ARG_MODEL_DRAFT` | Draft model |
| `LLAMA_ARG_DRAFT_MAX` | Draft max |
| `LLAMA_ARG_DRAFT_MIN` | Draft min |
| `LLAMA_ARG_DRAFT_P_SPLIT` | Draft p split |
| `LLAMA_ARG_DRAFT_P_MIN` | Draft p min |
| `LLAMA_ARG_CTX_SIZE_DRAFT` | Draft ctx size |
| `LLAMA_ARG_CACHE_TYPE_K_DRAFT` | Draft cache K |
| `LLAMA_ARG_CACHE_TYPE_V_DRAFT` | Draft cache V |
| `LLAMA_ARG_SPEC_TYPE` | Spec type |
| `LLAMA_LOG_FILE` | Log file |
| `LLAMA_LOG_COLORS` | Log colors |
| `LLAMA_OFFLINE` | Offline mode |
| `LLAMA_LOG_VERBOSITY` | Log verbosity |
| `LLAMA_LOG_PREFIX` | Log prefix |
| `LLAMA_LOG_TIMESTAMPS` | Log timestamps |

## API Endpoints

- `POST /v1/chat/completions` - Chat completions
- `POST /v1/completions` - Completions
- `POST /v1/embeddings` - Embeddings
- `POST /v1/rerank` - Reranking
- `GET /api/models` - List models
- `GET /metrics` - Prometheus metrics (if enabled)
- `POST /props` - Change properties (if enabled)
- `GET /slots` - Slot monitoring (if enabled)
