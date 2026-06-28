---
tags: [concept, architecture, data-flow, developer]
---

# Data Flow

> **Purpose:** Detailed analysis of how data moves through Betty — from frontend user actions to API requests, database operations, benchmark execution, and real-time streaming back to the client.

---

## Table of Contents

- [Overview](#overview)
- [Standard API Request/Response](#standard-api-requestresponse)
- [SSE Streaming Path](#sse-streaming-path)
- [Benchmark Process Spawning](#benchmark-process-spawning)
- [Database Access Pattern](#database-access-pattern)
- [Cross-References](#cross-references)

---

## Overview

Betty follows a layered architecture: **Vue 3 frontend** → **Express API** → **Database (MySQL/SQLite/JSON)** → **child processes** (benchmark engine, llama-server). Data flows through these layers via HTTP requests, SSE streams, and stdout/stderr pipes.

```mermaid
graph TB
    subgraph Client["Client"]
        FE["Vue 3 SPA<br/>Pinia Stores"]
        SSE["EventSource<br/>/api/stream"]
    end

    subgraph API["Express API<br/>(api-server.js)"]
        AUTH["Auth Middleware<br/>JWT validate"]
        ROUTES["Route Handlers<br/>~70 endpoints"]
        PARSER["Log Parser<br/>Line buffer + regex"]
        BROADCAST["SSE Broadcast<br/>streamingClients Set"]
    end

    subgraph Storage["Storage"]
        DB["Database Layer<br/>MySQL → SQLite → JSON"]
        DATA["Data Layer<br/>CRUD operations"]
    end

    subgraph Processes["Child Processes"]
        BENCH["Benchmark Engine<br/>(index.js)"]
        LLAMA["llama-server<br/>Inference server"]
    end

    FE -->|HTTP + Bearer token| API
    SSE -->|HTTP + ?token=| API
    API --> AUTH
    AUTH --> ROUTES
    ROUTES --> DATA
    DATA --> DB
    ROUTES -->|spawn| BENCH
    BENCH -->|spawn| LLAMA
    BENCH -->|stdout/stderr| PARSER
    PARSER --> BROADCAST
    BROADCAST --> SSE
```

---

## Standard API Request/Response

Every non-streaming API call follows this path:

```mermaid
sequenceDiagram
    participant U as User Browser
    participant FE as Vue Component
    participant Store as Pinia Store
    participant API as Express API
    participant Auth as authenticate()
    participant RBAC as authorize(...)
    participant DL as Data Layer
    participant DB as Database

    U->>FE: User action (e.g. click "Save Config")
    FE->>Store: saveConfigs(configs)
    Store->>API: PUT /api/configs<br/>Authorization: Bearer <token>
    API->>Auth: authenticate(req, res, next)
    Auth->>Auth: Extract token (header or query)
    Auth->>Auth: jwt.verify(token, secret)
    alt Token invalid
        Auth-->>U: 401 {error: "Invalid token"}
    else Token expired
        Auth-->>U: 401 {error: "Token expired"}
    end
    Auth-->>API: req.user = {id, username, role}
    API->>RBAC: authorize('admin')
    alt Role not allowed
        RBAC-->>U: 403 {error: "Insufficient permissions"}
    end
    RBAC-->>API: next()
    API->>DL: saveConfigs(configs)
    DL->>DB: db.jsonRun('REPLACE INTO configs...')
    DB-->>DL: Success
    DL-->>API: Resolved
    API-->>Store: 200 {success: true, message: "Config saved"}
    Store-->>FE: this.configs = configs
    FE-->>U: UI updated
```

### Request Flow Details

| Step | Component | Action |
|------|-----------|--------|
| 1 | Vue Component | User interacts with UI, dispatches store action |
| 2 | Pinia Store | `axios.get/post/put/delete` to API endpoint |
| 3 | Express API | Route handler receives request |
| 4 | Auth Middleware | Validates JWT, attaches `req.user` |
| 5 | RBAC Middleware | Checks `req.user.role` against allowed roles |
| 6 | Route Handler | Business logic — reads/writes data |
| 7 | Data Layer | `db.jsonGet()`, `db.jsonAll()`, `db.jsonRun()` |
| 8 | Database | MySQL, SQLite, or JSON file backend |
| 9 | Response | JSON `{success, data?, error?}` back to store |
| 10 | Pinia Store | Updates reactive state |
| 11 | Vue Component | Reactive UI update |

### Response Format

All API endpoints return a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

On error:

```json
{
  "success": false,
  "error": "Error description"
}
```

---

## SSE Streaming Path

Betty uses **Server-Sent Events (SSE)** for real-time updates during benchmark execution, builds, and downloads. The SSE connection is established once per page load and maintained throughout the session.

### Connection Establishment

```mermaid
sequenceDiagram
    participant FE as Vue Frontend
    participant Store as benchmark.js Store
    participant API as Express API
    participant Client as streamingClients Set

    FE->>Store: connectSSE()
    Store->>Store: Get token from localStorage
    Store->>API: GET /api/stream?token=<encoded>
    API->>API: Set headers:<br/>Content-Type: text/event-stream<br/>Cache-Control: no-cache<br/>Connection: keep-alive
    API->>Client: Add client to Set
    API->>FE: Send initial status event
    API->>FE: Start heartbeat interval (15s)
    API-->>Store: EventSource.onopen
    Store->>Store: sseConnected = true
```

### Event Types

| Event | Payload | Triggered By |
|-------|---------|-------------|
| `status` | `{status, testRun, liveResults, processAlive, finished?}` | State transitions, test run start |
| `results` | `{liveResults}` | After each test run summary parsed |
| `log` | `{type: "stdout"\|"stderr", text, status, testRun, liveResults}` | Every stdout/stderr chunk from benchmark |
| `message-start` | `{testRunId, messageIndex, prompt}` | Before each chat request |
| `message-complete` | `{testRunId, messageIndex, prompt, response, promptTokens, generatedTokens, totalTimeMs}` | After each chat response |
| `test-run-complete` | `{testRunId, messages, processAlive}` | After all messages in a test run |
| `heartbeat` | `{ts}` | Every 15 seconds |

### Broadcast Mechanism

```javascript
// api-server.js
let streamingClients = new Set();

function broadcast(event, data) {
  for (const client of streamingClients) {
    sendToClient(client, event, data);
  }
}

function sendToClient(client, event, data) {
  if (!streamingClients.has(client)) return;
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  client.res.write(msg);
  safeFlush(client.res);
}
```

Clients are removed from the Set on connection close or write error. The `safeFlush()` helper handles both Express 4 (no `res.flush()`) and Express 5.

### Client-Side Event Handling

The Pinia store registers listeners for each event type:

```javascript
eventSource.addEventListener('status', (e) => {
  const data = JSON.parse(e.data);
  this.status = data.status;
  this.testRun = data.testRun;
  this.liveResults = data.liveResults || [];
});

eventSource.addEventListener('log', (e) => {
  const data = JSON.parse(e.data);
  this.logs.push({ type: data.type, text: data.text, timestamp: Date.now() });
});
```

Reconnection is handled automatically by EventSource, with a 20-second timeout before forcing a manual reconnect.

---

## Benchmark Process Spawning

The benchmark engine (`index.js`) runs as a **separate child process**, spawned by the API server when a benchmark is started. This isolation ensures the API server remains responsive during long-running benchmarks.

### Spawn Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as api-server.js
    participant Config as Config Store
    participant BENCH as index.js (child)
    participant LLAMA as llama-server (grandchild)
    participant Results as results.md + SSE

    FE->>API: POST /api/run
    API->>Config: getConfigs()
    API->>API: benchmarkStatus = "building"
    API->>API: liveResults = []
    API->>BENCH: spawn('node', ['index.js'])
    Note over BENCH: Reads configs.json from DB
    BENCH->>BENCH: initController()
    BENCH->>BENCH: Clone/pull llama.cpp
    BENCH->>BENCH: cmake + make build
    BENCH-->>API: stdout piped to API
    API->>API: processStdoutChunk(text)
    API->>API: parseLogOutput(line)
    API->>Results: Extract test run markers
    API->>FE: broadcast("status", ...)
    API->>FE: broadcast("log", ...)

    loop Grid search combinations
        BENCH->>BENCH: applyCombo(combo)
        BENCH->>LLAMA: spawn llama-server
        BENCH->>LLAMA: POST /chat/completions (x4)
        BENCH->>Results: BENCHMARK_JSON lines
        API->>API: parseBenchmarkJSON(line)
        API->>FE: broadcast("message-start")
        API->>FE: broadcast("message-complete")
        BENCH->>Results: Summary block
        API->>API: parse summary → liveResults
        API->>FE: broadcast("results", {liveResults})
        API->>FE: broadcast("test-run-complete")
        BENCH->>LLAMA: kill server
    end

    BENCH->>BENCH: process.exit(0)
    BENCH-->>API: close event (code 0)
    API->>API: benchmarkStatus = "idle"
    API->>FE: broadcast("status", {finished: true})
```

### Process Lifecycle

| State | Value | Meaning |
|-------|-------|---------|
| `idle` | Initial | No benchmark running |
| `building` | After POST /api/run | Build phase (cmake + make) |
| `testing` | During grid search | Test runs executing |
| `error` | On failure | Process exited non-zero or max errors reached |
| `stopped` | After POST /api/stop | User-initiated stop (SIGTERM → SIGKILL) |

### Output Parsing

The API server parses the benchmark process output line-by-line using a line buffer:

```javascript
let stdoutLineBuffer = "";

function processStdoutChunk(text) {
  stdoutLineBuffer += text;
  const lines = stdoutLineBuffer.split("\n");
  stdoutLineBuffer = lines.pop() || "";
  for (const line of lines) {
    if (line.trim()) parseLogOutput(line);
  }
}
```

The parser recognizes:
- `Test Run #N` markers — updates `currentTestRun`
- `Summary ===` blocks — accumulates metrics across lines
- `BENCHMARK_JSON:` lines — structured JSON events (message-start, message-complete, test-run-complete)
- Metric lines (tokens/sec, memory, time) — extracted via regex

### Stop Mechanism

```javascript
// POST /api/stop
benchmarkProcess.kill("SIGTERM");
setTimeout(() => {
  if (benchmarkProcess && !benchmarkProcess.killed) {
    benchmarkProcess.kill("SIGKILL");
  }
}, 5000);
benchmarkStatus = "stopped";
```

Graceful shutdown (SIGTERM) is attempted first, with SIGKILL as fallback after 5 seconds.

---

## Database Access Pattern

The database layer provides a **unified interface** across three backends:

```mermaid
graph LR
    API["api-server.js"] --> DL["data-layer.js"]
    DL --> DB["db.js"]
    DB -->|1| MySQL["MySQL<br/>mysql2/promise"]
    DB -->|2| SQLite["SQLite<br/>better-sqlite3"]
    DB -->|3| JSON["JSON files<br/>json-store.js"]
```

### Initialization Order

1. **MySQL** — Requires `DB_HOST` env var. Creates connection pool.
2. **SQLite** — Path `~/.betty/betty.db`. WAL mode, foreign keys enabled.
3. **JSON files** — Last resort fallback.

Once initialized, the active backend is used for all subsequent operations. Schema is auto-applied on init.

### Unified Methods

| Method | Purpose | JSON Handling |
|--------|---------|---------------|
| `db.query(sql, params)` | Generic query | Raw values |
| `db.get(sql, params)` | Single row | Raw values |
| `db.all(sql, params)` | All rows | Raw values |
| `db.run(sql, params)` | Insert/update/delete | Raw values |
| `db.jsonGet(sql, params)` | Single row | Parses JSON columns |
| `db.jsonAll(sql, params)` | All rows | Parses JSON columns |
| `db.jsonRun(sql, params, value)` | Insert with JSON | Serializes value |

JSON columns (`value`, `live_results`, `configs_per_run`, `configs`, `data`) are auto-parsed from TEXT for SQLite compatibility.

---

## Cross-References

### Related Concepts
- concepts/config-schema]] — Full configuration structure
- concepts/grid-search]] — Grid search parameter generation
- concepts/auth-flow]] — Authentication and authorization

### Architecture
- architecture]] — System architecture overview
- api-reference]] — API documentation

### QA Guides
- qa/benchmark-workflow]] — Running benchmarks
- qa/report-workflow]] — Saving and viewing reports
