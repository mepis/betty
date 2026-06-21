# Plan: Pi Chat Integration in Betty Frontend

## Architecture

```
Browser (Vue 3) ← SSE → Express API (:3456) ← Pi SDK → LLM Provider
```

The Pi SDK runs **server-side** in the Express process. The backend creates agent sessions and streams SDK events to the frontend via SSE (same infrastructure already used for benchmarks). The frontend renders a Pi TUI-like chat interface.

## Files to Create/Modify

### 1. Root `package.json` — Add Pi SDK dependency
- Add `@earendil-works/pi-coding-agent` to dependencies

### 2. `src/backend/api-server.js` — Add Pi agent endpoints
- Initialize Pi SDK (AuthStorage, ModelRegistry, SessionManager) at startup
- New endpoints:
  - `GET /api/pi/sessions` — list saved sessions
  - `POST /api/pi/session` — create new agent session
  - `GET /api/pi/session/:id/stream` — SSE stream for a session's events
  - `POST /api/pi/session/:id/prompt` — send a prompt to an active session
  - `POST /api/pi/session/:id/abort` — abort current operation
  - `DELETE /api/pi/session/:id` — dispose a session
- Store active sessions in a Map keyed by session ID
- Map Pi SDK events → SSE events for the frontend

### 3. `src/backend/frontend/src/stores/pi-chat.js` — Pinia store
- State: messages array, isStreaming, model info, token usage, cost, session ID, error state
- Actions: connect SSE, sendPrompt, abort, newSession, loadSessions
- SSE eventSource management (connect/disconnect on mount/unmount)

### 4. `src/backend/frontend/src/views/PiChat.vue` — Chat UI component
- Full-height chat layout matching Pi TUI:
  - **Message area** (scrollable): user messages, assistant messages, thinking blocks, tool calls/results
  - **Input area** (sticky bottom): textarea for user input, send button
  - **Status footer**: model name, tokens (↑↓), cost, streaming indicator
- Features:
  - Markdown rendering (marked)
  - Collapsible thinking blocks
  - Collapsible tool output
  - Auto-scroll on new content
  - Streaming text animation
  - Multi-line input (Shift+Enter)

### 5. `src/backend/frontend/src/router/index.js` — Add Pi route
- Add `/pi` route pointing to PiChat.vue

### 6. `src/backend/frontend/src/App.vue` — Add Pi nav item
- Add "Pi" nav item with chat icon

## SSE Event Protocol (Backend → Frontend)

```
event: pi-text
data: {"delta":"..."}

event: pi-thinking
data: {"delta":"..."}

event: pi-tool-start
data: {"name":"bash","params":{"command":"ls"}}

event: pi-tool-end
data: {"name":"bash","success":true,"output":"..."}

event: pi-message-start
data: {"role":"user"|"assistant","content":"..."}

event: pi-message-end
data: {"role":"assistant","content":"..."}

event: pi-agent-start
data: {}

event: pi-agent-end
data: {"tokens":{"input":100,"output":200},"cost":0.01}

event: pi-error
data: {"message":"..."}

event: pi-status
data: {"model":"claude-sonnet-4-5","thinking":"off","streaming":true}
```

## Implementation Steps

1. Install Pi SDK (`npm install @earendil-works/pi-coding-agent` in root)
2. Add Pi SDK initialization + endpoints to api-server.js
3. Create PiChat.vue component
4. Create pi-chat.js Pinia store
5. Add route + nav item
6. Test end-to-end
