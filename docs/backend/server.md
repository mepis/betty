# Backend / Server

## Tags

`backend`, `express`, `websocket`, `rpc`, `server`, `architecture`, `node.js`

---

## Overview

`src/backend/server.js` is the main entry point for Betty. It combines an Express.js HTTP server, a WebSocket server, an RPC agent manager, and a benchmark manager into a single Node.js process.

## Startup Sequence

1. Load environment variables (`dotenv/config`)
2. Configure Express middleware (JSON parsing, cookie parsing, auth)
3. Register auth pages (`/login`, `/register`)
4. Mount API routes (`/api/auth`, `/api/admin`, `/api/me`)
5. Configure static file serving (built frontend or dev fallback)
6. Register workspace and directory API endpoints
7. Create WebSocket server with auth verification
8. Create `RpcAgent` instance and start the pi subprocess
9. Create `BenchmarkManager` instance
10. Register benchmark REST API endpoints
11. Wire benchmark events to SSE and WebSocket clients
12. Start HTTP server and listen

## Key Classes

### RpcAgent

Manages the pi coding agent subprocess in RPC mode.

**Methods:**

| Method | Description |
|--------|-------------|
| `start()` | Spawn `pi --mode rpc --no-session` with provider/model from settings |
| `stop()` | Kill the subprocess with SIGTERM |
| `restart()` | Stop and restart with current workspace |
| `send(command)` | Send a JSONL command, return resolved response |
| `prompt(message, options)` | Send a user prompt with optional images |
| `abort()` | Abort the current generation |
| `getMessages()` | Retrieve all messages from the agent |
| `getState()` | Get current agent state (model, thinking level) |
| `getAvailableModels()` | List available models |
| `setModel(provider, modelId)` | Change the active model |
| `setThinkingLevel(level)` | Change thinking depth |
| `getCommands()` | List available agent commands |
| `getForkMessages()` | Get messages available for forking |
| `newSession()` | Start a new agent session |
| `compact(customInstructions)` | Compact the context window |
| `exportHtml()` | Export current session as HTML |
| `getSessionStats()` | Get context usage statistics |

**Events:**

| Event | Data | Description |
|-------|------|-------------|
| `event` | `{ type, ... }` | Agent streaming event (forwarded to all WebSocket clients) |
| `stderr` | `string` | Agent stderr output |
| `extension_ui_request` | `{ id, method, ... }` | Extension UI dialog request |
| `exit` | `(code, signal)` | Agent process exited |
| `error` | `Error` | Agent process error |

### BenchmarkManager

Manages the llama.cpp benchmark subprocess.

**Methods:**

| Method | Description |
|--------|-------------|
| `loadConfig()` | Load `configs.json` from benchmark directory |
| `start()` | Spawn benchmark script, begin log parsing |
| `stop()` | Kill benchmark process (SIGTERM, then SIGKILL after 5s) |
| `getStatus()` | Return `{ running, config }` |
| `getResults()` | Read `results.md` from benchmark directory |
| `parseLogOutput(text)` | Extract metrics from benchmark log lines |

**Events:**

| Event | Data | Description |
|-------|------|-------------|
| `stdout` | `string` | Benchmark stdout (forwarded to SSE + WebSocket) |
| `stderr` | `string` | Benchmark stderr |
| `status` | `(status, extra)` | Status change (building, testing, idle, error, stopped) |
| `exit` | `code` | Benchmark process exited |
| `error` | `message` | Benchmark process error |
| `results` | `{ liveResults }` | Parsed metrics update |

## HTTP API Routes

### Auth Pages (before static middleware)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/login` | Serve login HTML page |
| GET | `/register` | Serve registration HTML page |

### Public API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/status` | Return `{ authEnabled, hasUsers, isAuthenticated }` |
| GET | `/api/test` | Debug endpoint returning `{ ok: true }` |

### Protected API (requires auth when enabled)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/me` | Return current user info |
| GET | `/api/workspace` | Return current workspace path |
| POST | `/api/workspace` | Change workspace (restarts agent) |
| GET | `/api/directory` | List directory contents (for FolderPicker) |
| GET | `/api/benchmark/config` | Return benchmark configuration |
| POST | `/api/benchmark/start` | Start benchmark |
| POST | `/api/benchmark/stop` | Stop benchmark |
| GET | `/api/benchmark/status` | Return benchmark status |
| GET | `/api/benchmark/results` | Return benchmark results markdown |
| GET | `/api/configs` | Return benchmark configs.json |
| PUT | `/api/configs` | Save benchmark configs.json |
| GET | `/api/status` | Return live benchmark status |
| GET | `/api/stream` | SSE stream for benchmark events |
| POST | `/api/run` | Start benchmark run |
| POST | `/api/stop` | Stop benchmark run |
| GET | `/api/results` | Return benchmark results |
| GET | `/api/reports` | List saved reports |
| GET | `/api/report/:name` | Get specific report |
| POST | `/api/report` | Save a new report |
| DELETE | `/api/report/:name` | Delete a report |
| POST | `/api/save-report` | Save current results as report |

### Auth Routes (mounted at `/api/auth`)

See [[Backend / Auth Routes]].

### Admin Routes (mounted at `/api/admin`)

See [[Backend / Admin Routes]].

## WebSocket Protocol

### Client -> Server Messages

| Type | Fields | Description |
|------|--------|-------------|
| `prompt` | `message`, `streamingBehavior?`, `images?` | Send a user message |
| `abort` | — | Stop current generation |
| `get_messages` | — | Request current session messages |
| `get_state` | — | Request agent state |
| `get_available_models` | — | Request model list |
| `set_model` | `provider`, `modelId` | Change model |
| `set_thinking_level` | `level` | Change thinking depth |
| `get_commands` | — | Request command list |
| `get_fork_messages` | — | Request forkable messages |
| `new_session` | — | Start new session |
| `list_sessions` | — | List all sessions |
| `switch_session` | `sessionId` | Switch to session |
| `delete_session` | `sessionId` | Delete session |
| `rename_session` | `sessionId`, `name` | Rename session |
| `compact` | `customInstructions?` | Compact context |
| `export_html` | — | Export as HTML |
| `get_session_stats` | — | Get context usage |
| `benchmark_start` | — | Start benchmark |
| `benchmark_stop` | — | Stop benchmark |
| `benchmark_get_config` | — | Get benchmark config |
| `benchmark_get_results` | — | Get benchmark results |
| `extension_ui_response` | `id`, `value?`, `confirmed?`, `cancelled?` | Respond to extension UI |

### Server -> Client Messages

| Type | Fields | Description |
|------|--------|-------------|
| `connected` | `clientId` | Connection established |
| `agent_status` | `status` | Agent running/stopped |
| `agent_start` | — | Agent started generating |
| `agent_end` | `messages` | Agent finished generating |
| `message_update` | `assistantMessageEvent` | Streaming delta |
| `message_end` | — | Streaming content complete |
| `tool_execution_start` | `toolCallId`, `toolName`, `args` | Tool call started |
| `tool_execution_update` | `toolCallId`, `partialResult` | Tool call progress |
| `tool_execution_end` | `toolCallId`, `result`, `isError` | Tool call completed |
| `messages` | `messages` | Full message list |
| `state` | `state` | Agent state |
| `models` | `models` | Available models |
| `model_set` | `success`, `data` | Model changed |
| `thinking_level_set` | `success` | Thinking level changed |
| `commands` | `commands` | Available commands |
| `fork_messages` | `messages` | Forkable messages |
| `session_new` | `success`, `data`, `sessionId`, `sessionName` | New session created |
| `sessions_list` | `sessions` | Session list |
| `session_switched` | `sessionId`, `session`, `messages` | Session switched |
| `session_deleted` | `sessionId` | Session deleted |
| `session_renamed` | `session` | Session renamed |
| `compacted` | `success`, `data` | Context compacted |
| `session_stats` | `success`, `data` | Context usage stats |
| `html_exported` | `success`, `data` | HTML exported |
| `agent_exit` | `code`, `signal` | Agent process exited |
| `agent_error` | `message` | Agent error |
| `extension_ui_request` | `id`, `method`, ... | Extension UI dialog |
| `benchmark_stdout` | `message` | Benchmark stdout |
| `benchmark_stderr` | `message` | Benchmark stderr |
| `benchmark_status` | `status`, `testRun`, `liveResults` | Benchmark status |
| `benchmark_exit` | `code` | Benchmark exited |
| `benchmark_error` | `message` | Benchmark error |
| `error` | `message` | Generic error |

## Graceful Shutdown

On SIGINT or SIGTERM:

1. Clear all pending message save timers
2. Clear all SSE heartbeat intervals
3. Close all SSE client connections
4. Stop the RPC agent (SIGTERM)
5. Close all WebSocket connections
6. Close the WebSocket server
7. Close the HTTP server
8. Exit process
