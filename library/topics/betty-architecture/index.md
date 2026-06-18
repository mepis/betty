# Betty Architecture

This page covers the system architecture, data flow, and component relationships of the Betty benchmarking platform.

## System Architecture

```mermaid
graph TB
    subgraph Client
        Browser[Web Browser]
        Vue[Vue.js SPA]
        SSE_Client[SSE Client]
    end

    subgraph Betty_Server
        Express[Express API Server<br/>api-server.js:3456]
        CORS[CORS Middleware]
        Static[Static File Server]
        SSE_Broadcaster[SSE Broadcast Hub]
    end

    subgraph Benchmark_Process
        Runner[Benchmark Runner<br/>index.js]
        Build[Build Phase<br/>git clone + cmake + make]
        Server_Launch[llama-server Launch]
        Chat[Chat Loop<br/>4 messages × N runs]
        Cleanup[Cleanup Phase]
    end

    subgraph External
        HF[HuggingFace API<br/>api.huggingface.co]
        Git[GitHub<br/>github.com/ggml-org/llama.cpp]
    end

    subgraph Storage
        Config[configs.json]
        Results[results.md]
        Reports[reports/*.json]
        Profiles[profiles/*.json]
        Models[hf_downloads/*.gguf]
    end

    Browser -->|HTTP / SSE| Express
    Vue -->|REST API| Express
    SSE_Client -->|EventSource| Express
    Express -->|spawn| Runner
    Runner -->|exec| Build
    Runner -->|spawn| Server_Launch
    Server_Launch -->|chat/completions| GGUF[GGUF Model]
    Runner -->|stdout/stderr| SSE_Broadcaster
    SSE_Broadcaster -->|broadcast| SSE_Client
    Express -->|read/write| Config
    Express -->|read/write| Results
    Express -->|read/write| Reports
    Express -->|read/write| Profiles
    Express -->|fetch| HF
    Runner -->|git clone| Git
    Runner -->|read/write| Models
```

## Component Relationships

```mermaid
graph LR
    App[App.vue<br/>Shell]
    Router[router/index.js<br/>4 Routes]
    Store[stores/benchmark.js<br/>Pinia Store]
    Dashboard[Dashboard.vue<br/>Controls + Logs]
    Config[Config.vue<br/>Config Editor]
    Reports[Reports.vue<br/>Report Viewer]
    Models[Models.vue<br/>HF Search]

    App --> Router
    App --> Store
    Router --> Dashboard
    Router --> Config
    Router --> Reports
    Router --> Models
    Dashboard --> Store
    Config --> Store
    Reports --> Store
    Models --> Store
```

## Data Flow

### Benchmark Execution Flow

```mermaid
sequenceDiagram
    participant UI as Browser UI
    participant API as Express API
    participant Runner as index.js
    participant Server as llama-server
    participant Model as GGUF Model

    UI->>API: POST /api/run
    API->>Runner: spawn node index.js
    API-->>UI: 200 {success: true}

    Runner->>Runner: init() — clone/pull llama.cpp
    Runner->>Runner: runBuild() — cmake + make
    Runner->>Runner: startLlamaServer()
    Runner->>Server: ./llama-server [flags]
    Server-->>Runner: health check OK

    loop For each test run
        loop 4 messages (accumulating context)
            Runner->>Server: POST /chat/completions
            Server-->>Runner: response + timings
            Runner->>Runner: measure tokens/sec, memory
        end
        Runner->>Runner: writeResultsToMarkdown()
        Runner->>API: stdout BENCHMARK_JSON lines
        API->>API: parseLogOutput() → liveResults
        API->>UI: SSE broadcast results
        Runner->>Runner: stopLlamaServer()
        Runner->>Runner: updateConfigs() — advance params
    end

    Runner->>Runner: cleanup (stop server)
    Runner->>API: stdout final results
    API->>UI: SSE broadcast finished
```

### SSE Real-Time Update Flow

```mermaid
sequenceDiagram
    participant UI as Vue.js Frontend
    participant Store as Pinia Store
    participant API as Express API
    participant Runner as index.js

    UI->>Store: connectSSE()
    Store->>API: GET /api/stream (EventSource)
    API-->>Store: text/event-stream (keep-alive)

    Runner->>API: stdout "BENCHMARK_JSON:..."
    API->>API: parseLogOutput()
    API->>Store: broadcast("results", {...})
    Store->>Store: liveResults = data.liveResults
    Store->>UI: reactivity update → table refresh

    Runner->>API: stdout "Test Run #3"
    API->>Store: broadcast("status", {status:"testing", testRun:3})
    Store->>UI: status badge → "Testing"

    Runner->>API: stdout "BENCHMARK_JSON:{type:'message-start',...}"
    API->>Store: broadcast("message-start", {...})

    Runner->>API: stdout "BENCHMARK_JSON:{type:'message-complete',...}"
    API->>Store: broadcast("message-complete", {...})
    Store->>UI: message detail updated

    Runner->>API: stdout "BENCHMARK_JSON:{type:'test-run-complete',...}"
    API->>Store: broadcast("test-run-complete", {...})
    Store->>UI: benchmarkMessages updated

    loop Every 15s
        API->>Store: heartbeat
    end
```

## SSE Streaming Architecture

The SSE system is the backbone of Betty's real-time UX. It operates on two independent channels:

### Main Benchmark Stream (`GET /api/stream`)

| Event | Trigger | Payload |
|-------|---------|---------|
| `status` | Test run starts/completes/error | `{status, testRun, liveResults, finished?}` |
| `results` | Summary block flushed | `{liveResults}` |
| `message-start` | Chat message sent | `{testRunId, messageIndex, prompt}` |
| `message-complete` | LLM response received | `{testRunId, messageIndex, prompt, response, promptTokens, generatedTokens, totalTimeMs}` |
| `test-run-complete` | All 4 messages done | `{testRunId, messages}` |
| `log` | stdout/stderr line | `{type: "stdout"\|"stderr", text, status, testRun, liveResults}` |
| `heartbeat` | Every 15 seconds | `{ts}` |

### Build Stream (`POST /api/build`)

| Event | Trigger | Payload |
|-------|---------|---------|
| `build-log` | Build output line | `{line text}` |
| `build-log` | Progress tick | `PROGRESS:{0-90}` |
| `build-log` | Success | `STATUS:Build complete!` |
| `build-log` | Failure | `STATUS:Build failed\nERROR: {message}` |

### Download Stream (`POST /api/hf/download`)

| Event | Trigger | Payload |
|-------|---------|---------|
| `hf-download` | Progress update | `PROGRESS:{percent}:{bytes}` |
| `hf-download` | Complete | `STATUS:Download complete\nFILE:{path}` |
| `hf-download` | Failure | `STATUS:Download failed\nERROR: {message}` |

## Configuration System

```mermaid
graph LR
    File[configs.json<br/>Persistent storage]
    Defaults[DEFAULT_CONFIGS<br/>Hardcoded in api-server.js]
    Merge[deepMerge<br/>Sync on startup]
    UI[Config.vue<br/>Visual editor]
    Runner[index.js<br/>Benchmark engine]
    API[api-server.js<br/>API endpoints]

    Defaults -->|deepMerge| Merge
    File -->|read| Merge
    Merge -->|write missing keys| File
    UI -->|PUT /api/configs| File
    API -->|GET /api/configs| File
    Runner -->|read| File
```

### Config Flow

1. **Startup**: `api-server.js` loads `configs.json`, merges missing keys from `DEFAULT_CONFIGS`
2. **Edit**: Config.vue reads via `GET /api/configs`, edits visually, saves via `PUT /api/configs`
3. **Run**: `index.js` reads `configs.json` on startup, passes values to cmake/llama-server
4. **Profile**: Save/Load creates/deletes JSON files in `profiles/` directory
5. **Report**: Auto-saves after each test run with full per-run configuration

### Environment Variables

The benchmark engine sets these environment variables for the llama.cpp build and runtime:

| Variable | Purpose | Default |
|----------|---------|---------|
| `GGML_CUDA_ENABLE_UNIFIED_MEMORY` | CUDA unified memory | `1` |
| `CUDA_SCALE_LAUNCH_QUEUES` | Queue scaling factor | `4x` |
| `LLAMA_CACHE` | KV cache path | `llama_cache` |
| `GGML_CUDA_P2P` | Peer-to-peer access | `on` |
| `LLAMA_ARG_FIT` | Fit mode | `on` |
| `LLAMA_ARG_FIT_TARGET` | Fit target size | `256` |
| `LLAMA_ARG_FIT_CTX` | Fit context size | `131072` |
| `CUDACXX` | NVCC compiler path | `/usr/local/cuda/bin/nvcc` |

## See Also

- [[betty-project]] — Project overview
- [[betty-api-reference]] — API endpoint documentation
- [[betty-benchmark-engine]] — Benchmark engine internals
- [[betty-configuration]] — Configuration system details

## Tags

betty, architecture, sse, express, llama.cpp, configuration, data-flow
