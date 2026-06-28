---
tags: [architecture, overview, system-design, developer]
---

# Betty Architecture

> **Purpose:** Definitive reference for the Betty system architecture. Entry point for developers and engineers who need to understand how the entire platform works.

---

## Table of Contents

- [System Overview](#system-overview)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Database Schema](#database-schema)
- [Benchmark Lifecycle](#benchmark-lifecycle)
- [Authentication Flow](#authentication-flow)
- [Configuration System](#configuration-system)
- [Cross-References](#cross-references)

---

## System Overview

Betty is a self-hosted **llama.cpp benchmarking and management platform**. It builds llama.cpp from source, runs grid-search benchmarks against GGUF models, manages persistent inference services via systemd, integrates with HuggingFace for model management, and includes a Pi coding agent chat interface.

```mermaid
graph TB
    subgraph Client["Client"]
        FE["Vue 3 Frontend<br/>Pinia + Vue Router"]
    end

    subgraph Betty["Betty Application"]
        API["Express API Server<br/>(api-server.js:3456)"]
        AUTH["Auth Middleware<br/>JWT + bcrypt"]
        DB["Database Layer<br/>MySQL → SQLite → JSON"]
        BENCH["Benchmark Engine<br/>(index.js — child process)"]
        HF["HuggingFace Client<br/>Search + Download"]
        PI["Pi Agent SDK<br/>Agent Sessions"]
        SVC["Systemd Manager<br/>llama.service + betty.service"]
    end

    subgraph External["External Services"]
        HF_API["HuggingFace API<br/>huggingface.co/api"]
        LLAMA["llama.cpp<br/>GitHub + Build"]
        HF_FILES["HuggingFace Files<br/>Model Downloads"]
        SYSTEMD["systemd (user)<br/>~/.config/systemd/user/"]
        MODELS["Models<br/>~/.betty/models/"]
    end

    FE <-->|HTTP + SSE| API
    API --> AUTH
    API --> DB
    API -->|spawn| BENCH
    API --> HF
    API --> PI
    API --> SVC
    BENCH -->|clone + build| LLAMA
    BENCH -->|spawn llama-server| LLAMA
    HF --> HF_API
    HF --> HF_FILES
    HF --> MODELS
    SVC --> SYSTEMD
    DB -->|SQLite| DBFILE["~/.betty/betty.db"]
    DB -->|JSON fallback| JSONF["configs.json"]
```

### Key Characteristics

| Aspect | Detail |
|--------|--------|
| **Frontend** | Vue 3 + Pinia stores + Vue Router (SPA) |
| **Backend** | Express.js (api-server.js, ~3900 lines) |
| **Database** | Three-tier fallback: MySQL → SQLite → JSON files |
| **Auth** | JWT tokens, bcrypt passwords, role-based (admin/operator/viewer) |
| **Benchmark Engine** | Separate child process (index.js), spawned on demand |
| **Streaming** | SSE for benchmark progress, logs, Pi agent events |
| **Services** | systemd user services (llama.service, betty.service) |
| **Port** | 3456 (configurable via `API_PORT`) |

---

## Component Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend (Vue 3)"]
        A1["Router<br/>Hash-free history<br/>Nav guard + RBAC"]
        A2["auth.js Store<br/>JWT login/register<br/>Session restore"]
        A3["benchmark.js Store<br/>SSE connection<br/>Configs, profiles, reports<br/>Models, builds, services"]
        A4["pi-chat.js Store<br/>Agent sessions<br/>SSE streaming<br/>Message history"]
        A5["Views<br/>Dashboard, Settings, Reports<br/>Models, Docs, Library<br/>Logs, PiChat, Admin"]
        A6["Components<br/>ConfigSection, MemoryBar<br/>SystemStats, Tooltip"]
        A5 --> A2
        A5 --> A3
        A5 --> A4
        A1 --> A5
    end

    subgraph Backend["Backend (Express)"]
        B1["api-server.js<br/>All routes + SSE<br/>Benchmark orchestration<br/>~3900 lines"]
        B2["auth/middleware.js<br/>authenticate, authorize<br/>optionalAuth"]
        B3["auth/routes.js<br/>Login, register, password<br/>Users CRUD"]
        B4["auth/user-store.js<br/>User CRUD + UUID<br/>DB-backed"]
        B5["db/db.js<br/>MySQL → SQLite → JSON<br/>Unified query interface"]
        B6["db/data-layer.js<br/>CRUD: configs, reports<br/>profiles, templates, settings"]
        B7["db/schema.sql<br/>8 tables + migrations"]
        B8["index.js<br/>Benchmark engine<br/>Grid search + test runs<br/>Child process"]
        B1 --> B2
        B1 --> B3
        B1 --> B5
        B1 --> B8
        B3 --> B4
        B1 --> B6
        B6 --> B5
        B5 --> B7
    end

    subgraph External["External"]
        C1["llama.cpp<br/>Build + llama-server"]
        C2["HuggingFace API"]
        C3["systemd<br/>User services"]
        C4["Filesystem<br/>~/.betty/models/<br/>~/.betty/betty.db"]
    end

    Frontend <-->|HTTP / SSE| Backend
    Backend --> C1
    Backend --> C2
    Backend --> C3
    Backend --> C4
```

### Component Responsibilities

#### Frontend

| Component | Responsibility |
|-----------|---------------|
| **Router** | Hash-free SPA routing, session restore on load, redirects unauthenticated users, role-based access control |
| **auth.js** | JWT storage (`localStorage: betty-token`), login/register/logout, role checks (`isAdmin`, `isOperator`, `isViewer`) |
| **benchmark.js** | Central store — SSE connection management, configs CRUD, profiles, reports, models, HF downloads, builds, service control, chat templates, mmproj files, git updates |
| **pi-chat.js** | Pi agent session lifecycle, SSE event mapping, message history, tool call tracking, session persistence |
| **Views** | Dashboard (benchmark UI), Settings (config editor), Reports, Models, Docs, Library, Logs, PiChat, Admin, Account, ChatTemplates, MmprojModels |

#### Backend

| Module | Responsibility |
|--------|---------------|
| **api-server.js** | Express server, all ~70 API routes, SSE streaming, benchmark spawn/stop, HF proxy, Pi agent proxy, systemd control |
| **auth/middleware.js** | `authenticate()` — JWT validation, `authorize(...roles)` — role check, `optionalAuth` — allow unauthenticated access |
| **auth/routes.js** | `/api/auth/*` — login, register, password change, users CRUD |
| **auth/user-store.js** | User CRUD operations, UUID generation, bcrypt hashing, DB-backed |
| **db/db.js** | Three-tier database abstraction — MySQL (connection pool) → SQLite (WAL mode) → JSON files, unified `query`/`get`/`all`/`run` interface |
| **db/data-layer.js** | High-level CRUD for configs, reports, profiles, service profiles, chat templates, settings |
| **db/schema.sql** | 8 tables, auto-applied on init, ENUM→TEXT migration for SQLite compatibility |
| **index.js** | Benchmark engine — llama.cpp clone/build, grid search generation, test run loop, llama-server lifecycle, metrics collection, results.md output |

---

## Data Flow

Request/response lifecycle from frontend to backend and external services:

```mermaid
sequenceDiagram
    participant U as User Browser
    participant FE as Vue Frontend
    participant Store as Pinia Store
    participant API as Express API
    participant Auth as Auth Middleware
    participant DB as Database
    participant BENCH as Benchmark Engine
    participant LLAMA as llama-server
    participant HF as HuggingFace API

    Note over U,DB: Standard API Request (e.g. GET /api/configs)
    U->>FE: User action
    FE->>Store: Dispatch action
    Store->>API: GET /api/configs<br/>Authorization: Bearer <token>
    API->>Auth: authenticate()
    Auth->>Auth: Verify JWT signature<br/>Check expiration
    Auth-->>API: User object (id, username, role)
    API->>DB: db.jsonGet('configs')
    DB-->>API: Config JSON
    API-->>Store: 200 + config data
    Store-->>FE: Update reactive state
    FE-->>U: Render updated UI

    Note over U,HF: Benchmark Execution (POST /api/run)
    U->>FE: Click "Run"
    FE->>Store: runBenchmark()
    Store->>API: POST /api/run
    API->>Auth: authorize('admin','operator')
    API->>BENCH: spawn('node', ['index.js'])
    BENCH->>BENCH: Clone/pull llama.cpp
    BENCH->>BENCH: cmake + make build
    loop Grid Search Combinations
        BENCH->>LLAMA: spawn llama-server<br/>(with test params)
        LLAMA-->>BENCH: Health check OK
        loop 4 Benchmark Messages
            BENCH->>LLAMA: POST /chat/completions
            LLAMA-->>BENCH: Response + timing
        end
        BENCH->>BENCH: Collect metrics<br/>(t/s, memory, time)
        BENCH-->>API: stdout → SSE events
        API-->>Store: SSE: status/results/log
        Store-->>FE: Update progress UI
        BENCH->>LLAMA: Kill process
    end
    BENCH-->>API: Process exit
    API-->>Store: SSE: status=complete
```

### Streaming Architecture

Betty uses **Server-Sent Events (SSE)** for real-time updates:

| Endpoint | Events |
|----------|--------|
| `GET /api/stream` | `status`, `results`, `log`, `message-start`, `message-complete`, `test-run-complete`, `heartbeat` |
| `GET /api/pi/session/:id/stream` | `pi-text`, `pi-thinking`, `pi-tool-start`, `pi-tool-update`, `pi-tool-end`, `pi-agent-start`, `pi-agent-end` |
| `POST /api/build` | Build progress (cmake/make output) |
| `POST /api/hf/download` | Download progress (bytes, percentage) |

SSE connections authenticate via `?token=` query parameter (headers not supported in EventSource API).

---

## Database Schema

```mermaid
erDiagram
    users {
        varchar36 id PK
        varchar255 username UK
        varchar255 password_hash
        varchar20 role "admin | operator | viewer"
        datetime created_at
        datetime updated_at
    }

    configs {
        int id PK "always 1"
        text value "full JSON config"
        datetime updated_at
    }

    reports {
        varchar255 name PK
        datetime saved_at
        text md_content
        text live_results "JSON snapshot"
        text configs_per_run "JSON array"
        text configs "JSON snapshot"
        datetime created_at
        datetime updated_at
    }

    profiles {
        varchar255 name PK
        text data "JSON config subset"
        datetime created_at
        datetime updated_at
    }

    service_profiles {
        varchar255 name PK
        text data "JSON service config"
        datetime created_at
        datetime updated_at
    }

    chat_templates {
        varchar255 filename PK
        text content
        int size
        datetime modified_at
        datetime created_at
        datetime updated_at
    }

    settings {
        varchar255 key PK "e.g. jwt-secret"
        text value
        datetime updated_at
    }

    migrations {
        int version PK
        datetime applied_at
    }
```

### Table Descriptions

| Table | Purpose | Access Pattern |
|-------|---------|---------------|
| **users** | User accounts with roles and bcrypt-hashed passwords | CRUD via auth routes, first user auto-promoted to admin |
| **configs** | Single-row storage for the full benchmark configuration JSON | Read frequently, deep-merged with defaults on load |
| **reports** | Saved benchmark results with markdown content and config snapshots | Created from current results via `/api/save-report` |
| **profiles** | Named config subsets for quick switching (e.g., "fast test", "full grid") | Load into active config via `/api/profile/:name/load` |
| **service_profiles** | Named llama-server configurations for systemd deployments | Apply to running service via `/api/service-profile/:name/load` |
| **chat_templates** | Chat template files for models | Download via wget, stored with content in DB |
| **settings** | Key-value store for application settings (JWT secret, etc.) | Read/write via data-layer |
| **migrations** | Schema version tracking | Auto-managed by db.js |

### Three-Tier Database Strategy

The database layer (`db.js`) implements a fallback chain:

1. **MySQL** — Connection pool via `mysql2/promise`, configured via `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_POOL_SIZE` env vars
2. **SQLite** — `better-sqlite3`, WAL mode, foreign keys enabled, path `~/.betty/betty.db`
3. **JSON files** — `json-store.js`, file-based key-value storage as last resort

All tiers share a unified interface: `db.init()`, `db.query()`, `db.get()`, `db.all()`, `db.run()`, `db.jsonGet()`, `db.jsonAll()`, `db.jsonRun()`.

---

## Benchmark Lifecycle

End-to-end flow from configuration to results:

```mermaid
sequenceDiagram
    participant UI as Frontend UI
    participant API as api-server.js
    participant Config as Config Store<br/>(DB + defaults)
    participant Engine as index.js<br/>(child process)
    participant Git as llama.cpp<br/>(git + build)
    participant Server as llama-server
    participant Results as results.md<br/>+ SSE stream

    Note over UI,Results: Phase 1: Configuration
    UI->>Config: User edits test_params<br/>contextLength, gpuLayerOffload,<br/>batchSize, uBatchSize, cacheRam
    Config-->>UI: Config saved

    Note over UI,Results: Phase 2: Launch
    UI->>API: POST /api/run
    API->>Config: Load full config (deep-merge defaults)
    API->>Engine: spawn('node', ['index.js'])

    Note over UI,Results: Phase 3: Build
    Engine->>Git: git clone or (stash + pull)
    Engine->>Git: cmake + make<br/>(CUDA, FA, graphs, NCCL, LTO…)
    Git-->>Engine: llama-server binary ready

    Note over UI,Results: Phase 4: Grid Search Generation
    Engine->>Engine: Generate parameter arrays<br/>(multiplicative contextLength,<br/>batch permutations)
    Engine->>Engine: Compute cartesian product<br/>of all combinations

    Note over UI,Results: Phase 5: Test Run Loop
    loop Each combination
        Engine->>Engine: Check sys memory<br/>(max_sys_mem threshold)
        Engine->>Server: Kill any existing server
        Engine->>Server: spawn llama-server<br/>(with this combo's params)
        Server-->>Engine: Health check OK<br/>(up to 15 min for large models)

        loop 4 benchmark messages
            Engine->>Server: POST /chat/completions<br/>(accumulating history)
            Server-->>Engine: Response + timing data
            Engine->>Results: BENCHMARK_JSON:<br/>message-start / message-complete
        end

        Engine->>Engine: Collect metrics<br/>(prompt t/s, gen t/s,<br/>total time, memory)
        Engine->>Results: Write to results.md
        Engine->>Results: BENCHMARK_JSON:<br/>test-run-complete
        Engine->>Server: Kill server
    end

    Note over UI,Results: Phase 6: Output
    Engine-->>API: stdout/stderr streamed<br/>via child process pipes
    API->>Results: Parse lines, extract metrics
    API->>UI: SSE events:<br/>status, results, log, heartbeat
    UI->>UI: Live progress display
    Engine-->>API: Process exit (complete/error)
    API->>UI: SSE: status=complete
    UI->>UI: Final results table
```

### Grid Search Details

The benchmark engine generates test combinations from these configurable parameters:

| Parameter | Generation Strategy |
|-----------|-------------------|
| `contextLength` | Multiplicative range (e.g., 512, 1024, 2048, 4096, 8192) |
| `gpuLayerOffload` | Linear range or specific values |
| `batchSize` | Linear range |
| `uBatchSize` | Linear range |
| `cacheRam` | Linear range |

**Constraint:** Batch permutations ensure `batchSize >= uBatchSize` for all combinations. The cartesian product of all valid combinations determines total test runs.

### Metrics Collected Per Test Run

- Prompt tokens/second
- Generation tokens/second
- Total response time
- System memory usage
- Per-message timing breakdown

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Vue Frontend
    participant API as Express API
    participant Auth as auth/routes.js
    participant Store as user-store.js
    participant DB as Database

    Note over U,DB: Registration (first user = admin)
    U->>FE: Fill registration form
    FE->>API: POST /api/auth/register<br/>{username, password}
    API->>Auth: register()
    Auth->>Store: Check if users table empty
    Store->>DB: SELECT COUNT(*) FROM users
    DB-->>Store: 0 (first user)
    Store->>Store: Set role = 'admin'
    Store->>Store: bcrypt.hash(password)
    Store->>DB: INSERT INTO users<br/>(UUID, username, hash, role)
    Store-->>Auth: User created
    Auth->>Auth: jwt.sign({id, username, role})
    Auth-->>FE: {token, user}
    FE->>FE: localStorage.setItem('betty-token', token)

    Note over U,DB: Login
    U->>FE: Enter credentials
    FE->>API: POST /api/auth/login<br/>{username, password}
    API->>Auth: login()
    Auth->>Store: findByUsername()
    Store->>DB: SELECT * FROM users<br/>WHERE username = ?
    DB-->>Store: User row
    Store->>Store: bcrypt.compare(password, hash)
    Store-->>Auth: Match confirmed
    Auth->>Auth: jwt.sign({id, username, role})<br/>expires: JWT_EXPIRES_IN (default 24h)
    Auth-->>FE: {token, user}
    FE->>FE: Store token, redirect to dashboard

    Note over U,DB: Protected Request
    FE->>API: GET /api/configs<br/>Authorization: Bearer <token>
    API->>Auth: authenticate()
    Auth->>Auth: jwt.verify(token, secret)
    Auth->>Auth: Check expiration
    Auth-->>API: req.user = {id, username, role}
    API->>Auth: authorize('admin','operator','viewer')
    Auth-->>API: Role OK, proceed
    API->>DB: Fetch configs
    DB-->>API: Config data
    API-->>FE: 200 + data

    Note over U,DB: Role Enforcement
    FE->>API: PUT /api/configs<br/>Authorization: Bearer <token>
    API->>Auth: authenticate()
    Auth-->>API: req.user (role: 'viewer')
    API->>Auth: authorize('admin')
    Auth-->>API: 403 Forbidden
    API-->>FE: 403 — admin only
```

### Auth Details

| Aspect | Implementation |
|--------|---------------|
| **Token format** | JWT (HS256), stored in `localStorage: betty-token` |
| **Token delivery** | `Authorization: Bearer <token>` header, or `?token=` query param (for SSE/EventSource) |
| **Secret storage** | DB `settings` table (key `jwt-secret`) → file `~/.betty/jwt-secret` → auto-generate 96-char hex |
| **Password hashing** | bcrypt |
| **Expiration** | `JWT_EXPIRES_IN` env var, default `24h` |
| **Roles** | `admin` (full access), `operator` (run benchmarks/save reports), `viewer` (read-only) |
| **Default admin** | `admin`/`admin` or `ADMIN_PASSWORD` env var, created on first startup |
| **Public routes** | `/auth/login`, `/auth/register`, `/health`, `/docs/*`, `/library/*`, `/pi/skills` |

---

## Configuration System

### Storage and Loading

Configuration is stored in the `configs` database table (single row, `id=1`) with JSON file fallback at `configs.json`. On every load, the stored config is **deep-merged** with `DEFAULT_CONFIGS` so new keys are auto-added without overwriting user values.

### Configuration Sections

| Section | Purpose |
|---------|---------|
| `export_configs` | CUDA environment variables (unified memory, launch queues, P2P, LLAMA_ARG_FIT) |
| `test_params` | Grid search parameters (contextLength, gpuLayerOffload, batchSize, uBatchSize, cacheRam) |
| `build_make_params` | CMake build flags (CUDA, flash attention, graphs, NCCL, LTO, ccache, FP16) |
| `cuda_configs` | CUDA version, NVCC path |
| `model_configs` | Sampling parameters (temperature, top_p, min_p, top_k) |
| `server_params` | llama-server flags (cont-batching, flash-attn, reasoning, rope-scaling, parallel, gpu-layers) |
| `gpu_selection` | Multi-GPU selection and device indices |
| `split_params` | Layer/tensor split configuration for multi-GPU |
| `spec_params` | Speculative decoding configuration |
| `benchmark_messages` | Array of 4 messages sent sequentially per test run |
| `max_sys_mem` | System memory threshold percentage |
| `llama_port` / `llama_host` | llama-server address |
| `model` | Model filename (resolved from `~/.betty/models/`) |

### Profiles

Config profiles (stored in the `profiles` table) allow saving and loading named subsets of configuration. Loading a profile merges its data into the active config without replacing unrelated keys. Service profiles (`service_profiles` table) serve the same purpose for systemd service configurations.

---

## Cross-References

### QA Guides
- qa/getting-started]] — Installation and first run
- qa/benchmark-workflow]] — Running benchmarks step by step
- qa/model-management]] — Managing GGUF models
- qa/service-management]] — systemd service control
- qa/profile-workflow]] — Config and service profiles
- qa/report-workflow]] — Saving and viewing benchmark reports
- qa/api-usage]] — API reference and examples

### Concepts
- concepts/data-flow]] — Detailed data flow analysis
- concepts/config-schema]] — Full configuration schema reference
- concepts/grid-search]] — Grid search parameter generation
- concepts/auth-flow]] — Authentication and authorization deep dive

### Related Documentation
- USER-MANUAL]] — User-facing guide
- configuration-reference]] — Configuration reference
- config]] — Configuration overview
- api-reference]] — API documentation
- models]] — Model documentation
- dashboard]] — Dashboard details
- reports]] — Reports documentation
- troubleshooting]] — Common issues and fixes
- CHANGELOG]] — Version history
