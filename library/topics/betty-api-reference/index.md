# Betty API Reference

Complete reference for all API endpoints in `api-server.js`. All responses follow the pattern `{success: boolean, ...}`.

## Base URL

```
http://localhost:3456/api
```

Port is configurable via `API_PORT` environment variable (default: `3456`). Host via `API_HOST` (default: `0.0.0.0`).

---

## Config Endpoints

### GET `/api/configs`

Read the current configuration from `configs.json`.

**Response:**
```json
{
  "success": true,
  "data": {
    "export_configs": { ... },
    "max_sys_mem": 93,
    "llama_port": 11434,
    "model": "unsloth_gemma-4-12B-it-qat-GGUF/gemma-4-12B-it-qat-UD-Q4_K_XL.gguf",
    "test_params": { ... },
    "build_make_params": { ... },
    ...
  }
}
```

### PUT `/api/configs`

Save configuration. The request body becomes the new `configs.json` content.

**Request Body:**
```json
{
  "max_sys_mem": 93,
  "llama_port": 11434,
  "model": "...",
  ...
}
```

**Response:**
```json
{ "success": true, "message": "Config saved" }
```

---

## Messages Endpoint

### GET `/api/messages`

Returns all benchmark messages collected during the current session (via SSE).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "testRunId": 1,
      "messages": [
        {
          "messageIndex": 1,
          "prompt": "Develop a design doc...",
          "response": "...",
          "promptTokens": 1234,
          "generatedTokens": 5678,
          "totalTimeMs": 12345
        }
      ]
    }
  ]
}
```

---

## Profile Endpoints

Config profiles are stored as JSON files in `~/.betty/profiles/`.

### GET `/api/profiles`

List all saved profiles with metadata.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "my-config",
      "filename": "my-config.json",
      "created": "2026-06-15T10:00:00.000Z",
      "modified": "2026-06-17T14:30:00.000Z"
    }
  ]
}
```

### GET `/api/profile/:name`

Get a specific profile by name (extension stripped).

**Response:**
```json
{ "success": true, "data": { /* full config object */ } }
```

**404:**
```json
{ "success": false, "error": "Profile not found" }
```

### POST `/api/profile`

Save a new profile.

**Request Body:**
```json
{
  "name": "my-config",
  "data": { "max_sys_mem": 93, "test_params": {...}, ... }
}
```

Name is sanitized: `name.replace(/[^a-zA-Z0-9_-]/g, "_")`.

**Response:**
```json
{ "success": true, "message": "Profile saved" }
```

### DELETE `/api/profile/:name`

Delete a profile by name.

**Response:**
```json
{ "success": true, "message": "Profile deleted" }
```

### POST `/api/profile/:name/load`

Load a profile into configs.json (overwrites current config).

**Response:**
```json
{
  "success": true,
  "message": "Profile \"my-config\" loaded",
  "data": { /* full config object */ }
}
```

---

## Status Endpoints

### GET `/api/status`

Current benchmark status.

**Response:**
```json
{
  "success": true,
  "status": "testing",
  "testRun": 3,
  "liveResults": [
    {
      "testRunId": 1,
      "avgGenTokensPerSec": 45.2,
      "avgPromptTokensPerSec": 120.5,
      "totalGenTokens": 5678,
      "totalPromptTokens": 1234,
      "totalTimeMs": 123456,
      "avgMemUsed": 8.5,
      "avgMemTotal": 64
    }
  ],
  "processAlive": true,
  "buildStatus": "idle"
}
```

Status values: `idle` | `building` | `testing` | `error` | `stopped`

### GET `/api/health`

Simple health check.

**Response:**
```json
{ "status": "ok", "uptime": 12345.67 }
```

---

## SSE Stream

### GET `/api/stream`

Open Server-Sent Events connection for real-time benchmark updates.

**Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Retry-After: 3
```

**Events:** `status`, `results`, `message-start`, `message-complete`, `test-run-complete`, `log`, `heartbeat`

See [[betty-architecture]] for full event documentation.

---

## Benchmark Endpoints

### POST `/api/run`

Start a new benchmark run.

**Request Body:**
```json
{
  "skipBuild": false,
  "env": { "API_KEY": "secret" }
}
```

- `skipBuild`: Override `configs.skip_build`
- `env`: Additional environment variables passed to the benchmark process

**Response:**
```json
{ "success": true, "message": "Benchmark started" }
```

**409** (already running):
```json
{ "success": false, "error": "Benchmark is already testing" }
```

### POST `/api/stop`

Stop the running benchmark (SIGTERM → SIGKILL after 5s).

**Response:**
```json
{ "success": true, "message": "Benchmark stopping..." }
```

---

## Reports Endpoints

Reports are stored as JSON files in the `reports/` directory. Each report contains `mdContent`, `liveResults`, `configsPerRun`, and `configs`.

### GET `/api/reports`

List all saved reports.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "2026-06-17-gemma-4-12B-it-qat-UD-Q4_K_XL",
      "filename": "2026-06-17-gemma-4-12B-it-qat-UD-Q4_K_XL.json",
      "created": "...",
      "modified": "..."
    }
  ]
}
```

### GET `/api/report/:name`

Get a specific report.

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "2026-06-17-gemma-4-12B-it-qat-UD-Q4_K_XL",
    "savedAt": "2026-06-17T14:30:00.000Z",
    "mdContent": "# llama.cpp Benchmark Results\n\n...",
    "liveResults": [...],
    "configsPerRun": [...],
    "configs": {...}
  }
}
```

### POST `/api/report`

Save a report manually.

**Request Body:**
```json
{
  "name": "my-report",
  "data": { /* report object */ }
}
```

### DELETE `/api/report/:name`

Delete a report.

### GET `/api/report/:name/configs/:testRunId`

Get detailed configuration for a specific test run within a report.

**Response:**
```json
{
  "success": true,
  "data": {
    "testRunId": 3,
    "testParameters": {
      "contextLength": 131072,
      "batchSize": 512,
      "uBatchSize": 256,
      "cacheRam": 4096,
      "gpuLayerOffload": 999
    },
    "modelParameters": { "temperature": 0.6, "topP": 0.95, "minP": 0, "topK": 20 },
    "serverParameters": { ... },
    "splitParameters": { ... },
    "environment": { ... },
    "cmakeFlags": { ... }
  }
}
```

### GET `/api/report/:name/commands/:testRunId`

Get reproducible build and launch commands for a specific test run.

**Response:**
```json
{
  "success": true,
  "data": {
    "build": {
      "env": ["export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1", ...],
      "cmake": "cmake -B build -DCMAKE_BUILD_TYPE=Release -DGGML_CUDA=1 ...",
      "make": "cmake --build build --config Release -j 14 --clean-first",
      "full": "export ... && cd llama.cpp && cmake ... && cmake --build ..."
    },
    "launch": {
      "env": ["export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1", ...],
      "command": "./llama-server -m /path/model.gguf --port 11434 ...",
      "full": "export ... && cd llama.cpp/build/bin && ./llama-server ..."
    },
    "hasPerRunConfig": true
  }
}
```

---

## Results Endpoint

### GET `/api/results`

Get the raw markdown results file (`results.md`).

**Response:**
```json
{
  "success": true,
  "data": "# llama.cpp Benchmark Results\n\n## Per-Message Results\n\n| Test Run | Message | ..."
}
```

### POST `/api/save-report`

Save current results as a report (auto-named with date + model basename, or custom name).

**Request Body:**
```json
{ "name": "my-custom-report" }
```

---

## Models Endpoint

### GET `/api/models?directory=hf_downloads`

List model files (`.gguf`, `.bin`, `.safetensors`) in a directory recursively.

**Response:**
```json
{
  "success": true,
  "data": ["unsloth_gemma-4-12B-it-qat-GGUF/gemma-4-12B-it-qat-UD-Q4_K_XL.gguf"]
}
```

---

## Systemd Service Endpoints

### POST `/api/service/start`

Start the `llama.service` systemd user service.

### POST `/api/service/stop`

Stop the `llama.service` systemd user service.

### GET `/api/service/status`

Check if `llama.service` is active.

**Response:**
```json
{ "success": true, "active": true }
```

### POST `/api/service/install`

Install a systemd service from a report's launch command.

**Request Body:**
```json
{
  "reportName": "2026-06-17-gemma-4-12B-it-qat-UD-Q4_K_XL",
  "testRunId": 3
}
```

Writes service file to `~/.config/systemd/user/llama.service` and environment file to `~/.config/systemd/user/llama-benchmark.env`.

---

## System Endpoints

### GET `/api/system-status`

Get system memory information from `/proc/meminfo`.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalGB": 64,
    "usedGB": 12.3,
    "availableGB": 51.7,
    "totalMB": 65536,
    "usedMB": 12595,
    "percentUsed": 19
  }
}
```

### POST `/api/kill-port`

Kill all processes bound to the llama port (from `configs.llama_port`).

**Response:**
```json
{
  "success": true,
  "message": "Killed 1 process(es) on port 11434",
  "killed": ["12345"]
}
```

---

## Build Endpoints

### POST `/api/build`

Build llama.cpp (SSE stream with progress).

**Response:** SSE stream with events: `build-log` containing `PROGRESS:{pct}`, log lines, and `STATUS:Build complete!` or `STATUS:Build failed`.

### DELETE `/api/build/delete`

Delete the `llama.cpp/build` directory.

**Response:**
```json
{ "success": true, "message": "Build directory deleted" }
```

---

## Clone Endpoint

### POST `/api/clone`

Clone a git repository (shallow clone, depth=1).

**Request Body:**
```json
{
  "url": "https://github.com/ggml-org/llama.cpp",
  "branch": "master",
  "dir": "llama.cpp"
}
```

**Response:** SSE stream with events: `clone-log` containing `PROGRESS:{pct}`, log lines, and `STATUS:Clone complete!`.

---

## HuggingFace Endpoints

### GET `/api/hf/search?q=llama&limit=20&sort=downloads&filter=gguf`

Search HuggingFace models via the free API (no auth needed).

**Query Params:**
| Param | Default | Description |
|-------|---------|-------------|
| `q` | (required) | Search query |
| `limit` | 20 | Max results |
| `sort` | downloads | Sort field |
| `direction` | -1 | -1 = descending, 1 = ascending |
| `filter` | null | Filter by tag (e.g., `gguf`) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "org/model-name",
      "modelId": "org/model-name",
      "description": "...",
      "downloads": 12345,
      "likes": 567,
      "tags": ["gguf", "transformers", "..."],
      "pipeline_tag": "text-generation",
      "lastModified": "2026-06-15T10:00:00.000Z"
    }
  ]
}
```

### GET `/api/hf/model/:id`

Get model details (full metadata from HuggingFace API).

### GET `/api/hf/model/:id/files`

List all files in a model repository.

### POST `/api/hf/download`

Download a model file with SSE progress updates.

**Request Body:**
```json
{
  "modelId": "org/model-name",
  "filename": "model-Q4_K_M.gguf",
  "targetDir": "hf_downloads"
}
```

If `filename` is omitted, auto-selects the first `.gguf` file.

**Response:** SSE stream with events: `hf-download` containing `PROGRESS:{pct}:{bytes}`, `STATUS:Download complete`, or `STATUS:Download failed`.

### GET `/api/hf/download/:modelId`

Check download progress for a model.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "downloading",
    "progress": 45,
    "total": 8589934592,
    "downloaded": 3865470566,
    "filename": "model-Q4_K_M.gguf",
    "filePath": "/path/hf_downloads/org_model-name/model-Q4_K_M.gguf"
  }
}
```

### GET `/api/hf/downloads`

List all downloaded models with their files.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "modelId": "org_model-name",
      "files": [
        { "name": "model-Q4_K_M.gguf", "size": 8589934592, "modified": "..." }
      ]
    }
  ]
}
```

### DELETE `/api/hf/download/:modelId`

Delete a downloaded model directory.

---

## Error Responses

All error responses follow this pattern:

```json
{ "success": false, "error": "Error message" }
```

Common HTTP status codes:
- `400` — Bad request (missing required fields)
- `404` — Not found (profile/report/model)
- `409` — Conflict (build or benchmark already running)
- `500` — Internal server error

## See Also

- [[betty-architecture]] — System architecture
- [[betty-configuration]] — Configuration system

## Tags

betty, api, express, sse, huggingface, llama.cpp, configuration
