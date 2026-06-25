---
tags: [architecture, system-design, data-flow, express, vue.js, pinia, sse, llama.cpp]
---

# Architecture Deep-Dive

Comprehensive overview of Betty's system design, component relationships, and data flows.

See also: [[index]] • [[api-reference]] • [[USER-MANUAL]]

## High-Level Architecture

```mermaid
graph TB
    subgraph Browser["Browser (Vue.js 3 SPA)"]
        A[App.vue] --> B[Router]
        B --> C[Dashboard.vue]
        B --> D[Settings.vue]
        B --> E[Models.vue]
        B --> F[Reports.vue]
        B --> G[PiChat.vue]
        B --> H[Logs.vue]
        B --> I[Docs.vue]
        C --> J[Pinia Store<br/>benchmark.js]
        G --> K[Pinia Store<br/>pi-chat.js]
    end

    subgraph Server["Express API Server"]
        L[api-server.js] --> M[SSE Stream<br/>/api/stream]
        L --> N[REST Endpoints]
        L --> O[Pi SDK Session<br/>Manager]
    end

    subgraph External["External Systems"]
        P[llama.cpp]
        Q[HuggingFace API]
        R[Systemd]
        S[Pi Agent<br/>Providers]
    end

    C -->|HTTP + SSE| L
    D -->|HTTP| L
    E -->|HTTP + SSE| L
    F -->|HTTP| L
    G -->|HTTP + SSE| L
    H -->|HTTP| L
    I -->|HTTP| L
    L -->|spawn| P
    L -->|fetch| Q
    L -->|execSync| R
    O -->|events| S
```

## Frontend Architecture

### Component Hierarchy

```mermaid
graph TD
    A[App.vue] --> B[Sidebar Navigation]
    A --> C[Header]
    A --> D[Router View]

    D --> E[Dashboard.vue]
    D --> F[Settings.vue]
    D --> G[Models.vue]
    D --> H[Reports.vue]
    D --> I[PiChat.vue]
    D --> J[Logs.vue]
    D --> K[Docs.vue]

    E --> E1[Status Card]
    E --> E2[System Card]
    E --> E3[Metrics Card]
    E --> E4[Controls Card]
    E --> E5[Results Table]
    E --> E6[Log Viewer]
    E --> E7[Details Modal]
    E --> E8[CPU Cores Modal]

    F --> F1[Build Panel]
    F --> F2[Actions Panel]
    F --> F3[Profile Panel]
    F --> F4[Config Editor<br/>Build Options]
    F --> F5[Config Editor<br/>Run Options]
    F --> F6[Service Modal]

    G --> G1[Search Tab]
    G --> G2[Downloads Tab]
    G --> G3[Model Details Modal]
```

### State Management (Pinia)

Two stores manage application state:

| Store | File | Responsibility |
|-------|------|----------------|
| `benchmark` | `stores/benchmark.js` | Benchmark state, configs, reports, SSE events, system status, HuggingFace downloads, build state, profiles |
| `piChat` | `stores/pi-chat.js` | Pi SDK session, messages, streaming state, tool calls, slash commands |

### State Flow

```mermaid
sequenceDiagram
    participant UI as Vue Component
    participant Store as Pinia Store
    participant API as Express Server
    participant SSE as SSE Stream

    UI->>Store: Action (e.g., startBenchmark)
    Store->>API: POST /api/run
    API-->>Store: Response
    API->>SSE: Broadcast events
    SSE-->>Store: status, results, log events
    Store->>UI: Reactive update
```

## Backend Architecture

### Server Modules

```mermaid
graph LR
    subgraph Core["Core"]
        A[Express App]
        B[CORS Middleware]
        C[JSON Parser]
        D[Static Files]
    end

    subgraph Routes["Route Groups"]
        E[Config Routes]
        F[Benchmark Routes]
        G[Profile Routes]
        H[Report Routes]
        I[Service Routes]
        J[HuggingFace Routes]
        K[Build Routes]
        L[Pi Chat Routes]
        M[Docs Routes]
        N[System Routes]
    end

    subgraph State["In-Memory State"]
        O[Benchmark Process]
        P[Streaming Clients]
        Q[Live Results]
        R[Pi Sessions]
        S[HF Downloads]
    end

    A --> B --> C --> D
    A --> E
    A --> F
    A --> G
    A --> H
    A --> I
    A --> J
    A --> K
    A --> L
    A --> M
    A --> N
    F --> O
    F --> P
    F --> Q
    L --> R
    J --> S
```

### SSE Event System

The server uses Server-Sent Events for real-time communication:

| Event Type | Source | Payload | Purpose |
|------------|--------|---------|---------|
| `status` | Benchmark | `{ status, testRun, liveResults }` | Benchmark state changes |
| `results` | Benchmark | `{ liveResults }` | New result data |
| `log` | Benchmark | `{ type, text, status, testRun, liveResults }` | Log output |
| `message-start` | Benchmark | `{ testRunId, messageIndex, prompt }` | Message begins |
| `message-complete` | Benchmark | `{ testRunId, messageIndex, prompt, response, ... }` | Message ends |
| `test-run-complete` | Benchmark | `{ testRunId, messages }` | Test run ends |
| `heartbeat` | Server | `{ ts }` | Keep-alive (15s) |
| `build-log` | Build | `PROGRESS:n` or log line | Build progress |
| `hf-download` | HuggingFace | `PROGRESS:n`, `STATUS:`, `FILE:` | Download progress |
| `pi-*` | Pi Chat | Various | Agent events |

## Data Flow: Benchmark Execution

```mermaid
sequenceDiagram
    participant User
    participant Dashboard as Dashboard.vue
    participant Store as benchmark.js
    participant API as api-server.js
    participant Index as index.js<br/>(benchmark engine)
    participant Llama as llama-server
    participant SSE as SSE Clients

    User->>Dashboard: Click Start
    Dashboard->>Store: startBenchmark(env)
    Store->>API: POST /api/run
    API->>API: Read configs.json
    API->>Index: spawn node index.js
    Index->>Index: Build llama.cpp (if needed)
    Index->>Llama: Start llama-server
    Index->>Index: Run test messages
    Llama-->>Index: Token generation
    Index-->>API: stdout/stderr stream
    API->>API: Parse log output
    API->>SSE: Broadcast status/results/log
    SSE-->>Store: Update reactive state
    Store-->>Dashboard: Render updates
    Index->>Index: Stop llama-server
    Index-->>API: Process exit
    API->>SSE: Final status
    API->>API: Auto-save report
```

## Data Flow: Model Download

```mermaid
sequenceDiagram
    participant User
    participant Models as Models.vue
    participant Store as benchmark.js
    participant API as api-server.js
    participant HF as HuggingFace API
    participant FS as Filesystem

    User->>Models: Enter search query
    Models->>Store: searchHfModels(query)
    Store->>API: GET /api/hf/search
    API->>HF: GET /api/models
    HF-->>API: Model list
    API-->>Store: Results
    Store-->>Models: Display results

    User->>Models: Select model + file
    Models->>Store: downloadHfModel(id, file)
    Store->>API: POST /api/hf/download
    API->>HF: GET /resolve/main/file
    HF-->>API: Stream chunks
    API->>FS: Write to hf_downloads/
    API-->>Store: SSE progress events
    Store-->>Models: Update progress bar
```

## Data Flow: Pi Chat

```mermaid
sequenceDiagram
    participant User
    participant PiChat as PiChat.vue
    participant Store as pi-chat.js
    participant API as api-server.js
    participant PiSDK as Pi SDK
    participant Provider as LLM Provider

    User->>PiChat: Send message
    PiChat->>Store: sendPrompt(text)
    Store->>API: POST /api/pi/session/:id/prompt
    API->>PiSDK: session.prompt(text)
    PiSDK->>Provider: Generate response
    Provider-->>PiSDK: Stream tokens
    PiSDK-->>API: Agent events
    API-->>Store: SSE pi-* events
    Store-->>PiChat: Render streaming response
```

## File System Layout

```
betty/
├── src/backend/
│   ├── api-server.js          # Express API server (entry point)
│   ├── configs.json           # Benchmark configuration
│   ├── results.md             # Raw benchmark output
│   ├── profiles/              # Saved config profiles (stored in ~/.betty/profiles/)
│   ├── reports/               # Saved benchmark reports
│   ├── models/                # Downloaded GGUF models (~/.betty/models)
│   ├── llama_cache/           # Llama.cpp cache
│   ├── llama.cpp/             # Cloned llama.cpp repository
│   └── frontend/
│       ├── src/
│       │   ├── App.vue        # Root component
│       │   ├── main.js        # Vue entry point
│       │   ├── router/        # Vue Router config
│       │   ├── stores/        # Pinia stores
│       │   ├── views/         # Page components
│       │   ├── components/    # Reusable components
│       │   └── styles/        # CSS variables
│       └── dist/              # Built frontend (served by Express)
├── docs/                      # Documentation
├── ~/.betty/library/          # Research library
├── scripts/                   # Install scripts
├── package.json
└── install.sh
```

## Configuration System

Configuration flows through three layers:

1. **Environment variables** — Server-level settings (port, host, CORS)
2. **configs.json** — Benchmark settings managed via the Config page
3. **Profiles** — Named snapshots of configs.json for quick switching

```mermaid
graph LR
    A[.env] --> B[api-server.js]
    C[configs.json] --> B
    D[profiles/*.json] --> C
    B --> E[Build command]
    B --> F[Launch command]
    E --> G[llama.cpp build]
    F --> H[llama-server]
```

## Security Considerations

- **CORS**: Configurable via `CORS_ORIGIN`. Wildcard `*` disables credentials; explicit origins enable them
- **Rate limiting**: Uses `express-rate-limit` middleware
- **Input sanitization**: Profile and report names are sanitized to alphanumeric + underscore + hyphen
- **No authentication**: The server is designed for local/trusted network use. Deploy behind a reverse proxy with auth for remote access

## Deployment Options

| Mode | Description |
|------|-------------|
| **Local** | `npm start` — Development and personal use |
| **Remote** | `API_HOST=0.0.0.0 npm start` — Access from network |
| **Systemd** | Install as `llama.service` for persistent llama-server instances |
| **Reverse proxy** | Place behind Nginx/Caddy with TLS and authentication |
