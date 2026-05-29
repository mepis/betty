# Pi Web UI — Design Document

> A browser-based interface for the [pi coding agent](https://github.com/earendil-works/pi-coding-agent).
> Provides user authentication, session persistence, and a modern Vue 3 SPA backed by Node.js + SQLite.

---

## 1. Goals

| Goal | Rationale |
|------|-----------|
| **Browser access to pi** | Operate the coding agent from any machine, not just the host terminal |
| **Multi-user support** | Multiple users, each with their own API keys, sessions, and settings |
| **Saved sessions** | Persist, browse, resume, and branch pi sessions via a web UI |
| **Live interaction** | Real-time streaming of assistant responses and tool execution |
| **Lightweight** | SQLite for state, no external cache or message broker required |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌───────────────────────────────────────────┐  │
│  │              Vue 3 SPA                     │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────────┐ │  │
│  │  │ Sessions│ │ Chat    │ │ Settings    │ │  │
│  │  │ View    │ │ View    │ │ View        │ │  │
│  │  └─────────┘ └─────────┘ └─────────────┘ │  │
│  │         │         │           │           │  │
│  │  ┌──────┴─────────┴───────────┴────────┐  │  │
│  │  │        Axios / Fetch Client          │  │  │
│  │  │    REST (JSON) + SSE (stream)        │  │  │
│  │  └──────────────────┬───────────────────┘  │  │
│  └─────────────────────┼──────────────────────┘  │
└────────────────────────┼─────────────────────────┘
                         │ HTTP / SSE
┌────────────────────────┼─────────────────────────┐
│                   Node.js Backend                 │
│  ┌─────────────────────┴──────────────────────┐  │
│  │              Express.js                     │  │
│  │                                             │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐ │  │
│  │  │ Auth     │  │ Sessions │  │ Agent    │ │  │
│  │  │ Routes   │  │ Routes   │  │ Routes   │ │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘ │  │
│  │       │              │              │       │  │
│  │  ┌────┴──────────────┴──────────────┴─────┐ │  │
│  │  │           Service Layer                 │ │  │
│  │  │  AuthService │ SessionSvc │ AgentSvc   │ │  │
│  │  └──────────────┬─────────────────────────┘ │  │
│  │                 │                           │  │
│  │  ┌──────────────┴─────────────────────────┐ │  │
│  │  │  Database (better-sqlite3, worker thr.) │ │  │
│  │  │  users │ sessions │ entries │ settings  │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  │                                             │  │
│  │  ┌────────────────────────────────────────┐ │  │
│  │  │  RunnerRegistry                        │ │  │
│  │  │  max 1/user, max 10 total, 30m timeout │ │  │
│  │  └──────────────┬─────────────────────────┘ │  │
│  │                 │                           │  │
│  │  ┌──────────────┴─────────────────────────┐ │  │
│  │  │   Pi Coding Agent (SDK)                │ │  │
│  │  │   new Agent() + new SessionManager()   │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Choice | Version | Why |
|-------|--------|---------|-----|
| **Frontend** | Vue 3 | 3.x (Composition API) | Reactive, lightweight, great ecosystem |
| **Build tool** | Vite | 5.x | Fast HMR, native ESM, `--host` flag support |
| **UI framework** | Tailwind CSS 4 | 4.x | Utility-first, no component overhead |
| **State management** | Pinia | 2.x | Official Vue 3 store, simple API |
| **Router** | Vue Router | 4.x | Declarative routing, nested views |
| **HTTP client** | Axios | 1.x | Interceptors, cancellation, SSE via `event-source-polyfill` |
| **Backend** | Node.js + Express | 20 LTS / 4.x | Mature, simple, great middleware ecosystem |
| **Database** | SQLite via `better-sqlite3` | latest | Zero-config, file-based; runs in a worker thread to avoid blocking the event loop |
| **Auth** | JWT (httpOnly cookies) | jsonwebtoken | Stateless tokens, cookie transport |
| **Password hashing** | bcrypt | 5.x | battle-tested |
| **Streaming** | Server-Sent Events (SSE) | native | Single-direction real-time, auto-reconnect on client |
| **Pi integration** | `@earendil-works/pi-coding-agent` | latest | Official SDK — Agent, SessionManager classes |

---

## 4. Project Structure

```
pi-web/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
│
├── src/
│   ├── main.ts                        # Backend entry point
│   ├── config.ts                      # Config from env
│   ├── database/
│   │   ├── connection.ts              # SQLite connection (worker thread)
│   │   ├── worker.ts                  # Worker thread for DB queries
│   │   ├── schema.sql                 # DDL
│   │   └── migrations/                # Incremental migrations
│   │       ├── 001_initial.ts
│   │       ├── 002_sessions.ts
│   │       └── 003_settings.ts
│   ├── auth/
│   │   ├── middleware.ts              # JWT verify, rate limiting
│   │   ├── service.ts                 # register, login, refresh
│   │   └── routes.ts                  # POST /api/auth/register, /login, /logout
│   ├── sessions/
│   │   ├── service.ts                 # CRUD, list, fork, branch
│   │   └── routes.ts                  # REST endpoints
│   ├── agent/
│   │   ├── runner.ts                  # Single agent run lifecycle
│   │   ├── runner-registry.ts         # Pool: max 1/user, max 10 total, idle timeout
│   │   ├── service.ts                 # sendMessage, abort, status, recover
│   │   └── routes.ts                  # POST /api/agent/send, SSE /api/agent/stream
│   └── utils/
│       ├── session-bridge.ts          # Persist entries to SQLite (source of truth)
│       ├── crypto.ts                  # AES-256-GCM encrypt/decrypt for API keys
│       └── logger.ts
│
├── web/                               # Vue 3 SPA
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── main.ts                    # SPA entry
│   │   ├── App.vue
│   │   ├── router/
│   │   │   └── index.ts
│   │   ├── stores/
│   │   │   ├── auth.ts                # Auth state + actions
│   │   │   ├── session.ts             # Session list, active session
│   │   │   └── chat.ts                # Messages, streaming state
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppSidebar.vue
│   │   │   │   └── AppHeader.vue
│   │   │   ├── chat/
│   │   │   │   ├── ChatView.vue
│   │   │   │   ├── MessageBubble.vue
│   │   │   │   ├── MessageInput.vue
│   │   │   │   ├── ToolCallBlock.vue
│   │   │   │   └── BashBlock.vue
│   │   │   ├── sessions/
│   │   │   │   ├── SessionList.vue
│   │   │   │   ├── SessionItem.vue
│   │   │   │   └── SessionTree.vue
│   │   │   ├── settings/
│   │   │   │   ├── SettingsView.vue
│   │   │   │   ├── ApiKeyForm.vue
│   │   │   │   └── ModelSelector.vue
│   │   │   └── auth/
│   │   │       ├── LoginView.vue
│   │   │       └── RegisterView.vue
│   │   ├── views/
│   │   │   ├── HomeView.vue
│   │   │   └── NotFoundView.vue
│   │   ├── services/
│   │   │   ├── api.ts                 # Axios instance + interceptors
│   │   │   ├── sse.ts                 # SSE client wrapper
│   │   │   └── auth.ts                # login/register/logout calls
│   │   ├── types/
│   │   │   ├── agent.ts               # AgentMessage, Usage, etc.
│   │   │   ├── session.ts             # SessionEntry types
│   │   │   └── api.ts                 # Request/response types
│   │   ├── composables/
│   │   │   ├── useStream.ts           # SSE streaming + auto-reconnect
│   │   │   └── useMarkdown.ts         # Markdown rendering
│   │   └── styles/
│   │       └── main.css               # Tailwind imports + custom
│   └── public/
│       └── favicon.svg
│
├── tests/                              # Backend tests
│   ├── auth.test.ts
│   ├── sessions.test.ts
│   └── agent.test.ts
│
└── web/tests/                          # Frontend tests
    ├── auth.test.ts
    ├── chat.test.ts
    └── session-list.test.ts
```

---

## 5. Database Schema

### 5.1 Users

```sql
CREATE TABLE users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    username       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    email          TEXT    UNIQUE COLLATE NOCASE,
    password       TEXT    NOT NULL,          -- bcrypt hash (cost factor 12)
    api_key_enc    TEXT,                      -- AES-256-GCM encrypted API key (ciphertext)
    api_key_iv     TEXT,                      -- IV for AES-256-GCM
    provider       TEXT    DEFAULT 'anthropic',
    model          TEXT    DEFAULT 'claude-sonnet-4-5',
    thinking_level TEXT    DEFAULT 'auto' CHECK (
        thinking_level IN ('off', 'low', 'medium', 'high', 'auto')
    ),
    created_at     TEXT    DEFAULT (datetime('now')),
    updated_at     TEXT    DEFAULT (datetime('now'))
);
```

### 5.2 Sessions

```sql
CREATE TABLE sessions (
    id              TEXT    PRIMARY KEY,   -- 8-char hex (matches pi SessionManager)
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT,                   -- display name (from session_info entry)
    cwd             TEXT    NOT NULL,
    parent_session  TEXT,                   -- path or ID of parent session
    status          TEXT    DEFAULT 'idle' CHECK (
        status IN ('idle', 'running', 'error', 'disconnected')
    ),
    created_at      TEXT    DEFAULT (datetime('now')),
    updated_at      TEXT    DEFAULT (datetime('now')),
    leaf_entry_id   TEXT,                   -- current active leaf
    message_count   INTEGER DEFAULT 0,
    total_tokens    INTEGER DEFAULT 0,
    total_cost      REAL    DEFAULT 0.0
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_updated ON sessions(user_id, updated_at DESC);
CREATE INDEX idx_sessions_status ON sessions(status);
```

### 5.3 Session Entries

```sql
CREATE TABLE session_entries (
    id          TEXT    PRIMARY KEY,   -- 8-char hex entry ID (from SDK)
    session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    parent_id   TEXT    REFERENCES session_entries(id),
    type        TEXT    NOT NULL,      -- message, compaction, model_change, etc.
    data        TEXT    NOT NULL,      -- JSON blob of the entry payload
    data_size   INTEGER DEFAULT 0,     -- byte length of data blob
    timestamp   TEXT    NOT NULL,      -- ISO 8601
    created_at  TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX idx_entries_session ON session_entries(session_id);
CREATE INDEX idx_entries_parent  ON session_entries(parent_id);
```

### 5.4 Settings (optional, per-user overrides)

```sql
CREATE TABLE user_settings (
    user_id          INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme            TEXT    DEFAULT 'system',
    markdown_preview BOOLEAN DEFAULT 1,
    max_context_tokens INTEGER DEFAULT 200000
);
```

---

## 6. API Design

### 6.0 Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/api/health` | no | Server health: DB check, sessions dir, uptime |

**Response:** `{ status: "ok", uptime: 12345, version: "0.1.0", dbOk: true, sessionsDirOk: true }`

### 6.1 Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | no | Create account |
| `POST` | `/api/auth/login` | no | Authenticate, sets httpOnly cookie |
| `POST` | `/api/auth/logout` | yes | Clear session cookie |
| `GET`  | `/api/auth/me` | yes | Current user profile |
| `PATCH`| `/api/auth/me` | yes | Update profile / API key / model |

**Login response:** Sets `httpOnly; secure; SameSite=Strict` cookie with signed JWT.
**CSRF:** All state-changing endpoints accept an optional `X-CSRF-Token` header when `SameSite` is relaxed.

### 6.2 Sessions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/api/sessions` | yes | List user's sessions (paginated) |
| `POST` | `/api/sessions` | yes | Create new session |
| `GET`  | `/api/sessions/:id` | yes | Get session + entries |
| `GET`  | `/api/sessions/:id/tree` | yes | Get full entry tree |
| `PATCH`| `/api/sessions/:id` | yes | Update name, cwd |
| `DELETE`| `/api/sessions/:id` | yes | Delete session |
| `POST` | `/api/sessions/:id/fork` | yes | Fork from entry |
| `POST` | `/api/sessions/:id/branch` | yes | Move leaf to entry |
| `POST` | `/api/sessions/:id/compact` | yes | Trigger compaction |
| `GET`  | `/api/sessions/:id/export` | yes | Export session as HTML |

**List pagination:** `GET /api/sessions?limit=20&cursor=<timestamp>`

```typescript
interface SessionListResponse {
  sessions: Session[];
  hasMore: boolean;
  nextCursor?: string;
}
``` |

### 6.3 Agent

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/agent/send` | yes | Send user message, starts agent run |
| `GET`  | `/api/agent/stream` | yes | SSE endpoint for streaming events |
| `POST` | `/api/agent/abort` | yes | Abort current agent run |
| `GET`  | `/api/agent/status` | yes | Current run status |
| `GET`  | `/api/agent/models` | yes | List available models |
| `POST` | `/api/agent/recover/:id` | yes | Recover a crashed/disconnected session |

**Max concurrency:** 1 active run per user, 10 total across all users.
**Idle timeout:** Runner destroyed after 30 minutes of inactivity (configurable).

### 6.4 SSE Event Types

```typescript
type AgentEvent =
  | { type: "start"; sessionId: string; entryId: string }
  | { type: "text-delta"; entryId: string; text: string }
  | { type: "text-complete"; entryId: string; content: ContentBlock[] }
  | { type: "thinking-delta"; entryId: string; text: string }
  | { type: "tool-call"; entryId: string; toolCall: ToolCall }
  | { type: "tool-result"; entryId: string; result: ToolResultMessage }
  | { type: "bash-execution"; entryId: string; command: string; output: string }
  | { type: "usage"; entryId: string; usage: Usage }
  | { type: "error"; message: string; entryId?: string }
  | { type: "complete"; sessionId: string; entryId: string; stopReason: string }
  | { type: "model-change"; provider: string; modelId: string }
  | { type: "compaction"; summary: string; tokensBefore: number }
  | { type: "heartbeat"; ts: number };  // every 15s to keep proxy alive
```

### 6.5 Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/api/admin/backup` | admin | Download SQLite backup (safe hot-copy) |
| `GET`  | `/api/admin/runners` | admin | List active agent runners |

---

## 7. Pi SDK Integration

### 7.1 Agent Lifecycle

The backend uses the pi coding agent SDK to manage conversations:

```typescript
// Pseudocode — agent/runner.ts
import { createAgent, createSessionManager } from "@earendil-works/pi-coding-agent";

class AgentRunner {
  private sessionManager: SessionManager;
  private agent: Agent;
  private abortController: AbortController;

  async startSession(userId: number, cwd: string): Promise<void> {
    const user = await db.getUser(userId);
    this.sessionManager = createSessionManager({
      cwd,
      sessionDir: path.join(DATA_DIR, "sessions", userId.toString()),
    });

    this.agent = createAgent({
      sessionManager: this.sessionManager,
      model: createModel({
        provider: user.provider,
        modelId: user.model,
        apiKey: decrypt(user.apiKey),
      }),
      thinkingLevel: user.thinkingLevel,
    });
  }

  async sendMessage(content: string): Promise<void> {
    this.abortController = new AbortController();
    const { stream } = this.agent.generate(content, {
      signal: this.abortController.signal,
      onEvent: (event) => {
        // Forward to SSE clients + persist to DB
        sse.broadcast(event);
        persistEntry(event);
      },
    });
  }

  async abort(): Promise<void> {
    this.abortController?.abort();
  }
}
```

### 7.2 Session Persistence Bridge

Pi's `SessionManager` writes JSONL files. We sync those to SQLite:

1. **On agent start:** Load existing JSONL entries into `session_entries` table
2. **During streaming:** Each `message`, `tool_call`, `tool_result` event → INSERT into `session_entries`
3. **On agent complete:** Commit the JSONL file, update session metadata (message_count, total_tokens, total_cost)
4. **On session load:** Read from `session_entries` (fast) rather than parsing JSONL on every request

The JSONL files remain the source of truth; SQLite is a materialized view optimized for queries.

### 7.3 Multi-user Isolation

Each user gets:
- A dedicated `sessionDir` under `~/.pi/agent/sessions/<userId>/`
- Their own `SessionManager` instance per active session
- Their own API key and model configuration

Concurrent sessions are supported: each agent run is independent.

---

## 8. Frontend Architecture

### 8.1 Routing

```
/                     → HomeView (redirect to /chat or login)
/login                → LoginView
/register             → RegisterView
/chat                 → ChatView (new session)
/chat/:id             → ChatView (existing session)
/sessions             → SessionListView
/settings             → SettingsView
```

### 8.2 Pinia Stores

#### `useAuthStore`
- `user: User | null`
- `isLoading: boolean`
- `login(credentials)`, `register(credentials)`, `logout()`
- `checkAuth()` — called on app mount, hits `/api/auth/me`

#### `useSessionStore`
- `sessions: Session[]`
- `activeSession: Session | null`
- `tree: EntryTree | null`
- `fetchSessions()`, `createSession()`, `loadSession(id)`, `deleteSession(id)`
- `forkSession(entryId)`, `branchTo(entryId)`

#### `useChatStore`
- `messages: MessageView[]`  (denormalized for rendering)
- `isStreaming: boolean`
- `currentInput: string`
- `sendMessage(content)`, `abort()`
- `connectStream()` — opens SSE, updates messages reactively
- `disconnectStream()`

### 8.3 Key Components

#### `ChatView`
- Renders message list + input area
- Connects to SSE stream on mount
- Handles streaming text deltas (append to last assistant message)
- Renders tool calls, bash output, images inline

#### `MessageBubble`
- Renders a single message based on role
- `role === "user"` → right-aligned bubble
- `role === "assistant"` → left-aligned, renders content blocks
- `role === "toolResult"` → collapsible detail panel
- `role === "bashExecution"` → terminal-styled block with copy button

#### `SessionTree`
- Renders the entry tree (from `/api/sessions/:id/tree`)
- Collapsible branches
- Click to branch (POST `/branch`)
- Labels displayed on entries

#### `MessageInput`
- Textarea with auto-resize
- Supports markdown preview toggle
- "Send" button (disabled during streaming)
- "Stop" button (visible during streaming)

### 8.4 Streaming UX

1. User types message → clicks Send
2. `POST /api/agent/send` fires → returns `{ sessionId, entryId }`
3. Frontend opens `GET /api/agent/stream` (SSE)
4. Events stream in:
   - `text-delta` → append text to assistant message bubble (debounced render)
   - `tool-call` → render tool call block
   - `tool-result` → render tool result
   - `bash-execution` → render terminal block
   - `complete` → mark message as done, re-enable input
5. On `error` → show error banner, re-enable input

---

## 9. User Authentication Flow

```
                         ┌─────────────┐
                         │  Register    │
                         │  / Login     │
                         └──────┬──────┘
                                │ POST /api/auth/login
                                ▼
                         ┌─────────────┐
                         │  Backend     │
                         │  - validate  │
                         │  - hash check│
                         │  - sign JWT  │
                         └──────┬──────┘
                                │ Set-Cookie: token=...; httpOnly
                                ▼
                         ┌─────────────┐
                         │  Browser     │
                         │  (cookie     │
                         │   persisted) │
                         └──────┬──────┘
                                │ Every request → cookie sent
                                ▼
                         ┌─────────────┐
                         │  Middleware  │
                         │  - verify    │
                         │  - attach    │
                         │    req.user  │
                         └──────┬──────┘
                                ▼
                         ┌─────────────┐
                         │  Protected   │
                         │  Routes     │
                         └─────────────┘
```

### Token Payload

```json
{
  "sub": "user_id",
  "username": "string",
  "iat": 1700000000,
  "exp": 1700086400
}
```

- **Access token:** 24h expiry
- **Refresh:** Silent re-auth via `/api/auth/me` check; re-login if expired

---

## 10. Session Management

### 10.1 Creating a Session

1. User clicks "New Session"
2. Frontend `POST /api/sessions` with `{ cwd }`
3. Backend:
   - Generates UUID
   - Inserts into `sessions` table
   - Calls `SessionManager.create(cwd, sessionDir)`
   - Returns session object
4. Frontend navigates to `/chat/:id`

### 10.2 Resuming a Session

1. User clicks a session in sidebar
2. Frontend `GET /api/sessions/:id`
3. Backend:
   - Loads session from DB
   - Loads entries from `session_entries`
   - Rehydrates `SessionManager` from JSONL
4. Frontend renders message list

### 10.3 Branching

1. User opens tree view, selects an entry
2. Frontend `POST /api/sessions/:id/branch` with `{ entryId }`
3. Backend:
   - Calls `sessionManager.branch(entryId)`
   - Optionally generates branch summary via LLM
   - Persists new leaf position
4. Frontend reloads message list from new leaf

### 10.4 Compaction

1. User clicks "Compact" or auto-trigger at token threshold
2. Frontend `POST /api/sessions/:id/compact`
3. Backend:
   - Calls `sessionManager.compact()` (or LLM-generated summary)
   - Inserts `CompactionEntry`
4. Session context is shortened; cost/tokens updated

---

## 11. Configuration

### `.env.example`

```env
# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=change-me-to-a-random-string
JWT_EXPIRY=24h

# Database
DB_PATH=./data/pi-web.db

# Pi Agent
PI_SESSIONS_DIR=~/.pi/agent/sessions
PI_DATA_DIR=./data

# Optional: CORS (for production reverse proxy)
CORS_ORIGIN=https://pi-web.example.com
```

### Vite Config (`web/vite.config.ts`)

```typescript
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    host: "0.0.0.0",       // <-- --host flag equivalent
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../dist/client",
  },
});
```

### Express Config (`src/main.ts`)

```typescript
import express from "express";
import { initDatabase } from "./database/connection";
import authRoutes from "./auth/routes";
import sessionRoutes from "./sessions/routes";
import agentRoutes from "./agent/routes";

const app = express();
const PORT = process.env.PORT || 3000;

await initDatabase();

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/sessions", authMiddleware, sessionRoutes);
app.use("/api/agent", authMiddleware, agentRoutes);

// Serve SPA in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static("../dist/client"));
  app.get("*", (_, res) => res.sendFile("../dist/client/index.html"));
}

app.listen(PORT, () => console.log(`Server running on :${PORT}`));
```

---

## 12. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| **API key storage** | Encrypted at rest (AES-256-GCM, key from env), never logged |
| **JWT transport** | `httpOnly`, `secure`, `SameSite=Strict` cookies |
| **Password hashing** | bcrypt with cost factor 12 |
| **Rate limiting** | Express-rate-limit on auth endpoints (5/min for login) |
| **CORS** | Restricted to configured origin in production |
| **SQL injection** | Parameterized queries only (better-sqlite3) |
| **XSS** | Vue auto-escapes; markdown rendered via sanitized DOMPurify |
| **Session isolation** | Each user's sessions in separate directory; middleware enforces ownership |
| **CSRF** | `SameSite=Strict` cookie + optional CSRF token for state-changing routes |

---

## 13. Deployment

### Development

```bash
# Terminal 1: Backend
npm run server        # nodemon src/main.ts

# Terminal 2: Frontend (host-accessible)
npm run dev           # vite --host
```

### Production (single-process)

```bash
npm run build         # Vite build → dist/client/
npm start             # Node serves API + static files
```

### Docker (optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

---

## 14. Development Dependencies

```json
{
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/bcrypt": "^5.0.0",
    "@types/compression": "^1.7.0",
    "@types/express": "^4.17.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/node": "^20.0.0",
    "@vitejs/plugin-vue": "^5.0.0",
    "autoprefixer": "^10.4.0",
    "nodemon": "^3.0.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^4.0.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  },
  "dependencies": {
    "@earendil-works/pi-coding-agent": "latest",
    "better-sqlite3": "^11.0.0",
    "bcrypt": "^5.1.0",
    "compression": "^1.7.0",
    "express": "^4.21.0",
    "express-rate-limit": "^7.0.0",
    "jsonwebtoken": "^9.0.0",
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.0",
    "axios": "^1.7.0",
    "dompurify": "^3.0.0",
    "marked": "^12.0.0"
  }
}
```

---

## 15. Wireframes (Text)

### Login Page

```
┌──────────────────────────────────────┐
│                                      │
│         Pi Web UI                    │
│                                      │
│   ┌──────────────────────────────┐   │
│   │  Username                    │   │
│   │  ┌────────────────────────┐  │   │
│   │  │                        │  │   │
│   │  └────────────────────────┘  │   │
│   │  Password                    │   │
│   │  ┌────────────────────────┐  │   │
│   │  │                        │  │   │
│   │  └────────────────────────┘  │   │
│   │                               │   │
│   │       [   Login   ]           │   │
│   │                               │   │
│   │  Don't have an account?       │   │
│   │  Register                     │   │
│   └──────────────────────────────┘   │
│                                      │
└──────────────────────────────────────┘
```

### Chat View

```
┌──────────┬───────────────────────────────────┐
│ Sessions │  Session: "Refactor auth"         │
│          │                                   │
│ + New    │  ┌─────────────────────────────┐  │
│          │  │ You:                         │  │
│ ● Active │  │ Help me refactor the auth   │  │
│          │  │ module to use JWT           │  │
│ ○ Prev 1 │  └─────────────────────────────┘  │
│ ○ Prev 2 │                                   │
│ ○ Prev 3 │  ┌─────────────────────────────┐  │
│          │  │ Assistant:                   │  │
│          │  │ Let me start by reading the │  │
│          │  │ current auth code...        │  │
│          │  │                             │  │
│          │  │ ┌─────────────────────────┐ │  │
│          │  │ │ 🔧 bash: ls src/auth/   │ │  │
│          │  │ │ auth.ts                 │ │  │
│          │  │ │ middleware.ts           │ │  │
│          │  │ │ ─────────────────────── │ │  │
│          │  │ └─────────────────────────┘ │  │
│          │  └─────────────────────────────┘  │
│          │                                   │
│          │  ┌─────────────────────────────┐  │
│          │  │ > Type a message...     [▶] │  │
│          │  └─────────────────────────────┘  │
│          │                                   │
└──────────┴───────────────────────────────────┘
```

### Session Tree

```
┌──────────────────────────────────────┐
│  Tree View: "Refactor auth"          │
│                                      │
│  ├─ Help me refactor... (user)       │
│  │  └─ Let me start by reading...    │
│  │     ├─ Read auth.ts... (tool)     │
│  │     ├─ Here's my plan... (assistant)│
│  │     ├─ Looks good, go ahead (user)│
│  │     │  └─ Implementing... (assistant)│
│  │     │     └─ ... (current leaf)  │
│  │     └─ Actually use sessions (user)│
│  │        └─ Switching to sessions... │
│                                      │
│  [Close Tree]                        │
└──────────────────────────────────────┘
```

---

## 16. Implementation Phases

| Phase | Scope | Estimated Effort |
|-------|-------|-----------------|
| **P0** | Backend skeleton, SQLite schema, auth routes, JWT | 1 day |
| **P1** | Vue 3 SPA scaffolding, login/register UI, auth store | 1 day |
| **P2** | Session CRUD API + sidebar, session list UI | 1 day |
| **P3** | Pi SDK integration — agent runner, SSE streaming | 2 days |
| **P4** | Chat view — message rendering, streaming UX, input | 2 days |
| **P5** | Session tree view, branching, forking | 1 day |
| **P6** | Settings page — API key, model selector, theme | 0.5 day |
| **P7** | Compaction, export, polish | 1 day |
| **P8** | Tests, Docker, deployment config | 1 day |

**Total estimated effort: ~10.5 days**

---

## 17. Open Questions

1. **Encryption at rest for API keys** — use OS keyring (better-sqlite3 PRAGMA key) or env-based AES key?
2. **Concurrent sessions per user** — limit to 1 active agent run per user, or allow multiple?
3. **File system access** — should the web UI expose file browsing/editing, or only via agent tool calls?
4. **Image support** — allow image uploads in messages (stored as base64 in entries)?
5. **WebSockets vs SSE** — SSE is simpler for one-directional streaming; upgrade to WS only if bidirectional agent control is needed.

---

*Document version: 1.0 — 2026-05-27*
