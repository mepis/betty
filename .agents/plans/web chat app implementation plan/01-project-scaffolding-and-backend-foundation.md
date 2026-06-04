# Milestone 1: Project Scaffolding and Backend Foundation

**Design Doc Reference:** Phase 1 (Tasks 1.1 – 1.3)
**Status:** Not Started
**Estimated Effort:** 2–3 days

---

## Goal

Set up the complete project structure with a working Express server, TypeScript configuration, Vite + Vue 3 frontend scaffold, and basic WebSocket infrastructure with first-message authentication.

---

## Dependencies

- **None** — this is the first milestone. Everything that follows depends on its completion.

---

## Task 1.1: Initialize Project Structure

### Description

Create the monorepo-style project layout with separate `package.json`, `tsconfig.json`, and build configuration for both the backend and frontend packages.

### Todo

- [ ] **1.1.1** Create root-level files:
  - `package.json` (optional workspace root)
  - `.env.example` with all required variables documented
  - `.gitignore` (node_modules, dist, .env, .DS_Store, etc.)
  - `README.md` (project overview, setup instructions, architecture summary)

- [ ] **1.1.2** Create `src/backend/` directory structure:
  - `src/backend/package.json`
  - `src/backend/tsconfig.json`
  - `src/backend/src/` (source directory)

- [ ] **1.1.3** Create `src/frontend/` directory structure:
  - `src/frontend/package.json`
  - `src/frontend/tsconfig.json`
  - `src/frontend/vite.config.ts`
  - `src/frontend/index.html`
  - `src/frontend/src/` (source directory)

- [ ] **1.1.4** Initialize backend dependencies:
  ```bash
  cd src/backend && npm init -y
  npm install express ws cors helmet dotenv
  npm install -D typescript @types/node @types/express @types/ws @types/cors @types/helmet
  ```

- [ ] **1.1.5** Install pi SDK dependency:
  ```bash
  npm install @earendil-works/pi-coding-agent
  ```
  > **Note:** Verify the package is available in the local npm registry or configured in `.npmrc`. If not yet published, use a file reference or git reference.

- [ ] **1.1.6** Initialize frontend with Vite + Vue 3:
  ```bash
  cd src/frontend && npm create vite@latest . -- --template vue-ts
  npm install vue vue-router pinia marked highlight.js dompurify
  npm install -D tailwindcss @vitejs/plugin-vue typescript
  ```

- [ ] **1.1.7** Configure Tailwind CSS v4:
  - Create `src/frontend/src/styles/main.css`
  - Configure the native PostCSS plugin (Tailwind v4 style — no `tailwind.config.js`)
  - Import Tailwind directives in `main.css`
  - Add custom styles as needed

- [ ] **1.1.8** Create TypeScript configurations:
  - `src/backend/tsconfig.json`: Node.js target, ESM or CommonJS (match project needs), strict mode, `resolveJsonModule`
  - `src/frontend/tsconfig.json`: Vue 3 + Vite standard config
  - Both should have `outDir` pointing to their respective `dist/` directories

- [ ] **1.1.9** Create a root `package.json` with workspace scripts:
  ```json
  {
    "scripts": {
      "dev:backend": "cd src/backend && npm run dev",
      "dev:frontend": "cd src/frontend && npm run dev",
      "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
      // Note: Final build script uses separate scripts with && (see Milestone 4, Task 4.3.5)
      "build": "npm run build:frontend && npm run build:backend",
      "build:frontend": "cd src/frontend && npm run build",
      "build:backend": "cd src/backend && npm run build",
      "start": "cd src/backend && npm start"
    },
    "devDependencies": {
      "concurrently": "^9.0.0"
    }
  }
  ```
  > **Note:** The build script uses `&&` chain via separate scripts to ensure frontend build failure stops the build (Fix for Issue #13).

### Additional Info

- **Directory layout** (from design doc §5):
  ```
  betty/
  ├── src/backend/src/server.ts
  ├── src/backend/src/auth.ts
  ├── src/backend/src/websocket/
  ├── src/backend/src/agent/
  ├── src/backend/src/routes/
  ├── src/frontend/src/main.ts
  ├── src/frontend/src/App.vue
  ├── src/frontend/src/stores/
  ├── src/frontend/src/services/
  ├── src/frontend/src/components/
  ├── src/frontend/src/styles/
  ```

- **TypeScript strict mode** is recommended for both packages to catch type errors early, especially when working with the pi SDK's type definitions.

- **ESM vs CommonJS:** The pi SDK may require ESM. Check the SDK's `package.json` `"type"` field. If it's ESM, configure both packages accordingly.

### Acceptance Criteria

- `npm run dev:backend` starts the Express server (even if it does nothing yet)
- `npm run dev:frontend` starts the Vite dev server on `localhost:5173`
- `npm run dev` starts both servers concurrently
- TypeScript compiles without errors in both `src/backend` and `src/frontend`
- All directory structure matches the design doc's file tree (§5)

---

## Task 1.2: Express Server with CORS and Static Serving

### Description

Create the Express.js server with health check endpoint, CORS configuration, basic authentication middleware, and production static file serving.

### Todo

- [ ] **1.2.1** Create `src/backend/src/server.ts`:
  - Import Express, create the app
  - Configure middleware: `cors()`, `helmet()`, `express.json()`, `express.urlencoded()`
  - Set the port from `PORT` env var (default `3001`)
  - Import and register all route modules

- [ ] **1.2.2** Create `src/backend/src/routes/health.ts`:
  ```typescript
  import { Router } from 'express';
  const router = Router();
  router.get('/', (_req, res) => res.json({ status: 'ok' }));
  export default router;
  ```

- [ ] **1.2.3** Create `src/backend/src/auth.ts`:
  - Export an `authMiddleware` function
  - Read `SHARED_SECRET` from environment variable
  - Accept secret via:
    - `X-Shared-Secret` header (primary)
    - `Authorization: Bearer <secret>` header (alternative)
  - Reject requests with `401 Unauthorized` if no valid secret is provided
  - **Do NOT** accept the secret via query parameters (security risk per design doc §9)

- [ ] **1.2.4** Configure CORS for development:
  - Allow origin `http://localhost:5173` (Vite default)
  - Allow credentials
  - In production, restrict to the actual frontend origin

- [ ] **1.2.5** Add health check route registration in `server.ts`:
  ```typescript
  import healthRouter from './routes/health';
  app.use('/api/health', healthRouter);
  ```

- [ ] **1.2.6** Create `src/backend/package.json` scripts:
  ```json
  {
    "scripts": {
      "dev": "tsx watch src/server.ts",
      "build": "tsc",
      "start": "node dist/server.js"
    }
  }
  ```
  > **Note:** `tsx` is a TypeScript execution engine (faster than `ts-node`). Install as dev dependency: `npm install -D tsx`.

- [ ] **1.2.7** Create `src/backend/src/server.ts` startup logging:
  ```typescript
  console.log(`Backend server listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  ```

### Additional Info

- **CORS configuration** for development:
  ```typescript
  app.use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_ORIGIN || 'http://localhost:3001'
      : 'http://localhost:5173',
    credentials: true,
  }));
  ```

- **Helmet** provides security headers (X-Content-Type-Options, X-Frame-Options, etc.). Keep it in production; consider disabling in development for easier debugging.

- **Authentication middleware** should be applied selectively — not globally. WebSocket connections use first-message auth instead of header-based auth. Only REST API routes need the header-based auth.

### Acceptance Criteria

- Server starts on configurable port (default 3001)
- `GET /api/health` returns `{ "status": "ok" }`
- CORS allows requests from `http://localhost:5173` in development
- Auth middleware rejects requests without valid `SHARED_SECRET`
- `npm run dev:backend` starts the server and logs are visible

---

## Task 1.3: WebSocket Server Setup

### Description

Integrate the `ws` library with Express, implement first-message authentication, connection lifecycle management, and heartbeat/ping-pong keepalive.

### Todo

- [ ] **1.3.1** Create `src/backend/src/websocket/handler.ts`:
  - Create `WebSocketHandler` class
  - Constructor receives: Express `Server` instance, `SHARED_SECRET`
  - Use `ws` UpgradeListener to handle WebSocket upgrades:
    ```typescript
    const wss = new WebSocket.Server({ noServer: true });
    server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });
    ```

- [ ] **1.3.2** Implement first-message authentication:
  - On WebSocket `open`, start a 5-second timeout
  - If the first message is `{ type: 'auth', payload: { secret: '...' } }`:
    - Validate against `SHARED_SECRET`
    - On success: clear timeout, set `ws.authenticated = true`, emit `authenticated` event
    - On failure: close with code `4011`, reason `'Authentication failed'`
  - If no auth message arrives within timeout: close with code `4001`, reason `'Authentication timeout'`

- [ ] **1.3.3** Implement connection lifecycle:
  - `open`: Log connection, track in active connections Map, start heartbeat
  - `message`: Route to command handler (placeholder for now — will be implemented in Milestone 2)
  - `close`: Log disconnection, remove from active connections Map, stop heartbeat, call `runtime.dispose()` if a runtime exists
  - `error`: Log error, do NOT close the connection (let the handler decide)

- [ ] **1.3.4** Create `src/backend/src/websocket/heartbeat.ts`:
  - Implement ping-pong keepalive
  - Ping interval: 30 seconds
  - Pong timeout: 5 seconds (if no pong received, close connection)
  - Use `ws.isAlive` flag toggled on `pong` event
  - Set `setInterval` to ping all alive connections

- [ ] **1.3.5** Create `src/backend/src/websocket/protocol.ts`:
  - Define TypeScript interfaces for all WS message types (even if not fully implemented yet)
  - Create a message validator function:
    ```typescript
    function isValidWSMessage(data: unknown): data is WSMessage { ... }
    ```
  - Return validation errors as structured JSON

- [ ] **1.3.6** Wire WebSocket handler into `server.ts`:
  ```typescript
  import { WebSocketHandler } from './websocket/handler';
  const wsHandler = new WebSocketHandler(httpServer, process.env.SHARED_SECRET!);
  ```

- [ ] **1.3.7** Add WebSocket connection logging:
  - Log connection IP, timestamp, user agent (if available)
  - Log disconnection reason and duration
  - Track total active connections count

### Fix for Issue #16: `settingsManager.drainErrors()` interval cleanup

In Task 2.1.9 (Milestone 2), the `settingsErrorInterval` created by `setInterval()` must be stored on the `ws` object and cleaned up in the WebSocket close handler (Task 2.1.6).

Update Task 2.1.6 to include cleanup:
```typescript
ws.on('close', async () => {
  if (runtime) {
    await runtime.dispose(); // async — handles abort + session teardown
    runtime = null;
  }
  clearInterval(heartbeatInterval);
  clearInterval(ws.settingsErrorInterval); // ← Add this line
});
```

Update Task 2.1.9 to store interval on ws:
```typescript
ws.settingsErrorInterval = setInterval(() => {
  const errors = settingsManager.drainErrors();
  for (const err of errors) {
    ws.send(JSON.stringify({
      type: 'settings_error',
      data: { message: err.message, code: err.code },
    }));
  }
}, 5000); // every 5 seconds
```

### Additional Info

- **WebSocket close codes** (custom, from design doc §6):
  - `4011` — Authentication failed
  - `4001` — Authentication timeout
  - Standard codes: `1000` (normal closure), `1001` (going away), `1011` (internal error)

- **`ws` library configuration:**
  ```typescript
  const wss = new WebSocket.Server({
    noServer: true,
    maxPayload: 10 * 1024 * 1024, // 10MB max message size
  });
  ```

- **Heartbeat implementation pattern:**
  ```typescript
  ws.on('pong', () => { ws.isAlive = true; });
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  ```

- **Backpressure handling:** Check `ws.readyState === WebSocket.OPEN` before every `ws.send()` call. If not open, the message is dropped (the connection is closing).

### Acceptance Criteria

- WebSocket connects successfully
- First message with valid `SHARED_SECRET` is accepted (`ws.authenticated = true`)
- First message with invalid or missing auth is rejected with close code `4011`
- Heartbeat detects dead connections after 30s timeout (ping + 5s pong timeout)
- Connection/close events are logged to console
- `npm run dev:backend` starts the server with WebSocket support
- Manual test: `wscat -c ws://localhost:3001/ws -s "auth" -m '{"type":"auth","payload":{"secret":"test"}}'` connects successfully

---

## Integration Notes

### How This Milestone Sets Up Future Work

1. **Task 1.1** creates the project structure that all subsequent milestones depend on. The directory layout matches the design doc's §5 file structure.

2. **Task 1.2** provides the Express server foundation. Milestone 2 will add REST API routes (`/api/sessions`, `/api/models`, `/api/commands`, `/api/sessions/:id/stats`) to this server.

3. **Task 1.3** establishes the WebSocket infrastructure. Milestone 2 will populate the message handler with actual command routing (prompt, abort, session management) and event relay.

### Testing Strategy

- **Manual testing** is the primary validation method for this milestone (design doc §4, Level L1/L2):
  - `curl http://localhost:3001/api/health` → `{"status":"ok"}`
  - `wscat` for WebSocket auth testing
  - `npm run dev:frontend` → open browser to `http://localhost:5173`

- **No automated tests yet** — unit tests will be added in Milestone 2 when the SDK integration is in place.

### Common Pitfalls

- **ESM vs CommonJS:** If the pi SDK is ESM-only, both packages must use ESM. Set `"type": "module"` in `package.json` and use `.mts`/`.cts` extensions as needed.
- **TypeScript watch mode:** Use `tsx watch` for the backend (fast HMR for TypeScript). For the frontend, Vite handles this automatically.
- **CORS during development:** The Vite dev server runs on `:5173` while the backend runs on `:3001`. CORS must be explicitly configured — this is a common source of "blocked by CORS policy" errors.
- **WebSocket upgrade path:** The `ws` library with `noServer: true` requires Express to handle the HTTP upgrade event. Don't use `new WebSocket.Server({ server: expressApp })` — it doesn't work with Express's middleware chain.
