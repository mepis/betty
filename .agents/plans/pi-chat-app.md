# Pi Web Chat App — Implementation Plan

## 1. Purpose

Build a web-based chat application that lets users interact with the Pi coding agent (`pi`) through a modern chat interface. The app serves as a browser-based front-end to Pi's RPC mode, enabling users to chat with Pi without opening a terminal.

**Scope (in):**
- Node.js/Express backend that spawns Pi in RPC mode and proxies communication
- WebSocket real-time streaming of Pi's responses
- Vue 3 frontend with a clean chat UI
- Message history, streaming display, typing indicator
- Session management (one Pi instance per chat session)

**Scope (out):**
- Authentication / user accounts
- Multi-user / collaborative chat
- File upload / download
- Pi configuration / model selection (can be added later)
- Mobile responsive design (basic responsiveness only)

## 2. Approach

### Architecture
- **Monorepo** at project root with `src/backend/` and `src/frontend/` subdirectories
- **Backend:** Express.js + `ws` (WebSocket) + `child_process` (to spawn Pi in RPC mode)
- **Frontend:** Vue 3 (Composition API) + Vite + plain CSS (no UI framework)
- **Communication:** WebSocket between frontend and backend; JSONL over stdin/stdout between backend and Pi

### Backend Design
- `server.js` — Express HTTP server + WebSocket server on port 3001
- `pi-session.js` — Manages a Pi subprocess: spawns `pi --mode rpc`, reads JSONL from stdout, writes JSON commands to stdin, emits events to WebSocket clients
- WebSocket protocol:
  - Client → Server: `{ type: "prompt", content: "message" }`, `{ type: "stop" }`, `{ type: "new-session" }`
  - Server → Client: `{ type: "message", role: "user|assistant", content: "..." }`, `{ type: "stream", content: "..." }`, `{ type: "status", status: "starting|ready|error" }`, `{ type: "error", message: "..." }`

### Frontend Design
- Single-page chat interface
- `App.vue` — root component with message list and input area
- `MessageBubble.vue` — renders individual messages (user/assistant)
- `StreamingView.vue` — renders streaming assistant text with cursor
- Clean dark-themed chat UI similar to popular AI chat apps

### Key Technical Considerations
1. **Pi subprocess lifecycle:** Each WebSocket session gets its own Pi subprocess. The subprocess is killed when the WebSocket disconnects.
2. **JSONL parsing:** Pi's RPC mode outputs LF-delimited JSON lines. Need to buffer partial lines.
3. **Streaming:** Pi's `message_update` events provide incremental text. Push these as `stream` WebSocket events.
4. **Error handling:** Pi may fail to start, crash, or produce malformed output. All errors must be caught and sent to the client.
5. **Backpressure:** WebSocket send buffer must be monitored to avoid memory issues during fast streaming.

### Alternatives Considered
- **Pi SDK (`createAgentSession`):** Rejected — requires `@earendil-works/pi-coding-agent` npm package which is not installed locally; RPC subprocess is more reliable
- **Server-Sent Events (SSE):** Rejected — need bidirectional communication (stop command), WebSocket is better
- **Vue UI framework (Vuetify, etc.):** Rejected — adds unnecessary dependency weight; custom CSS is cleaner for a focused chat app

## 3. Phased Plan

### Phase 1: Backend Foundation
Create the Express + WebSocket server with Pi subprocess integration.

**Task 1.1: Backend package.json and dependencies**
- Create `src/backend/package.json` with express, ws, uuid dependencies
- Install dependencies
- Acceptance criteria: `npm install` succeeds in `src/backend/`

**Task 1.2: Pi session manager (pi-session.js)**
- Spawn Pi subprocess with `pi --mode rpc`
- Read JSONL from stdout, parse events
- Write JSON commands to stdin
- Emit events: `message`, `stream`, `status`, `error`
- Acceptance criteria: Can spawn Pi, send `prompt` command, receive `message_update` events

**Task 1.3: WebSocket server (server.js)**
- Express HTTP server on port 3001
- WebSocket upgrade handler
- Session lifecycle: new session → spawn Pi → proxy messages → cleanup on disconnect
- WebSocket protocol handling (prompt, stop, new-session)
- Acceptance criteria: Can connect via WebSocket, send prompt, receive streamed response

### Phase 2: Frontend Foundation
Create the Vue 3 + Vite frontend with basic chat UI.

**Task 2.1: Frontend scaffolding**
- Create `src/frontend/package.json` with Vue 3, Vite, @vitejs/plugin-vue
- Create `index.html` entry point
- Create `vite.config.js`
- Acceptance criteria: `npm run dev` starts Vite dev server

**Task 2.2: App.vue and WebSocket composable**
- `useWebSocket.js` composable: connect, disconnect, send, receive events
- `App.vue`: message list, input area, send button
- Acceptance criteria: Can connect to backend, display messages, send prompt

**Task 2.3: Message components and styling**
- `MessageBubble.vue`: user and assistant message rendering
- `StreamingView.vue`: streaming text with blinking cursor
- Main CSS with dark theme, chat bubbles, responsive layout
- Acceptance criteria: Chat UI looks polished, messages render correctly, streaming text is visible

### Phase 3: Integration & Polish
Wire everything together and polish the experience.

**Task 3.1: Root package.json and scripts**
- Update root `package.json` with `dev`, `build`, `start` scripts
- Scripts: `npm run dev` (both backend + frontend), `npm run backend`, `npm run frontend`
- Acceptance criteria: `npm run dev` starts both servers

**Task 3.2: Error handling and edge cases**
- Pi spawn failure → show error message in UI
- Pi crash during session → show reconnection prompt
- WebSocket disconnect → reconnect attempt
- Acceptance criteria: Graceful handling of all failure modes

**Task 3.3: UX polish**
- Keyboard shortcut (Enter to send, Shift+Enter for newline)
- Auto-scroll to bottom on new messages
- Session indicator in header
- "New Chat" button to start fresh session
- Acceptance criteria: Chat feels responsive and polished

## 4. Validation

### L1 — Unit/Component
- Pi session manager handles JSONL parsing correctly (test with sample JSONL)
- WebSocket composable handles connect/disconnect/reconnect
- MessageBubble renders user vs assistant messages differently

### L2 — Integration
- Backend spawns Pi subprocess and receives events
- WebSocket proxy forwards messages between client and Pi
- Frontend displays streamed responses in real time

### L3 — System
- Full flow: Open app → connect → send message → see streamed response → send follow-up
- New session: Click "New Chat" → fresh Pi instance → new conversation
- Error recovery: Kill Pi → see error → start new session → works

### Manual Testing Checklist
- [ ] `npm run dev` starts both servers
- [ ] Frontend loads at `http://localhost:5173`
- [ ] WebSocket connects to backend at `ws://localhost:3001`
- [ ] Sending a message triggers Pi and shows streamed response
- [ ] Follow-up messages work in the same session
- [ ] "New Chat" starts a fresh Pi instance
- [ ] Streaming text is readable with cursor indicator
- [ ] Error handling works when Pi fails to start
- [ ] UI is clean and responsive

## 5. Progress Tracker

- [ ] Task 1.1: Backend package.json and dependencies — NOT STARTED
- [ ] Task 1.2: Pi session manager (pi-session.js) — NOT STARTED
- [ ] Task 1.3: WebSocket server (server.js) — NOT STARTED
- [ ] Task 2.1: Frontend scaffolding — NOT STARTED
- [ ] Task 2.2: App.vue and WebSocket composable — NOT STARTED
- [ ] Task 2.3: Message components and styling — NOT STARTED
- [ ] Task 3.1: Root package.json and scripts — NOT STARTED
- [ ] Task 3.2: Error handling and edge cases — NOT STARTED
- [ ] Task 3.3: UX polish — NOT STARTED
