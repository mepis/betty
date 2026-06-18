# Betty Benchmark Engine

The benchmark engine (`index.js`) orchestrates the full benchmark lifecycle: initialization, building llama.cpp, running test iterations, and producing results.

## Lifecycle Overview

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Initializing: POST /api/run
    Initializing --> Building: clone/pull success
    Initializing --> Failed: clone/pull error
    Building --> BuildFailed: cmake/make error
    Building --> Testing: build success
    BuildFailed --> Failed
    Testing --> Testing: next test run
    Testing --> Stopped: POST /api/stop
    Testing --> Complete: all params at max
    Testing --> Failed: max errors reached
    Testing --> Aborted: memory threshold exceeded
    Complete --> Stopping
    Failed --> Stopping
    Stopped --> Stopping
    Stopping --> [*]
```

## Phase 1: Initialization

```mermaid
sequenceDiagram
    participant Engine as index.js
    participant Git as Git (llama.cpp)
    participant Build as Build System

    Engine->>Engine: Stop llama.service
    Engine->>Engine: ensureNoLlamaServer()
    alt Existing server found
        Engine->>Engine: SIGTERM → wait 2s → SIGKILL
        Engine->>Engine: waitForPortFree(port)
    end

    Engine->>Engine: isCloned()
    alt Not cloned
        Engine->>Git: git clone https://github.com/ggml-org/llama.cpp
    else Already cloned
        Engine->>Git: git stash && git pull
    end

    alt skip_build is false
        Engine->>Build: cmake -B build -DCMAKE_BUILD_TYPE=Release [flags]
        Engine->>Build: cmake --build build --config Release -j N --clean-first
        Build-->>Engine: llama-server binary
    end
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `main()` | Entry point — orchestrates init → build → test loop → cleanup |
| `initController()` | Calls `init()` then `runBuild()` |
| `init()` | Clones or pulls llama.cpp repository |
| `isCloned()` | Checks if `llama.cpp/` directory exists |
| `runBuild()` | Runs cmake configure + make build |
| `runClone()` | `git clone https://github.com/ggml-org/llama.cpp` |
| `runPull()` | `git stash && git pull` in existing repo |
| `ensureNoLlamaServer()` | Kills any existing llama-server processes |
| `waitForPortFree(port)` | Waits for port to be free (handles TIME_WAIT) |

## Phase 2: Test Loop

```mermaid
graph TD
    A[Start test run] --> B[Check system memory]
    B -->|≥ max_sys_mem%| C[Abort — record reason]
    B -->|OK| D[ensureNoLlamaServer]
    D --> E[startLlamaServer with retry]
    E -->|5 retries max| F[Run 4 messages]
    F --> G[stopLlamaServer]
    G --> H[writeResultsToMarkdown]
    H --> I[updateConfigs — advance params]
    I --> J{All params at max?}
    J -->|No| A
    J -->|Yes| K[Benchmark complete]
```

### Test Run Structure

Each test run sends **4 sequential messages** to the llama-server chat endpoint, accumulating context each turn:

```mermaid
sequenceDiagram
    participant Engine as index.js
    participant Server as llama-server

    Engine->>Server: POST /chat/completions<br/>[msg1]
    Server-->>Engine: response1 + timings
    Engine->>Server: POST /chat/completions<br/>[msg1, response1, msg2]
    Server-->>Engine: response2 + timings
    Engine->>Server: POST /chat/completions<br/>[msg1, resp1, msg2, resp2, msg3]
    Server-->>Engine: response3 + timings
    Engine->>Server: POST /chat/completions<br/>[msg1..resp2, msg3, resp3, msg4]
    Server-->>Engine: response4 + timings
```

The messages are defined in `configs.benchmark_messages`:
1. "Develop a design doc for a self-hosted tetris clone web-based game."
2. "Audit the design doc."
3. "Recommend optimizations."
4. "Create a social-media marketing campaign for it."

### Message Timing

```mermaid
graph LR
    A[Send request] --> B[axios.post /chat/completions]
    B --> C[LLM processes prompt]
    C --> D[LLM generates tokens]
    D --> E[Response received]
    E --> F[Measure: totalTimeMs, promptTokens, completionTokens]
    F --> G[Calculate: promptTokensPerSec, generatedTokensPerSec]
```

## Phase 3: Configuration Advancement

Between test runs, the engine advances test parameters to explore the configuration space:

```mermaid
graph TD
    A[updateConfigs] --> B[contextLength = min contextLength × multiplier, max]
    A --> C[gpuLayerOffload = min offload + step, max]
    A --> D[batchSize = min batch + step, max]
    A --> E[uBatchSize = min ubatch + step, max]
    A --> F[cacheRam = min cache + step, max]
```

### Test Parameters (from `configs.test_params`)

| Parameter | Default | Step | Max | Effect |
|-----------|---------|------|-----|--------|
| `context_length` | 32,768 | ×2 (multiplier) | 262,144 | Maximum context window |
| `context_length_multiplier` | 2 | — | — | Multiplier for each run |
| `gpu_layer_offload` | 999 | 0 | 999 | Layers offloaded to GPU |
| `batch_size` | 128 | +128 | 16,384 | Batch size for prompt processing |
| `u_batch_size` | 64 | +64 | 4,096 | Ubatch size for generation |
| `cache_ram` | 4,096 GB | +1,024 | 4,096 GB | RAM cache for prompt |

### Termination Conditions

The benchmark stops when:
1. **All parameters at maximum**: `areAllVariablesAtMax()` returns true
2. **Error threshold**: `errorCount >= maxErrors` (10)
3. **Memory threshold**: System memory usage ≥ `max_sys_mem` (default 93%)
4. **Manual stop**: `POST /api/stop` received

## Phase 4: Results Output

### Per-Message Metrics

For each of the 4 messages:
- `promptTokens` — tokens in the prompt
- `generatedTokens` — tokens generated by the model
- `totalTimeMs` — total request time
- `promptTimeMs` — time for prompt processing
- `predictedTimeMs` — time for token generation
- `promptTokensPerSec` — throughput for prompt processing
- `generatedTokensPerSec` — throughput for generation
- `mem` — system memory at time of request

### Per-Test-Run Averages

```javascript
{
  testRunId: N,
  contextLength: ...,
  batchSize: ...,
  uBatchSize: ...,
  cacheRam: ...,
  gpuLayerOffload: ...,
  averages: {
    totalPromptTokens: sum(all messages),
    totalGeneratedTokens: sum(all messages),
    totalTimeMs: sum(all messages),
    avgPromptTokensPerSec: mean of per-message rates,
    avgGenTokensPerSec: mean of per-message rates,
    avgMemUsed: mean of per-message memory,
    avgMemTotal: total system memory
  }
}
```

### Markdown Output (`results.md`)

The engine writes 5 tables to `results.md`:

1. **Per-Message Results** — individual message metrics
2. **Test Run Averages** — aggregated per-run metrics
3. **Server Parameters** — model/server config per run
4. **CMake Build Flags** — build flags per run
5. **Environment Variables** — env vars per run

```
# llama.cpp Benchmark Results

Generated: 2026-06-17T14:30:00.000Z
Model: hf_downloads/model.gguf

## Per-Message Results
| Test Run | Message | Context Len | Messages in Context | Prompt Tokens | Generated Tokens | Total Time (ms) | Prompt Tokens/sec | Gen Tokens/sec | Memory (GB) |
|----------|---------|-------------|---------------------|---------------|------------------|-----------------|-------------------|----------------|-------------|
| 1 | 1 | 32768 | 1 | 1234 | 5678 | 12345 | 100.5 | 460.2 | 8 / 64 GB |
...
```

## Error Handling

```mermaid
graph TD
    A[Error occurs] --> B{Error type?}
    B -->|Port binding| C[Retry llama-server up to 5 times]
    B -->|Chat request failed| D[Increment errorCount]
    B -->|Build failed| E[Fail initController → exit 1]
    B -->|Max errors reached| F[Set isRunning = false → stop loop]
    B -->|Memory threshold| G[Abort test run, record reason]
    B -->|Unexpected| H[catch block → exit 1]
    C --> I{Success?}
    I -->|Yes| J[Continue benchmark]
    I -->|No| E
```

Key error handling patterns:
- **Port binding**: 5 retries with 2s delay between attempts; checks for `couldn't bind` and `HTTP server error`
- **Health polling**: After 3s survival, polls `/health` up to 120 times (2 minutes)
- **Port cleanup**: `waitForPortFree()` checks TIME_WAIT state, force-kills leftover processes
- **Error threshold**: `maxErrors = 10` — benchmark stops after 10 errors
- **Signal handlers**: SIGTERM/SIGINT trigger graceful shutdown via `stopLlamaServer()`
- **Uncaught exceptions**: Caught and trigger shutdown

## Server Lifecycle

```mermaid
sequenceDiagram
    participant E as Engine
    participant S as llama-server
    participant P as Port

    E->>S: startLlamaServer() [spawn]
    S->>P: bind port 11434
    alt Binding fails
        S->>S: early death (<3s)
        E->>E: retry (up to 5)
        E->>S: startLlamaServer() [retry]
    end
    S->>S: survive 3s
    E->>S: poll /health (up to 120×)
    S-->>E: 200 OK
    E->>E: server ready

    loop Benchmark
        E->>S: chat/completions
        S-->>E: response
    end

    E->>S: POST /shutdown
    alt /shutdown fails
        E->>S: SIGTERM
        E->>S: wait 10s → SIGKILL
    end
    E->>P: waitForPortFree(port)
```

## CLI Flags

| Flag | Effect |
|------|--------|
| `--no-build` | Skip llama.cpp build phase |
| `--build-only` | Build llama.cpp then exit (no benchmark) |

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `GGML_CUDA_ENABLE_UNIFIED_MEMORY` | Enable CUDA unified memory | `1` |
| `CUDA_SCALE_LAUNCH_QUEUES` | Scale launch queues | `4x` |
| `LLAMA_CACHE` | KV cache directory | `llama_cache` |
| `GGML_CUDA_P2P` | Enable peer-to-peer | `on` |
| `LLAMA_ARG_FIT` | Enable fit mode | `on` |
| `LLAMA_ARG_FIT_TARGET` | Fit target size | `256` |
| `LLAMA_ARG_FIT_CTX` | Fit context size | `131072` |
| `CUDACXX` | NVCC path | `/usr/local/cuda/bin/nvcc` |

## See Also

- [[betty-architecture]] — System architecture
- [[betty-configuration]] — Configuration system
- [[betty-api-reference]] — API endpoints that trigger the engine

## Tags

betty, benchmark, llama.cpp, performance, metrics, cuda
