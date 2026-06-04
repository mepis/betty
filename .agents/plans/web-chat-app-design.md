# Design Document: Self-Hosted LLM Agentic Chat Web Application

**Project:** betty
**Date:** 2026-06-03
**Status:** Design (pre-implementation)
**Author:** Planning agent

---

## 1. Purpose

### What This Is

A self-hosted, single-user web application for interacting with an AI coding agent via a browser-based chat interface. The application embeds the pi.dev SDK as its agent harness, providing real-time streaming of agent responses, tool execution visibility, and persistent session management.

### Why

- Provide browser-based access to the pi coding agent without requiring terminal interaction
- Enable chat-style interaction with full agent capabilities (file read/write/edit, bash, custom tools, extensions, skills)
- Maintain session persistence and the ability to resume, fork, or continue conversations
- Serve as a foundation for potential future features (multi-user, team collaboration, API gateway)

### Scope

**In scope:**
- Vue 3 SPA with Tailwind CSS for the frontend
- Node.js + Express.js backend with WebSocket support
- pi.dev SDK embedded directly in the backend (not RPC mode)
- Real-time streaming of agent text output and tool execution events
- Session management (create, list, resume, delete, fork)
- Markdown rendering for agent responses
- Model selection and switching
- Thinking level control
- Basic authentication (single shared secret)
- Extension UI protocol support (dialog methods: select, confirm, input, editor; fire-and-forget methods: notify, setStatus, setWidget, setTitle, set_editor_text)
- Session tree navigation via `navigateTree()`
- Session statistics (token usage, cost, context window)

**Out of scope (future work):**
- Multi-user support / multi-tenancy
- Image upload and vision support
- MCP server integration
- Docker containerization
- CI/CD pipeline

---

## 2. Approach

### High-Level Architecture

```
+--------------------------------------------------+
|                    Browser                       |
|  +--------------------------------------------+  |
|  |           Vue 3 SPA (Vite)                 |  |
|  |  +----------+ +------------+ +------------+ |  |
|  |  | Sidebar  | | ChatView   | | Settings   | |  |
|  |  | (sessions| | (messages  | | (model,    | |  |
|  |  |  list)   | |  + input)  | |  thinking, | |  |
|  |  +----------+ +------------+ |  session   | |  |
|  |                              |  stats)    | |  |
|  |  +------------------------------------+   |  |
|  |  | Pinia Store                        |   |  |
|  |  | (sessions, messages, connection)   |   |  |
|  |  +----------------+-------------------+   |  |
|  |                 | WebSocket              |  |
|  +-----------------+------------------------+  |
+---------------------+--------------------------+
                      | wss://localhost:3001/ws
+---------------------+--------------------------+
|                     v                          |
|  +------------------------------------------------+  |
|  |         Express.js + ws                        |  |
|  |  +-------------------------------------------+ |  |
|  |  |     WebSocket Route Handler               | |  |
|  |  |  - First-message auth (shared secret)     | |  |
|  |  |  - Runtime lifecycle                      | |  |
|  |  |  - Event relay (bidirectional)            | |  |
|  |  |  - Extension UI protocol                  | |  |
|  |  +--------------------+----------------------+ |  |
|  |                       |                         |  |
|  |  +--------------------v----------------------+ |  |
|  |  |  pi AgentSessionRuntime (SDK)             | |  |
|  |  |  - createAgentSessionRuntime()            | |  |
|  |  |  - runtime.newSession()                   | |  |
|  |  |  - runtime.switchSession()                | |  |
|  |  |  - runtime.fork()                         | |  |
|  |  |  - runtime.session.subscribe() -> WS      | |  |
|  |  |  - runtime.session.prompt() from WS       | |  |
|  |  +--------------------+----------------------+ |  |
|  |                       |                         |  |
|  |  +--------------------v----------------------+ |  |
|  |  |  DefaultResourceLoader                    | |  |
|  |  |  - Extensions (.pi/extensions/)           | |  |
|  |  |  - Skills (.pi/skills/)                   | |  |
|  |  |  - Prompts (.pi/prompts/)                 | |  |
|  |  |  - Context files (AGENTS.md)              | |  |
|  |  +--------------------+----------------------+ |  |
|  |                       |                         |  |
|  |  +--------------------v----------------------+ |  |
|  |  |  SettingsManager                           | |  |
|  |  |  - Global + project settings              | |  |
|  |  +--------------------+----------------------+ |  |
|  |                       |                         |  |
|  |  +--------------------v----------------------+ |  |
|  |  |     Session Persistence (JSONL)           | |  |
|  |  |  ~/.pi/agent/sessions/                    | |  |
|  |  +-------------------------------------------+ |  |
|  +------------------------------------------------+  |
|                                                       |
|  +------------------------------------------------+  |
|  |     REST API (Express routes)                  |  |
|  |  GET  /api/sessions           - List sessions  |  |
|  |  POST /api/sessions           - Create session |  |
|  |  DELETE /api/sessions/:id    - Delete          |  |
|  |  GET  /api/sessions/:id/stats - Stats          |  |
|  |  GET  /api/models             - Available models| |
|  |  GET  /api/commands           - Commands       |  |
|  |  GET  /api/health             - Health check   |  |
|  +------------------------------------------------+  |
+------------------------------------------------------+
```

### Key Technical Decisions

#### 1. SDK Embedding vs RPC Mode

**Decision:** Embed the pi SDK directly in the Node.js backend process.

**Rationale:**
- **Zero IPC overhead:** SDK mode runs in-process; RPC mode adds JSONL serialization/deserialization over stdin/stdout
- **Full type safety:** Direct TypeScript access to `AgentSession`, events, and state
- **State access:** Direct access to `session.agent.state`, messages, model, tools
- **Official recommendation:** pi.dev docs state "The SDK is preferred when you're in the same Node.js process"

**Rejected:** RPC mode (`pi --mode rpc`) -- unnecessary overhead for same-language integration.

#### 2. WebSocket vs Server-Sent Events (SSE)

**Decision:** Bidirectional WebSockets (`ws` library).

**Rationale:**
- Agent streaming requires server-to-client push (text deltas, tool events)
- User input requires client-to-server push (prompts, steer, followUp, abort)
- WebSockets provide full-duplex communication natively
- SSE is unidirectional (server-to-client only) -- would need REST fallback for client messages
- The `ws` library is lightweight, production-proven, and integrates cleanly with Express

**Rejected:** Socket.IO -- adds unnecessary complexity (rooms, namespaces, auto-reconnect) for a single-user application. Native WebSocket is sufficient.

#### 3. AgentSessionRuntime Per WebSocket Connection

**Decision:** Each WebSocket connection creates one `AgentSessionRuntime` via `createAgentSessionRuntime()`. The runtime owns the active `AgentSession` and supports session replacement (`newSession()`, `switchSession()`, `fork()`, `clone()`). When the connection closes, the runtime is disposed.

**Rationale:**
- `createAgentSession()` alone does NOT support session replacement -- only `AgentSessionRuntime` provides `newSession()`, `switchSession()`, `fork()`, `clone()`
- After session replacement, `runtime.session` changes -- the WebSocket handler must re-subscribe to events on the new session
- The runtime factory closes over process-global fixed inputs (AuthStorage, ModelRegistry) and recreates cwd-bound services for the effective cwd
- Session persistence is handled by pi's JSONL storage via `SessionManager.create(cwd)`
- Single-user application -- one runtime per connection is sufficient

**Rejected:** `createAgentSession()` alone -- lacks session replacement API needed for `new_session` and `switch_session` commands.

**Implementation pattern:**
```typescript
const createRuntime: CreateAgentSessionRuntimeFactory = async ({
  cwd,
  sessionManager,
  sessionStartEvent,
}) => {
  const services = await createAgentSessionServices({ cwd });
  return {
    ...(await createAgentSessionFromServices({
      services,
      sessionManager,
      sessionStartEvent,
    })),
    services,
    diagnostics: services.diagnostics,
  };
};

const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(process.cwd()),
});
```

#### 4. Vue 3 Composition API + Pinia

**Decision:** Vue 3 with `<script setup>` Composition API and Pinia for state management.

**Rationale:**
- Composition API is the modern Vue 3 standard (2026 best practice)
- Pinia is the official Vue state management library (replaced Vuex)
- Reactive WebSocket state (connection status, streaming messages) maps naturally to Pinia stores
- Vite as the build tool (fast HMR, native ESM, zero-config TypeScript)

#### 5. Tailwind CSS v4

**Decision:** Tailwind CSS v4 with the native PostCSS plugin.

**Rationale:**
- Tailwind v4 uses native CSS for configuration (no `tailwind.config.js`)
- Zero-runtime CSS -- all processing at build time
- Excellent developer experience with class-based styling
- No component library dependency -- keeps the app lightweight and customizable

#### 6. Markdown Rendering

**Decision:** `marked` for Markdown parsing + `highlight.js` for code syntax highlighting.

**Rationale:**
- `marked` is fast, well-maintained, and widely used
- `highlight.js` supports 190+ languages with auto-detection
- Both are lightweight and tree-shakeable
- Alternative: `markdown-it` -- more extensible but heavier; not needed for this use case

### Alternatives Considered and Rejected

| Alternative | Reason Rejected |
|---|---|
| **Nuxt 3** | SSR is unnecessary for a self-hosted single-user app. Adds build complexity and server requirements. |
| **React + Next.js** | User specified Vue 3. React ecosystem is larger but Vue's Composition API is equally capable. |
| **Svelte/SvelteKit** | Not requested. Vue 3 has a larger ecosystem and more WebSocket examples. |
| **Socket.IO** | Overkill for single-user. Native WebSocket is simpler and sufficient. |
| **MongoDB/SQLite for sessions** | pi's JSONL session format is already persistent and queryable. No additional database needed. |
| **pi RPC mode** | SDK embedding is officially recommended for Node.js. Zero IPC overhead. |
| **pi-web-ui components** | Lit-based web components designed for embedding in existing pages. Building custom Vue components gives full control over UX. |

---

## 3. Phased Plan

### Phase 1: Project Scaffolding and Backend Foundation

**Goal:** Set up the project structure, Express server, and basic WebSocket infrastructure.

#### Task 1.1: Initialize Project Structure

- Create `src/backend/` and `src/frontend/` directories
- Initialize `package.json` for backend (Express, ws, pi SDK, TypeScript)
- Create Vite + Vue 3 project in `src/frontend/`
- Set up TypeScript configuration for both packages
- Configure workspace or monorepo structure

**Acceptance criteria:**
- `npm run dev:backend` starts Express server
- `npm run dev:frontend` starts Vite dev server
- TypeScript compiles without errors in both packages

#### Task 1.2: Express Server with CORS and Static Serving

- Create Express server in `src/backend/src/server.ts`
- Configure CORS for frontend dev server (`localhost:5173`)
- Serve Vite production build from Express in production mode
- Add health check endpoint (`GET /api/health`)
- Add basic authentication middleware (shared secret via header)

**Acceptance criteria:**
- Server starts on configurable port (default 3001)
- Health check returns `{ status: "ok" }`
- CORS allows requests from frontend dev server
- Auth middleware rejects requests without valid secret

#### Task 1.3: WebSocket Server Setup

- Integrate `ws` with Express (upgrade handler)
- Implement WebSocket authentication via **first message only** (shared secret sent as `{ type: 'auth', payload: { secret: '...' } }`)
- Handle connection lifecycle (open, message, close, error)
- Add heartbeat/ping-pong for connection keepalive
- Log connection events

**Acceptance criteria:**
- WebSocket connects successfully; first message with valid auth is accepted
- First message with invalid or missing auth is rejected with close code 4011
- Heartbeat detects dead connections (30s timeout)
- Connection/close events are logged

### Phase 2: pi SDK Integration

**Goal:** Embed the pi SDK and relay agent events over WebSocket.

#### Task 2.1: AgentSessionRuntime Creation and Lifecycle

- Import `createAgentSessionRuntime`, `createAgentSessionFromServices`, `createAgentSessionServices`, `getAgentDir`, `SessionManager`, `AuthStorage`, `ModelRegistry`, `DefaultResourceLoader`, `SettingsManager` from `@earendil-works/pi-coding-agent`
- Build the runtime factory (`CreateAgentSessionRuntimeFactory`) that closes over `AuthStorage` and `ModelRegistry`
- Create `AgentSessionRuntime` on WebSocket connect (or resume existing session via `SessionManager.continueRecent()`)
- Subscribe to `runtime.session` events; **re-subscribe after every session replacement**
- **Bind extensions:** Call `runtime.session.bindExtensions({ uiContext, onError, commandContextActions })` after runtime creation AND after every session replacement. The `ExtensionUIContext` implementation relays all 9 extension UI methods to the client and accepts `extension_ui_response` commands back. The `onError` listener relays `extension_error` events.
- On WebSocket close: `await runtime.dispose()` (async — handles abort + session teardown internally)
- Handle session creation errors gracefully (including `modelFallbackMessage` and `extensionsResult.errors`)
- Configure `DefaultResourceLoader` with `cwd` and `agentDir` for extension/skill/prompt/context discovery
- Configure `SettingsManager` for compaction, retry, and other agent behaviors
- Accept `cwd` from environment variable (default `process.cwd()`)
- Read `runtime.diagnostics` after creation and relay to the frontend as startup warnings
  (diagnostics contains setup warnings and errors from the SDK)
- Periodically call `settingsManager.drainErrors()` and relay settings I/O errors to the frontend
  (SDK docs state: "SettingsManager does not print settings I/O errors. Use drainErrors() and report them in your app layer.")

**Acceptance criteria:**
- `AgentSessionRuntime` is created successfully on WebSocket connect
- `runtime.session` is subscribed to events
- Extensions are bound via `runtime.session.bindExtensions()` with UI context and error listener
- `runtime.dispose()` is called on WebSocket close (handles abort + teardown)
- Errors during session creation are sent to client as error events
- `modelFallbackMessage` is displayed as a warning toast on session resume
- Extension load errors are logged and optionally displayed
- Extensions, skills, prompts, and context files are discovered from project and global paths
- Runtime diagnostics are read after creation and relayed as startup warnings
- SettingsManager.drainErrors() is called periodically and errors are relayed to frontend

#### Task 2.2: Event Relay (Server to Client)

- Subscribe to `runtime.session.subscribe()` -- **re-subscribe after every session replacement** (`newSession`, `switchSession`, `fork`)
- **Re-bind extensions after every session replacement:** Call `runtime.session.bindExtensions(...)` again with the same bindings (the SDK docs explicitly state this is required)
- Map SDK `AgentSessionEvent` objects to WebSocket messages. The SDK event types are:

  **Agent lifecycle:** `agent_start`, `agent_end`

  **Turn lifecycle:** `turn_start`, `turn_end`

  **Message streaming:** `message_start`, `message_update`, `message_end`
  - `message_update` wraps `assistantMessageEvent` with delta types: `text_start`, `text_delta`, `text_end`, `thinking_start`, `thinking_delta`, `thinking_end`, `toolcall_start`, `toolcall_delta`, `toolcall_end`, `done`, `error`

  **Tool execution:** `tool_execution_start`, `tool_execution_update`, `tool_execution_end`

  **Queue state:** `queue_update`

  **Compaction:** `compaction_start`, `compaction_end`

  **Auto-retry:** `auto_retry_start`, `auto_retry_end`

  **Extension errors:** `extension_error`

  **Session metadata:** `session_info_changed`, `thinking_level_changed`

- Emit a `session_changed` event after every session replacement so the frontend can reset state
- Stream events in real-time (no batching)
- Handle rapid event bursts (backpressure management via `ws` `readyState` check)

**Acceptance criteria:**
- `message_update` events with `text_delta` stream to client in real-time
- Tool execution events (`tool_execution_start`, `tool_execution_end`) are relayed
- Agent lifecycle events (`agent_start`, `agent_end`) are relayed
- Turn events (`turn_start`, `turn_end`) are relayed for UI state
- Compaction events show "Compacting conversation..." indicator
- Auto-retry events show "Retrying (attempt X/Y)..." indicator
- `session_changed` is emitted after session replacement
- `session_info_changed` updates the sidebar when session name changes
- `thinking_level_changed` updates the settings panel when thinking level changes
- `compaction_end` with `willRetry` shows "Retrying after compaction..." indicator
- `auto_retry_end` with `finalError` shows error toast when retries are exhausted
- No events are lost during rapid streaming

#### Task 2.3: Command Handling (Client to Server)

- First message must be `auth` with shared secret. Reject connection with close 4011 if auth fails or is missing.
- Define client-to-server message protocol:
  ```typescript
  interface WSCommand {
    type:
      | 'auth'
      | 'prompt'
      | 'abort'
      | 'new_session'
      | 'switch_session'
      | 'fork'
      | 'clone'
      | 'navigate_tree'
      | 'set_model'
      | 'set_thinking_level'
      | 'set_session_name'
      | 'compact'
      | 'get_fork_messages'
      | 'get_messages'
      | 'get_last_assistant_text'
      | 'extension_ui_response';
    payload: Record<string, unknown>;
  }
  ```
- Route commands to SDK methods:
  - `auth` -- Validate shared secret (first message only)
  - `prompt` -- `runtime.session.prompt(text, { streamingBehavior: payload.streamingBehavior, source: "rpc" })`
    - `streamingBehavior: 'steer'` queues during streaming (delivered after current turn's tool calls)
    - `streamingBehavior: 'followUp'` queues after agent finishes
    - `source: "rpc"` tells extensions where input came from (extensions can filter by source)
    - Handles extension commands (`/mycommand`) and prompt template expansion (`/template`) automatically
  - `abort` -- `await runtime.session.abort()`
  - `new_session` -- `await runtime.newSession()` -- re-subscribe to new `runtime.session`
    - Check `cancelled` in response; show toast if cancelled by extension
  - `switch_session` -- `await runtime.switchSession(sessionPath, { cwdOverride: payload.cwdOverride })` -- re-subscribe to new `runtime.session`
    - Check `cancelled` in response; show toast if cancelled by extension
    - `cwdOverride` allows switching to a session in a different directory
  - `fork` -- `await runtime.fork(entryId, { position: payload.position ?? "before" })` -- re-subscribe to new `runtime.session`
    - Check `cancelled` in response; show toast if cancelled by extension
    - Response includes `selectedText?: string` (text from the forked entry) for pre-filling input
    - `position: "before"` creates a new branch (default); `position: "at"` replaces the current branch
  - `clone` -- `await runtime.fork(runtime.session.getLeafId(), { position: "at" })` -- re-subscribe
    - Check `cancelled` in response; show toast if cancelled by extension
  - `navigate_tree` -- `await runtime.session.navigateTree(targetId, { summarize, customInstructions, replaceInstructions, label })`
    - Check `cancelled` in response; update editor text if returned
    - `replaceInstructions?: boolean` -- if true, `customInstructions` replaces the default summarization prompt
    - `label?: string` -- attaches a user-defined marker to the branch summary entry
  - `set_session_name` -- `runtime.session.setSessionName(name)`
  - `get_fork_messages` -- `runtime.session.getUserMessagesForForking()` -- return list to client
  - `get_messages` -- `runtime.session.messages` -- return full message list to client (for reconnection)
  - `get_last_assistant_text` -- `runtime.session.getLastAssistantText()` -- return text to client
  - `set_model` -- Resolve model via `modelRegistry.find(payload.provider, payload.modelId)`, then call `await runtime.session.setModel(model)`
    - The command payload has `{ provider, modelId }` strings; the SDK requires a `Model<any>` object
    - If the model is not found, return an error event to the client
  - `set_thinking_level` -- `runtime.session.setThinkingLevel(level)`
  - `compact` -- `await runtime.session.compact(customInstructions)` -- manually compact the session
    - Returns `CompactionResult` with summary, tokens saved, etc.
  - `extension_ui_response` -- Route back to the extension runtime (select/confirm/input/editor responses)
- Validate all incoming commands (type checking, required fields)
- Use `runtime.setRebindSession(callback)` to automate the re-subscribe + re-bind pattern after session replacement
  - The callback should call `runtime.session.subscribe(eventHandler)` and `runtime.session.bindExtensions(bindings)`
  - This eliminates manual re-subscription code in `new_session`, `switch_session`, `fork`, `clone`, and `navigate_tree` handlers

**Acceptance criteria:**
- `auth` command validates shared secret on first message
- `prompt` command triggers agent response
- `prompt` without `streamingBehavior` while streaming throws an error (caught and relayed to client)
- `prompt` with `streamingBehavior: 'followUp'` queues after agent finishes
- Extension commands (`/mycommand`) execute immediately even during streaming
- `abort` command stops current agent operation
- `new_session` creates a fresh session and emits `session_changed`
- `switch_session` loads the correct conversation and emits `session_changed` (supports cwdOverride)
- `fork` creates a forked session and emits `session_changed` (supports position option)
- `clone` creates a cloned branch and emits `session_changed`
- `navigate_tree` navigates in-place within the session (supports replaceInstructions and label)
- `set_model` resolves provider+modelId via modelRegistry.find() and switches the active model
- `set_session_name` sets the session display name
- `get_fork_messages` returns forkable user messages
- `get_messages` returns the full message list (for reconnection)
- `get_last_assistant_text` returns the last assistant text
- Extension cancellation (cancelled response) shows a toast notification
- Invalid commands are rejected with error events

#### Task 2.4: Model, Settings, and Commands Management

- Create `GET /api/models` endpoint using `modelRegistry.getAvailable()` (synchronous)
  - Handle "no available models" case (empty array when no API keys configured)
  - Handle "no available models" error (no API keys configured)
- Create `GET /api/commands` endpoint to list available commands (extension commands, prompt templates, skills) via `resourceLoader.getPrompts()` and extension registry
- Create `GET /api/sessions/:id/stats` endpoint for token usage, cost, and context window stats
- Support `set_model` and `set_thinking_level` WebSocket commands
- Handle `AuthStorage` and `ModelRegistry` initialization
- Support API key configuration via environment variables or `auth.json`
- Support runtime API key override via `authStorage.setRuntimeApiKey()`
- Call `settingsManager.drainErrors()` periodically and relay settings I/O errors

**Acceptance criteria:**
- Available models are listed with provider, name, and availability status
- `modelRegistry.getAvailable()` is called synchronously (not async)
- Empty model list returns a clear message when no API keys are configured
- Commands list includes extension commands, prompt templates, and skills
- Session stats include token usage, cost, and context window percentage
- Model switching works mid-session (resolves provider+modelId via modelRegistry.find())
- Thinking level changes take effect immediately
- API keys are resolved from environment variables

### Phase 3: Frontend Chat Interface

**Goal:** Build the Vue 3 chat UI with real-time streaming.

#### Task 3.1: Pinia Stores

- Create `useChatStore` for:
  - WebSocket connection state (connected, connecting, disconnected, error)
  - Messages array (user messages + assistant messages with streaming state)
  - Current session info (id, model, thinking level, sessionName)
  - Streaming state (isStreaming, currentTool, isCompacting, retryAttempt, retryMax)
  - Queue state (pending steering/followUp messages)
  - Last compaction result (tokens saved, for UI display)
- Create `useSessionStore` for:
  - Sessions list (from REST API)
  - Active session id
  - Session CRUD operations
  - Session stats (tokens, cost, context usage)

**Acceptance criteria:**
- Stores are reactive and persist across component lifecycle
- WebSocket state transitions are tracked (connecting to connected to disconnected)
- Messages are stored with timestamps and roles
- Compaction and retry state is tracked for UI indicators
- Session stats update after `agent_end`

#### Task 3.2: WebSocket Client Service

- Create `WebSocketService` class:
  - Connect/disconnect with exponential backoff reconnection
  - Send commands with message IDs for correlation
  - Event parser (deserialize WSEvent messages)
  - Heartbeat client-side ping
  - Auto-reconnect on unexpected disconnect
- Composable `useWebSocket()` for Vue components

**Acceptance criteria:**
- Reconnects automatically after network interruption (max 5 retries, exponential backoff)
- Sends commands and receives events reliably
- Exposes `isConnected`, `isConnecting` reactive state
- Handles WebSocket errors gracefully

#### Task 3.3: Chat View Component

- Build `ChatView.vue` with:
  - Message list (scrollable, auto-scroll to bottom)
  - User messages (right-aligned, distinct styling)
  - Assistant messages (left-aligned, markdown rendered)
  - Streaming indicator with multi-state feedback:
    - `agent_start` -- "Thinking..."
    - `turn_start` -- "Working..."
    - `compaction_start` -- "Compacting conversation..."
    - `auto_retry_start` -- "Retrying (attempt X/Y)..."
  - Tool execution display (collapsible, showing tool name, status, output)
  - Thinking output display (collapsible, for models with thinking enabled)
  - Input area with send button and keyboard shortcut (Enter to send, Shift+Enter for newline)
  - Input area shows available commands from `/api/commands` as suggestions
  - Queue state display: show "N messages queued" when `queue_update` has pending messages
  - Compaction result display: show "Compacted: X tokens saved" after `compaction_end` with result
- Responsive layout (mobile-friendly)

**Acceptance criteria:**
- Messages render correctly with proper alignment
- Streaming text appears in real-time (character-by-character)
- Tool executions are visible and collapsible
- Thinking output is visible and collapsible
- Auto-scroll works during streaming
- Input is disabled during streaming (unless using steer via streamingBehavior)
- Streaming indicator reflects current agent state (thinking, working, compacting, retrying)
- Command suggestions are shown in the input area

#### Task 3.4: Markdown Rendering

- Create `MarkdownRenderer.vue` component:
  - Parse Markdown with `marked`
  - Syntax highlight code blocks with `highlight.js`
  - Support inline code, headings, lists, blockquotes, tables
  - Sanitize HTML output (prevent XSS)
  - Copy-to-clipboard button on code blocks
- Apply to all assistant messages

**Acceptance criteria:**
- Markdown renders correctly (headings, lists, code blocks, inline code)
- Code blocks have syntax highlighting with language labels
- Copy button works on code blocks
- HTML is sanitized (no script injection)

#### Task 3.5: Session Sidebar

- Build `SessionSidebar.vue` with:
  - Session list (name, date, model)
  - New session button
  - Active session highlight
  - Delete session confirmation
  - Collapsible on mobile (hamburger menu)
  - Session rename support
- Fetch sessions from REST API
- Switch sessions via WebSocket command

**Acceptance criteria:**
- Sessions list loads from REST API
- New session creates a fresh conversation
- Switching sessions loads the correct conversation
- Delete session removes from list and server
- Sidebar collapses on mobile with toggle button

### Phase 4: Settings and Polish

**Goal:** Add model selection, thinking level control, and UI polish.

#### Task 4.1: Settings Panel

- Build `SettingsPanel.vue` (accessible via gear icon):
  - Model selector (dropdown with available models)
  - Thinking level selector (off, minimal, low, medium, high, xhigh)
    - Filter to only levels returned by `runtime.session.getAvailableThinkingLevels()` for the current model
    - Not all models support all thinking levels
  - API key input (for providers without OAuth)
  - Shared secret configuration
  - Connection status indicator
  - Session stats display (tokens, cost, context usage percentage)
- Persist settings in localStorage

**Acceptance criteria:**
- Model selector shows available models from `/api/models`
- Thinking level changes take effect on next prompt
- Settings persist across page reloads
- Connection status shows real-time WebSocket state
- Session stats are displayed and update in real-time

#### Task 4.2: Error Handling and UX Polish

- Add error toast notifications for:
  - WebSocket connection failures
  - Agent errors (from `agent_end` with error state)
  - API errors (401, 500)
  - Extension errors (from `extension_error` events)
  - Model fallback warnings (from `modelFallbackMessage`)
- Add loading states for all async operations
- Add empty state for new sessions ("Ask me anything...")
- Add keyboard shortcuts (Ctrl+Enter to send, Escape to abort)
- Add connection status bar (green/yellow/red indicator)

**Acceptance criteria:**
- Errors are displayed as non-blocking toasts
- Loading states prevent user confusion
- Empty state guides new users
- Keyboard shortcuts work as documented
- Connection status is always visible

#### Task 4.3: Production Build Configuration

- Configure Vite for production build (output to `src/frontend/dist/`)
- Configure Express to serve static files from `dist/`
- Set up environment variables (PORT, SHARED_SECRET, API keys, CWD)
- Create `start` script that runs backend with embedded frontend
- Add `.env.example` with all required variables

**Acceptance criteria:**
- `npm run build` produces production-ready assets
- `npm start` serves the complete application
- Environment variables are documented in `.env.example`
- Static files are served with proper cache headers

---

## 4. Validation

### Phase 1 Validation

| Criteria | Type | Method |
|---|---|---|
| Backend starts and serves health check | L1 | `curl http://localhost:3001/api/health` returns `{"status":"ok"}` |
| WebSocket connects with valid auth | L2 | Manual test: connect via wscat, send auth first message |
| WebSocket rejects invalid auth | L2 | wscat with wrong secret as first message returns close 4011 |
| Frontend dev server starts | L1 | `npm run dev:frontend` serves Vue app on :5173 |

### Phase 2 Validation

| Criteria | Type | Method |
|---|---|---|
| AgentSessionRuntime creates on connect | L2 | Log output shows runtime creation |
| message_update events stream to client | L2 | Send prompt, verify streaming text appears in WS messages |
| Tool execution events relay | L2 | Ask agent to read a file, verify tool_execution_start/tool_execution_end events |
| Abort stops agent | L2 | Send prompt, then abort, verify agent stops |
| Session persists to JSONL | L1 | Check `~/.pi/agent/sessions/` for new .jsonl file |
| Session replacement works | L2 | Send new_session, verify session_changed event emitted |
| Compaction events relayed | L2 | Trigger compaction, verify compaction_start/compaction_end events |
| Extension commands execute | L2 | Send `/session` or other extension command, verify execution |

### Phase 3 Validation

| Criteria | Type | Method |
|---|---|---|
| Messages render with correct alignment | L3 | Visual inspection: user right, assistant left |
| Streaming appears in real-time | L3 | Send prompt, watch text appear character-by-character |
| Markdown renders correctly | L1 | Send prompt that generates markdown, verify rendering |
| Code blocks have syntax highlighting | L1 | Ask agent to generate code, verify highlighting |
| Session sidebar loads and switches | L3 | Create 2 sessions, switch between them |
| Auto-reconnect works | L2 | Kill backend, restart, verify frontend reconnects |
| Streaming indicator reflects state | L3 | Verify indicator changes during thinking, working, compacting |
| Thinking output is collapsible | L3 | Set thinking level, verify thinking output renders and collapses |

### Phase 4 Validation

| Criteria | Type | Method |
|---|---|---|
| Model selector works | L3 | Change model, send prompt, verify different model responds |
| Thinking level changes | L3 | Set thinking level, verify thinking output appears |
| Error toasts display | L2 | Trigger error (bad auth, agent error), verify toast |
| Session stats display | L3 | Verify token usage, cost, context percentage shown |
| Production build works | L3 | `npm run build && npm start`, open browser, verify full app |
| Keyboard shortcuts work | L3 | Test Ctrl+Enter, Escape, Enter, Shift+Enter |

---

## 5. File Structure

```
betty/
+-- package.json                    # Root workspace (optional)
+-- .env.example                    # Environment variables template
+-- README.md                       # Project documentation
|
+-- src/backend/
|   +-- package.json
|   +-- tsconfig.json
|   +-- src/
|       +-- server.ts               # Express + WebSocket server entry
|       +-- auth.ts                 # Authentication middleware
|       +-- websocket/
|       |   +-- handler.ts          # WebSocket connection handler
|       |   +-- protocol.ts         # WS message types and validation
|       |   +-- heartbeat.ts        # Ping/pong keepalive
|       |   +-- extension-ui.ts     # Extension UI protocol handler
|       +-- agent/
|       |   +-- runtime.ts          # AgentSessionRuntime lifecycle management
|       |   +-- event-relay.ts      # Pi events -> WS messages
|       |   +-- command-handler.ts  # WS commands -> AgentSessionRuntime methods
|       +-- routes/
|           +-- sessions.ts         # REST: GET/POST/DELETE /api/sessions
|           +-- session-stats.ts    # REST: GET /api/sessions/:id/stats
|           +-- models.ts           # REST: GET /api/models
|           +-- commands.ts         # REST: GET /api/commands
|           +-- health.ts           # REST: GET /api/health
|
+-- src/frontend/
|   +-- package.json
|   +-- tsconfig.json
|   +-- vite.config.ts
|   +-- index.html
|   +-- src/
|       +-- main.ts                 # Vue app entry
|       +-- App.vue                 # Root component
|       +-- router/
|       |   +-- index.ts            # Vue Router config
|       +-- stores/
|       |   +-- chat.ts             # useChatStore (messages, streaming)
|       |   +-- sessions.ts         # useSessionStore (session list, stats)
|       +-- services/
|       |   +-- websocket.ts        # WebSocketService + useWebSocket()
|       +-- components/
|       |   +-- ChatView.vue        # Main chat interface
|       |   +-- SessionSidebar.vue  # Session list sidebar
|       |   +-- SettingsPanel.vue   # Model/thinking/settings/stats
|       |   +-- MessageBubble.vue   # Individual message display
|       |   +-- MarkdownRenderer.vue# Markdown + syntax highlighting
|       |   +-- ToolExecution.vue   # Tool execution display
|       |   +-- ThinkingBlock.vue   # Collapsible thinking output
|       |   +-- InputArea.vue       # Chat input with keyboard shortcuts
|       |   +-- ConnectionBar.vue   # Connection status indicator
|       |   +-- StreamingIndicator.vue # Multi-state streaming indicator
|       |   +-- ExtensionDialog.vue # Extension UI dialog handler
|       +-- styles/
|           +-- main.css            # Tailwind imports + custom styles
|
+-- docs/
    +-- DESIGN.md                   # This document
```

---

## 6. WebSocket Protocol

### Client to Server Messages

```typescript
// Authenticate (first message only, required)
{ type: 'auth', payload: { secret: string } }

// Send a prompt
// - streamingBehavior: 'steer' queues during streaming (delivered after current turn's tool calls)
// - streamingBehavior: 'followUp' queues after agent finishes
// - Omitted when agent is idle (sent immediately)
// - Handles extension commands (/mycommand) and prompt templates (/template) automatically
{
  type: 'prompt',
  payload: {
    text: string,
    streamingBehavior?: 'steer' | 'followUp'
  }
}

// Abort current operation
{ type: 'abort', payload: {} }

// Create a new session
{ type: 'new_session', payload: { parentSession?: string } }

// Switch to an existing session (sessionPath is the full .jsonl file path)
// cwdOverride allows switching to a session in a different working directory
{ type: 'switch_session', payload: { sessionPath: string, cwdOverride?: string } }

// Fork from a previous user message on the active branch
// Returns { cancelled: boolean, selectedText?: string } -- show toast if cancelled
// selectedText contains the text from the forked entry for pre-filling the input
// position: "before" (default) creates a new branch; "at" replaces the current branch
{ type: 'fork', payload: { entryId: string, position?: 'before' | 'at' } }

// Clone the current active branch (fork with position: "at")
// Returns { cancelled: boolean } -- show toast if cancelled
{ type: 'clone', payload: {} }

// Manually compact the session
{ type: 'compact', payload: { customInstructions?: string } }

// Navigate to a different node in the session tree (in-place, same file)
// Unlike fork, this stays in the same session file
{ type: 'navigate_tree', payload: { targetId: string, summarize?: boolean, customInstructions?: string, replaceInstructions?: boolean, label?: string } }

// Change the active model
// Backend resolves { provider, modelId } to a Model<any> via modelRegistry.find() before calling setModel()
{ type: 'set_model', payload: { provider: string, modelId: string } }

// Change thinking level
{ type: 'set_thinking_level', payload: { level: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' } }

// Set session display name
{ type: 'set_session_name', payload: { name: string } }

// Get forkable user messages (for fork selector UI)
{ type: 'get_fork_messages', payload: {} }

// Get current messages (for reconnection after disconnect)
{ type: 'get_messages', payload: {} }

// Get text of last assistant message (for "copy last response" feature)
{ type: 'get_last_assistant_text', payload: {} }

// Respond to an extension UI dialog request
// Three shapes (matching RpcExtensionUIResponse from the SDK):
// - For select/input/editor: { type: 'extension_ui_response', id: string, value: string }
// - For confirm: { type: 'extension_ui_response', id: string, confirmed: boolean }
// - For any dialog (cancellation): { type: 'extension_ui_response', id: string, cancelled: true }
// Fire-and-forget methods (notify/setStatus/setWidget/setTitle/set_editor_text/setWorkingMessage/setWorkingVisible/setWorkingIndicator/setHiddenThinkingLabel/pasteToEditor/getEditorText) do NOT expect a response.
```

### Server to Client Events

### Command Response Shapes
// The backend sends these as responses to synchronous commands (not streaming events):
//
// `get_messages` response:
// { type: 'response', command: 'get_messages', success: true, data: { messages: AgentMessage[] } }
//
// `get_last_assistant_text` response:
// { type: 'response', command: 'get_last_assistant_text', success: true, data: { text: string | undefined } }
// SDK: getLastAssistantText(): string | undefined
//
// `new_session` response:
// { type: 'response', command: 'new_session', success: true, data: { cancelled: boolean } }
// Show toast if cancelled by extension
//
// `switch_session` response:
// { type: 'response', command: 'switch_session', success: true, data: { cancelled: boolean } }
// Show toast if cancelled by extension
//
// `fork` response:
// { type: 'response', command: 'fork', success: true, data: { cancelled: boolean, selectedText?: string } }
// `selectedText` contains the text from the forked entry for pre-filling the input area
// Show toast if cancelled by extension
//
// `clone` response:
// { type: 'response', command: 'clone', success: true, data: { cancelled: boolean } }
// clone() uses fork with position: "at" — does NOT return selectedText
// Show toast if cancelled by extension
//
// `get_fork_messages` response:
// { type: 'response', command: 'get_fork_messages', success: true, data: { messages: Array<{ entryId: string, text: string }> } }
//
// `compact` response:
// { type: 'response', command: 'compact', success: true, data: { summary: string, firstKeptEntryId: string, tokensBefore: number, details?: unknown } }
//
// `set_model` response:
// { type: 'response', command: 'set_model', success: true, data: { model: Model<any> } }
//
// `navigate_tree` response:
// { type: 'response', command: 'navigate_tree', success: true, data: { editorText?: string, cancelled: boolean, aborted?: boolean, summaryEntry?: BranchSummaryEntry } }
//
// `set_session_name` response:
// { type: 'response', command: 'set_session_name', success: true }
//
// `extension_ui_response` response:
// { type: 'response', command: 'extension_ui_response', success: true }
//
// Error response (for any failed command):
// { type: 'response', command: string, success: false, error: string }

// ---- Additional RPC Commands (optional) ----
// The following RPC commands are available but not yet in the WebSocket protocol.
// Add them if the frontend needs these features:
//
// { type: 'cycle_model', payload: { direction?: 'forward' | 'backward' } }
// { type: 'cycle_thinking_level', payload: {} }
// { type: 'set_steering_mode', payload: { mode: 'all' | 'one-at-a-time' } }
// { type: 'set_follow_up_mode', payload: { mode: 'all' | 'one-at-a-time' } }
// { type: 'set_auto_compaction', payload: { enabled: boolean } }
// { type: 'set_auto_retry', payload: { enabled: boolean } }
// { type: 'abort_retry', payload: {} }
// { type: 'bash', payload: { command: string, excludeFromContext?: boolean } }
// { type: 'abort_bash', payload: {} }
// { type: 'export_html', payload: { outputPath?: string } }

```typescript
// ---- Agent lifecycle ----

// Agent started processing
{ type: 'agent_start', data: {} }

// Agent finished (includes all generated messages)
// willRetry is true when the agent will automatically retry (e.g., after compaction)
{ type: 'agent_end', data: { messages: AgentMessage[], willRetry: boolean } }

// ---- Turn lifecycle (one LLM response + tool calls) ----

// New turn began
{ type: 'turn_start', data: { turnIndex: number, timestamp: number } }

// Turn completed
{ type: 'turn_end', data: { turnIndex: number, message: AgentMessage, toolResults: ToolResultMessage[] } }

// ---- Message streaming ----

// New message started
{ type: 'message_start', data: { message: AgentMessage } }

// Streaming update (text/thinking/toolcall deltas)
// Passes through the full AssistantMessageEvent object from the SDK.
// assistantMessageEvent.type is one of: start, text_start, text_delta, text_end,
//   thinking_start, thinking_delta, thinking_end, toolcall_start, toolcall_delta,
//   toolcall_end, done, error
// The assistantMessageEvent includes a `partial` field (accumulated partial message)
// which the frontend uses to render the current streaming state.
{
  type: 'message_update',
  data: {
    message: AgentMessage,
    assistantMessageEvent: {
      type: string,
      delta?: string,
      contentIndex?: number,
      partial?: object,
      toolCall?: object,
      reason?: string
    }
  }
}

// Message completed
{ type: 'message_end', data: { message: AgentMessage } }

// ---- Tool execution ----

// Tool execution started
{
  type: 'tool_execution_start',
  data: { toolCallId: string, toolName: string, args: object }
}

// Tool execution progress (streaming output)
{
  type: 'tool_execution_update',
  data: { toolCallId: string, toolName: string, partialResult: object }
}

// Tool execution completed
{
  type: 'tool_execution_end',
  data: { toolCallId: string, toolName: string, result: object, isError: boolean }
}

// ---- Queue state ----

// Pending steering/follow-up queue changed
{ type: 'queue_update', data: { steering: readonly string[], followUp: readonly string[] } }

// ---- Compaction ----

// Compaction started (reason: "manual" | "threshold" | "overflow")
{ type: 'compaction_start', data: { reason: string } }

// Compaction completed
// reason is "manual" | "threshold" | "overflow" (from compaction_start)
// willRetry is true when compaction was triggered by overflow and agent will auto-retry
// errorMessage is present when compaction fails
{
  type: 'compaction_end',
  data: {
    reason: 'manual' | 'threshold' | 'overflow',
    result: { summary: string, firstKeptEntryId: string, tokensBefore: number, details?: unknown } | undefined,
    aborted: boolean,
    willRetry: boolean,
    errorMessage?: string
  }
}
// Note: `result` is `undefined` (not `null`) when compaction is aborted or failed.
// `details` carries extension-specific compaction data (e.g., ArtifactIndex, version markers).

// ---- Auto-retry ----

// Automatic retry started (after transient error)
// delayMs is the delay before this retry attempt
{
  type: 'auto_retry_start',
  data: { attempt: number, maxAttempts: number, delayMs: number, errorMessage: string }
}

// Automatic retry ended
// finalError is present when all retries are exhausted
{ type: 'auto_retry_end', data: { success: boolean, attempt: number, finalError?: string } }

// ---- Extension errors ----

// Extension threw an error
{
  type: 'extension_error',
  data: { extensionPath: string, event: string, error: string, stack?: string }
}
// `stack` is optional and contains the extension error stack trace when available.

// ---- Extension UI ----

// Extension requests user interaction
// Dialog methods (select/confirm/input/editor): block until client sends extension_ui_response
// Fire-and-forget methods: no response expected
{
  type: 'extension_ui_request',
  data: {
    id: string,
    method: 'select' | 'confirm' | 'input' | 'editor' | 'notify' | 'setStatus' | 'setWidget' | 'setTitle' | 'set_editor_text' | 'setWorkingMessage' | 'setWorkingVisible' | 'setWorkingIndicator' | 'setHiddenThinkingLabel' | 'pasteToEditor' | 'getEditorText',
    // Dialog methods:
    title?: string,
    options?: string[],        // select
    message?: string,          // confirm
    placeholder?: string,      // input
    prefill?: string,          // editor
    timeout?: number,          // dialog methods with timeout auto-resolve on agent side
    // Fire-and-forget methods:
    notifyType?: 'info' | 'warning' | 'error',  // notify
    message?: string,               // notify
    statusKey?: string, statusText?: string,     // setStatus
    widgetKey?: string, widgetLines?: string[], widgetPlacement?: 'aboveEditor' | 'belowEditor',  // setWidget
    title?: string,                 // setTitle
    text?: string,                  // set_editor_text, setTitle
    workingMessage?: string,        // setWorkingMessage
    workingVisible?: boolean,       // setWorkingVisible
    workingIndicator?: { frames: string[], intervalMs?: number }  // setWorkingIndicator
  }
}

// ---- Session management ----
// Note: These are custom backend events, not SDK events.

// Session info (on connect and after session_changed)
{
  type: 'session_info',
  data: {
    sessionId: string,
    sessionFile: string,
    model: string,
    thinkingLevel: string,
    sessionName?: string
  }
}

// Session was replaced (new/switch/fork) -- frontend should reset conversation state
{ type: 'session_changed', data: {} }

// ---- Session metadata ----

// Session name changed (from setSessionName or extension)
{ type: 'session_info_changed', data: { name: string | undefined } }
// SDK: session_info_changed has name: string | undefined

// Thinking level changed (from setThinkingLevel or extension)
// level is one of: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
{ type: 'thinking_level_changed', data: { level: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' } }

// ---- Errors ----

// General error event
{ type: 'error', data: { message: string, code?: string } }
```

---

## 7. Dependencies

### Backend

| Package | Purpose |
|---|---|
| `@earendil-works/pi-coding-agent` | pi SDK (AgentSessionRuntime, SessionManager, AuthStorage, ModelRegistry, DefaultResourceLoader, SettingsManager) |
| `express` | HTTP server and REST API |
| `ws` | WebSocket server |
| `cors` | CORS middleware |
| `helmet` | Security headers |
| `dotenv` | Environment variable loading |
| `typescript` | TypeScript compiler |

### Frontend

| Package | Purpose |
|---|---|
| `vue` | Vue 3 framework |
| `vue-router` | Client-side routing |
| `pinia` | State management |
| `marked` | Markdown parsing |
| `highlight.js` | Code syntax highlighting |
| `dompurify` | HTML sanitization |
| `tailwindcss` | CSS framework (v4) |
| `@vitejs/plugin-vue` | Vite Vue plugin |
| `typescript` | TypeScript compiler |

---

## 8. Progress Tracker

### Phase 1: Project Scaffolding and Backend Foundation
- [ ] Task 1.1: Initialize project structure
- [ ] Task 1.2: Express server with CORS and static serving
- [ ] Task 1.3: WebSocket server setup (first-message auth)

### Phase 2: pi SDK Integration
- [ ] Task 2.1: AgentSessionRuntime creation and lifecycle
- [ ] Task 2.2: Event relay (server to client)
- [ ] Task 2.3: Command handling (client to server)
- [ ] Task 2.4: Model, settings, and commands management

### Phase 3: Frontend Chat Interface
- [ ] Task 3.1: Pinia stores
- [ ] Task 3.2: WebSocket client service
- [ ] Task 3.3: Chat view component
- [ ] Task 3.4: Markdown rendering
- [ ] Task 3.5: Session sidebar

### Phase 4: Settings and Polish
- [ ] Task 4.1: Settings panel
- [ ] Task 4.2: Error handling and UX polish
- [ ] Task 4.3: Production build configuration

---

## 9. Notes and Considerations

### Security

- **Shared secret authentication:** Simple but sufficient for self-hosted single-user. For multi-user, replace with proper auth (JWT, OAuth).
- **WebSocket auth:** Use first-message auth exclusively (`{ type: 'auth', payload: { secret } }`). Never pass secrets in query parameters (they appear in server logs and browser history).
- **CORS:** Restrict to known frontend origins in production.
- **Input validation:** All WebSocket commands are validated before reaching the agent.
- **Bash tool:** The pi SDK's bash tool runs commands on the host system. Users should be aware of this security implication.

### Performance

- **Streaming latency:** SDK embedding eliminates IPC overhead. WebSocket adds ~1-5ms per message.
- **Backpressure:** If the agent streams faster than the WebSocket can send, the `ws` library's `readyState` check prevents message loss.
- **Memory:** AgentSession holds conversation history in memory. For very long sessions, compaction manages context size.

### Scalability (Future)

- Single-instance design. For multi-user, would need:
  - Redis pub/sub for WebSocket message broadcasting
  - Session affinity in load balancer
  - Per-user AgentSession isolation
  - Database for session metadata

### Known pi SDK Behaviors

- **Extension UI protocol:** Extensions can request user interaction via 9 methods. Dialog methods (`select()`, `confirm()`, `input()`, `editor()`) block until the client responds. Fire-and-forget methods (`notify()`, `setStatus()`, `setWidget()`, `setTitle()`, `set_editor_text()`, `setWorkingMessage()`, `setWorkingVisible()`, `setWorkingIndicator()`) emit one-way events. The web app must relay `extension_ui_request` events to the client and accept `extension_ui_response` commands back for dialog methods. Dialog methods with `timeout` auto-resolve on the agent side. The backend must call `runtime.session.bindExtensions()` with an `ExtensionUIContext` implementation after runtime creation AND after every session replacement.
- **Image support:** pi SDK supports image prompts via `PromptOptions.images`, but the web UI would need file upload handling.
- **Session tree navigation:** `navigateTree()` is available for in-place branching within a session. The `AgentSessionRuntime` provides `fork()` and `clone()` for creating new session files.
- **Model fallback:** When resuming a session whose model can't be restored, `AgentSessionRuntime.modelFallbackMessage` (getter) contains the fallback message. Display this as a warning toast.
- **Extension load errors:** `CreateAgentSessionResult.extensionsResult.errors` (from `createAgentSessionFromServices()`) contains an array of `{ path, error }` for extension load failures. Log and optionally display these.
- **Settings persistence:** `SettingsManager` setters enqueue async file writes. Call `await settingsManager.flush()` for durability boundaries. Use `settingsManager.drainErrors()` to surface settings I/O errors.
- **Runtime diagnostics:** `AgentSessionRuntime` exposes `diagnostics: readonly AgentSessionRuntimeDiagnostic[]` with setup warnings and errors. Read these after creation and relay to the frontend.
- **Session replacement cancellation:** `newSession()`, `switchSession()`, and `fork()` return `{ cancelled: boolean }` when extensions cancel the operation (via `session_before_switch` or `session_before_fork` handlers). Show a toast explaining the cancellation.
- **`setRebindSession()`:** `AgentSessionRuntime` provides `setRebindSession(callback)` to automate the re-subscribe + re-bind pattern after session replacement. Use this to simplify the session replacement flow — the callback should call `runtime.session.subscribe(eventHandler)` and `runtime.session.bindExtensions(bindings)`. This eliminates manual re-subscription code in all session replacement handlers.
- **`PromptOptions.source`:** Set `source: "rpc"` on all `prompt()` calls so extensions can filter input by source (e.g., skip processing for RPC-injected messages).
- **`willRetry` field:** Both `agent_end` and `compaction_end` include a `willRetry: boolean` field. When true, the agent will automatically retry (e.g., after compaction). Show "Retrying after compaction..." in the UI.
- **`clone` command:** `runtime.fork(entryId, { position: "at" })` creates a clone of the current active branch without restoring editor text. Different from `fork` which creates a new branch.
- **`navigateTree()`:** `runtime.session.navigateTree(targetId, options)` navigates in-place within the same session file (different from `fork` which creates a new file). Returns `{ editorText?, cancelled, aborted?, summaryEntry? }` for prefilling the input.
- **`withSession` callback:** `newSession()`, `switchSession()`, and `fork()` accept a `withSession` callback that receives a `ReplacedSessionContext` with `sendMessage`, `sendUserMessage`, and other methods for post-replacement actions. Use this if the backend needs to interact with the new session immediately after creation.
