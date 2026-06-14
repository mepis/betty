# Changelog

## [Unreleased]

### Changed

- [Changed]: [2026-06-14] Benchmark `configs.json` — reset to minimal default config with a single `test` entry; removed all GPU, server, build, model, and benchmark parameters
- [Changed]: [2026-06-14] Benchmark `.pi/AGENTS.md` — added Rule 13 prohibiting direct modification of `configs.json` to prevent accidental config corruption

### Added

- [Added]: [2026-06-14] Benchmark `configs.json` — expanded from minimal test config to comprehensive production config with GPU selection, split params, spec params, build params, CUDA configs, model configs, server params, benchmark messages, and test params sections
- [Added]: [2026-06-14] Benchmark `api-server.js` — `deepMerge()` helper and `syncConfigDefaults()` function that auto-populates missing keys from `DEFAULT_CONFIGS` into `configs.json` on startup, preventing config drift
- [Added]: [2026-06-14] Benchmark `AGENTS.md` — project rules documentation enforcing that `DEFAULT_CONFIGS` in `api-server.js` and `configs.json` must be kept in sync; every change to one must be reflected in the other

### Added

- [Added]: [2026-06-14] Benchmark `NET_INTERFACE` env var — new `NET_INTERFACE` option in `.env`/`.env.example` (default `eth0`) for configuring which network interface to use for auto-detecting the machine's IP address in the benchmark deployment script

### Changed

- [Changed]: [2026-06-14] Benchmark `update-api-url.sh` — rewrote script to auto-detect the machine's IP address from the configured network interface instead of using a hardcoded IP; also updates `API_HOST` in root `.env` to the detected IP; reads `NET_INTERFACE` from `.env` with `eth0` fallback
- [Changed]: [2026-06-14] Benchmark `update-api-url.sh` — commented out the section that updates `API_HOST` in root `.env`, since that behavior is no longer needed; the script now only updates `VITE_API_URL` in `frontend/.env.production`
- [Changed]: [2026-06-14] Benchmark frontend `.env.production` — updated `VITE_API_URL` from `http://100.105.3.99:3456` to `http://192.168.2.3`

### Added

- [Added]: [2026-06-14] Comprehensive project documentation — new `docs/architecture.md` (system design, data flow diagrams, component relationships, security architecture), `docs/index.md` (documentation index with quick links), and `docs/backend/` (7 module docs: server, auth-middleware, auth-utils, session-store, user-store, routes-auth, routes-admin)
- [Added]: [2026-06-14] Reproduce commands in benchmark reports — new `getBuildCommand()` and `getLaunchCommand()` helpers in `api-server.js` reconstruct full cmake/make build and llama-server launch commands from report configs including per-test-run overrides; new `GET /api/report/:name/commands/:testRunId` endpoint; `Reports.vue` config modal now shows a "Reproduce Commands" section with Build and Launch command blocks and copy-to-clipboard buttons
- [Added]: [2026-06-14] Benchmark `scripts/update-api-url.sh` — bash script that updates `VITE_API_URL` in `frontend/.env.production` to the target server address before building; called by the `start` npm script to ensure correct API URL at build time

### Changed

- [Changed]: [2026-06-14] Compaction token reserve — reduced `reserveTokens` from 24576 to 8192 in `.pi/settings.json` to allow more tokens in the compaction window
- [Changed]: [2026-06-14] Benchmark frontend `.env.production` — updated `VITE_API_URL` from `http://100.88.77.33:3456` to `http://100.105.3.99:3456`
- [Changed]: [2026-06-14] Benchmark frontend dist — rebuilt with new asset hashes
- [Changed]: [2026-06-14] Benchmark `start` script — updated to run `scripts/update-api-url.sh` before building frontend, ensuring `VITE_API_URL` is set to the target server address in `.env.production`

### Added

- [Added]: [2026-06-14] Real-time tool execution display — WebSocket event handlers for `tool_execution_start`, `tool_execution_update`, and `tool_execution_end` in `App.vue`; `pendingToolCalls` reactive map tracking tool call lifecycle; temporary tool messages cleaned up on stream end and abort; `ChatMessage.vue` renders `toolResult` role messages with collapsible blocks, state icons (⏳/✅/❌), and status classes (`tool-running`, `tool-completed`, `tool-error`); thinking blocks with collapsible display via `toggleThinking()` and `toggleTool()` global functions

### Changed

- [Changed]: [2026-06-14] `ChatMessage.vue` — tool call content blocks now default to collapsed state with `▼` toggle arrow; result text appended below arguments with `--- Result ---` separator; `hasContent` computed property accounts for `toolResult` role and `toolCall` content blocks

### Removed

- [Removed]: [2026-06-14] `src/benchmark/frontend/.env.productions` — removed environment file containing hardcoded API URL (`http://100.105.3.99:3456`)
- [Removed]: [2026-06-14] Benchmark `dev` npm script — replaced `dev` (which built frontend then ran server) with `dev:server` (runs server only) in `src/benchmark/package.json`

### Added

- [Added]: [2026-06-14] `.pi/skills/` — project-local skill definitions (commit-and-push, deep-research, orchestrator, planning, playwright-cli, project-docs, testing-debugging)
- [Added]: [2026-06-14] `sh_scripts/install_betty.sh` — automated installation script for Betty (system dependencies, Intel OneAPI, CUDA 13.3, Pi, systemd service)
- [Added]: [2026-06-14] `sh_scripts/install_llama.sh` — automated installation script for llama.cpp (clone, build with CUDA/NCCL/Flash Attention, systemd service)

### Fixed

- [Fixed]: [2026-06-14] Streaming thinking display — `ChatMessage.vue` now renders the top-level `thinking` property during streaming via the `contentHtml` computed property, producing a collapsible "Thinking" block (matching the existing `thinking` block type in multi-block content); `App.vue` added `watch` handlers on `streamingText` and `streamingThinking` to propagate paced display text back into the message object so `ChatMessage` re-renders reactively

### Changed

- [Changed]: [2026-06-14] `App.vue` — renamed import from `useStreaming` to `createMessageStreaming` to match the factory function export in `useStreaming.js`

### Added

- [Added]: [2026-06-14] User creation endpoint (`src/backend/routes/admin.js`) — new `POST /api/admin/users` route for admin user creation with email format validation, password length enforcement (min 6 chars), duplicate email detection (409 conflict), role assignment (defaults to "user", first user auto-promoted to "admin"), and password hashing via bcrypt; returns 201 with safe user object (password hash excluded)
- [Added]: [2026-06-14] Context usage display — real-time context window token tracking: `RpcAgent.getSessionStats()` in `server.js` sends `get_session_stats` RPC command; new WebSocket `session_stats` handler in `App.vue`; context token badge in `ChatView.vue` header showing "used / limit" with color-coded warnings (yellow at 75%, red at 90%); stats refresh after every agent turn, after compaction, and every 15 seconds
- [Added]: [2026-06-14] Create User modal (`src/frontend/src/pages/UsersPage.vue`) — admin-only "Create User" button opens a modal form with name, email, password, and role fields; client-side validation (email format, password length), loading spinner during creation, success/error messages, and auto-refresh of user list on success

### Fixed

- [Fixed]: [2026-06-14] UsersPage reactivity — changed `authStore.user?.id` and `authStore.user?.role` to `authStore.user.value?.id` and `authStore.user.value?.role` to correctly access the reactive Pinia store ref

### Changed

- [Changed]: [2026-06-14] `api-server.js` — refactored benchmark summary parsing from single-line matching to a multi-line block-based approach; introduced `summaryBuffer` and `inSummaryBlock` state to accumulate metrics across lines within a `=== Test Run #N Summary ===` block; added `flushSummary()` helper that assembles the accumulated fields into `liveResults` and triggers `saveReport()`; added summary flush on process close to handle truncated output

### Fixed

- [Fixed]: [2026-06-14] Benchmark Dashboard empty states — show contextual messages when benchmark is running ("No results yet. Benchmark is running..." / "No logs yet. Build in progress...") instead of generic "No results yet" / "No logs yet" text, improving UX during active runs

### Added

- [Added]: [2026-06-13] Admin routes (`src/backend/routes/admin.js`) — Express Router with `GET /api/admin/users` (list all users), `PATCH /api/admin/users/:id` (update user role), and `DELETE /api/admin/users/:id` (delete user); all routes require admin role via `authorize("admin")` middleware; includes self-deletion prevention and self-demote prevention
- [Added]: [2026-06-13] Users page (`src/frontend/src/pages/UsersPage.vue`) — Vue 3 admin-only page with user management table showing user name, email, role, created date, and last login; stats bar with total/admin/regular user counts; inline role change dropdown per user; delete button with confirmation; forbidden state for non-admin users; avatar initials display
- [Added]: [2026-06-13] Session persistence toggle — new `SESSIONS_ENABLED` environment variable (default `true`); when set to `false`, all session store operations become no-ops (no disk I/O); exported from `session-store.js` for server startup logging
- [Added]: [2026-06-13] `.env.example` — added `SESSIONS_ENABLED` documentation for session persistence toggle

### Changed

- [Changed]: [2026-06-13] `server.js` — added admin routes mounting at `/api/admin` under `authenticate` middleware; added `SESSIONS_ENABLED` import and startup logging; changed `DEFAULT_WORKSPACE` to resolve relative to `__dirname` instead of `$HOME`; moved `AUTH_ENABLED` declaration earlier in file
- [Changed]: [2026-06-13] `user-store.js` — `updateUser()` now allows `role` field updates (in addition to `email`, `name`, `lastLogin`) when the value is a valid role (`admin` or `user`); role changes are gated through the admin endpoint which has its own authorization checks
- [Changed]: [2026-06-13] `Sidebar.vue` — removed "Recent" session list section (session management moved to server-side); removed "Export as HTML" action button; removed `sessions` and `activeSessionId` props; removed `switch-session`, `delete-session`, and `export` emit events; removed `handleSessionContext` function and all session list CSS; added "Users" nav button with user icon; changed action grid from 4 to 3 columns
- [Changed]: [2026-06-13] `App.vue` — added Users page routing via `activeTab` switch; imported and conditionally renders `UsersPage` component; passes `show-users` event to Sidebar
- [Changed]: [2026-06-13] `api-server.js` — fixed stdout/stderr parsing to use proper line buffering via `processStdoutChunk()`/`processStderrChunk()` helpers instead of calling `parseLogOutput()` on raw data chunks; added buffer flush on process close to handle partial last lines; added `stdoutLineBuffer` and `stderrLineBuffer` variables
- [Changed]: [2026-06-13] Benchmark frontend dist — rebuilt with new asset hashes (`index-BHalDcZS.js`, `index-CmiYsUn0.css`); deleted old `index-DYx4eSao.css`
- [Changed]: [2026-06-14] Benchmark frontend `.env.production` — updated `VITE_API_URL` from `http://100.105.3.99:3456` to `http://100.88.77.33:3456` to point to the new API server address

### Removed

- [Removed]: [2026-06-13] Session list from sidebar — removed client-side session list UI (recent conversations, right-click delete) since session management is now handled server-side via WebSocket events
- [Removed]: [2026-06-13] Export as HTML button — removed the "Export as HTML" action button from the sidebar action grid

### Fixed

- [Fixed]: [2026-06-13] Benchmark log parsing race condition — stdout/stderr data chunks may contain partial lines; the old code passed raw chunks directly to `parseLogOutput()` which could miss or misparse metrics; now uses line-buffering helpers that accumulate data and only parse complete lines, with final flush on process close
- [Fixed]: [2026-06-13] Benchmark SSE connection — added `withCredentials: true` to EventSource so cookies/credentials are sent with SSE requests, enabling authenticated SSE streams behind auth middleware
- [Fixed]: [2026-06-13] Benchmark `processAlive` state — set `processAlive` to `true` in `results` and `test-run-complete` SSE event handlers so the frontend correctly tracks whether the benchmark process is still running

### Added

- [Added]: [2026-06-12] JWT-based user authentication — bcrypt password hashing (cost 12), httpOnly cookie sessions with automatic refresh, rate limiting on login (10/min) and registration (3/min), role-based access control (admin/user), first-user becomes admin automatically; configurable via `AUTH_ENABLED`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- [Added]: [2026-06-12] Auth middleware (`src/backend/auth-middleware.js`) — `authenticate` middleware supporting Bearer token and cookie auth with graceful fallback for HTML requests; `requireAuth` for hard 401 enforcement; `authorize(...roles)` factory for role-based access
- [Added]: [2026-06-12] Auth utilities (`src/backend/auth-utils.js`) — `hashPassword`, `verifyPassword`, `generateTokens`, `verifyAccessToken`, `verifyRefreshToken`, `refreshAccessToken` with configurable JWT secrets and expiration via environment variables
- [Added]: [2026-06-12] User store (`src/backend/user-store.js`) — file-based user persistence in `~/.betty/users/` with CRUD operations (create, load, save, delete, list, update), email lookup, and `hasUsers()` check
- [Added]: [2026-06-12] Auth routes (`src/backend/routes/auth.js`) — Express Router with `/register`, `/login`, `/logout`, `/refresh`, `/me`, `/status` endpoints; in-memory rate limiting; httpOnly cookie session management
- [Added]: [2026-06-12] Login page (`src/frontend/src/pages/LoginPage.vue`) — Vue 3 login form with email/password, loading states, error display, first-user notice, and register link
- [Added]: [2026-06-12] Register page (`src/frontend/src/pages/RegisterPage.vue`) — Vue 3 registration form with name, email, password + confirm, password strength indicator, validation, and success/error states
- [Added]: [2026-06-12] Auth store (`src/frontend/src/stores/auth.js`) — reactive auth state with `login`, `register`, `logout`, `init` actions; 401 auto-redirect; server-side auth status check on init
- [Added]: [2026-06-12] Streaming composable (`src/frontend/src/composables/useStreaming.js`) — paced text streaming with word-boundary snapping at ~24ms intervals; `createMessageStreaming` factory for dual text+thinking streams
- [Added]: [2026-06-12] Auto-scroll composable (`src/frontend/src/composables/useAutoScroll.js`) — gesture-aware auto-scroll with 90-frame grace period, user scroll intent detection, and floating "jump to bottom" button during streaming
- [Added]: [2026-06-12] Virtual list composable (`src/frontend/src/composables/useVirtualList.js`) — lightweight virtualization for variable-height message lists with estimated heights, real measurement on demand, and configurable buffer count
- [Added]: [2026-06-12] Message store utilities (`src/frontend/src/composables/useMessageStore.js`) — `binarySearchById`, `hasMessageById`, `findMessageIndexById` for efficient message lookup
- [Added]: [2026-06-12] User footer in Sidebar — user avatar (initial), display name, and logout button in sidebar footer
- [Added]: [2026-06-12] WebSocket authentication — `verifyClient` callback on WebSocket server checks access token from cookies or query string; rejects unauthenticated connections with 401
- [Added]: [2026-06-12] Protected API routes — all `/api/*` endpoints now wrapped with `protectApi` middleware when auth is enabled
- [Added]: [2026-06-12] Auth pages in server.js — `/login` and `/register` HTML pages served before static middleware; auto-redirect to login when unauthenticated
- [Added]: [2026-06-12] `bcrypt`, `cookie-parser`, `jsonwebtoken` backend dependencies for authentication
- [Added]: [2026-06-12] `marked` and `highlight.js` frontend dependencies for syntax-highlighted markdown rendering

### Changed

- [Changed]: [2026-06-12] `server.js` — added auth middleware, user store, auth routes, login/register HTML pages, WebSocket authentication, and `protectApi` wrapper for all API endpoints; `AUTH_ENABLED` env var to toggle authentication on/off
- [Changed]: [2026-06-12] `App.vue` — auth guard wrapping the entire app; shows LoginPage/RegisterPage when not authenticated; passes `userName` to Sidebar; handles logout via auth store
- [Changed]: [2026-06-12] `ChatView.vue` — integrated virtual list rendering for sessions with 50+ messages; auto-scroll composable replacing manual scroll; streaming message now part of messages array instead of separate prop; removed `streamingMsg` prop
- [Changed]: [2026-06-12] `ChatMessage.vue` — added typing indicator and shimmer animation for streaming; grouped context tools (read, glob, grep, list) into collapsible "Gathering context" groups; tool state icons (pending/running/completed/error); content visibility guard
- [Changed]: [2026-06-12] `Sidebar.vue` — added `userName` prop and `logout` event; user footer with avatar, name, and logout button
- [Changed]: [2026-06-12] `useWebSocket.js` — integrated auth store; redirects to login on 401 WebSocket close; passes cookies for server-side auth verification
- [Changed]: [2026-06-12] `utils.js` — replaced custom markdown renderer with `marked` + `highlight.js` for proper GFM support and syntax-highlighted code blocks
- [Changed]: [2026-06-12] `main.js` — added `highlight.js` atom-one-dark theme import
- [Changed]: [2026-06-12] `.env.example` — added authentication configuration section with `AUTH_ENABLED`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- [Changed]: [2026-06-12] `README.md` — added authentication feature highlights, environment variable documentation, authentication getting-started guide, security features description, and token rotation instructions

### Removed

- [Removed]: [2026-06-12] Custom markdown renderer in `utils.js` — replaced with `marked` library for full GFM support, proper code block handling, and syntax highlighting via `highlight.js`
- [Removed]: [2026-06-12] Separate streaming message display in `ChatView.vue` — streaming messages are now part of the main messages array with `isStreaming` flag instead of a separate `streamingMsg` prop and dedicated template block

### Security

- [Security]: [2026-06-12] JWT secrets are now mandatory — `JWT_SECRET` and `JWT_REFRESH_SECRET` must be set via environment variables; server exits with a helpful error message if either is missing (no more hardcoded fallback secrets)
- [Security]: [2026-06-12] Path traversal prevention — `/api/workspace` and `/api/directory` now reject paths containing `..` and enforce that resolved paths stay within the user's home directory
- [Security]: [2026-06-12] Privilege escalation prevention — `updateUser()` and `updateSession()` now use a whitelist of allowed fields instead of `Object.assign()`, preventing users from modifying `role`, `passwordHash`, `createdAt`, or `id`
- [Security]: [2026-06-12] Timing attack mitigation on login — when no user is found, the server still performs a bcrypt comparison against a dummy hash to prevent user enumeration via response timing
- [Security]: [2026-06-12] API key redaction in logs — `RpcAgent` startup log now replaces the actual API key value with `***REDACTED***` instead of printing it in plaintext
- [Security]: [2026-06-12] Input validation on auth endpoints — email format validation (RFC 5321 regex, 254-char limit), password byte-length limit (72 bytes for bcrypt), and non-empty string checks on password/hash/user fields
- [Security]: [2026-06-12] Report path validation — `/api/report/:name` endpoints now validate that the resolved file path stays within `REPORTS_DIR` to prevent directory traversal
- [Security]: [2026-06-12] Config validation — `PUT /api/configs` validates that the body is a JSON object and each entry has required `provider` and `model` string fields
- [Security]: [2026-06-12] Global error handler — Express error middleware catches body-parser errors and all unhandled errors, returning JSON responses instead of HTML stack traces

### Fixed

- [Fixed]: [2026-06-12] Cookie access in refresh endpoint — changed from `req.cookies.get("refresh_token")?.value` (cookie-parser v1 API) to `req.cookies.refresh_token` (correct API)
- [Fixed]: [2026-06-12] Refresh token now returns full user payload — `refreshAccessToken()` loads the user from store and includes `email` and `role` in the new access token instead of a minimal `{ userId, type: "refreshed" }` payload
- [Fixed]: [2026-06-12] `refreshAccessToken()` is now async — properly awaits user store import and user lookup
- [Fixed]: [2026-06-12] WebSocket authentication fallback — if access token verification fails, the server now attempts to verify the refresh token cookie as a fallback
- [Fixed]: [2026-06-12] Benchmark process kill race condition — `BenchmarkManager.stop()` now captures `this.proc` in a local variable before setting `this.proc = null`, preventing SIGKILL from being sent to a new process started during the 5s grace period
- [Fixed]: [2026-06-12] SSE write errors now remove the client — `sendSSE()` catches write errors, logs them, and removes the dead client from the SSE client set instead of silently failing
- [Fixed]: [2026-06-12] Graceful shutdown cleanup — `shutdown()` now clears pending message save timers, SSE heartbeats, and closes all SSE client connections before stopping the RPC agent
- [Fixed]: [2026-06-12] RPC agent startup timeout — moved `setTimeout` before `proc.on("error")` to prevent the timeout from firing after error rejection; timeout is now properly cleared on error
- [Fixed]: [2026-06-12] `RpcAgent.send()` validates input and checks stdin writability — rejects `null`/non-object commands and cleans up pending requests if stdin is not writable
- [Fixed]: [2026-06-12] `TOGETHEI_API_KEY` typo — corrected to `TOGETHER_API_KEY` in the provider-to-env-var map
- [Fixed]: [2026-06-12] `listDirectory()` returns `null` for unreadable directories instead of the string `'?'` which broke JSON serialization
- [Fixed]: [2026-06-12] `listSessions()` and `listUsers()` handle missing timestamps — uses `(b.updatedAt || 0) - (a.updatedAt || 0)` to avoid NaN sorting
- [Fixed]: [2026-06-12] Session name uses ISO timestamp — `createSession()` now uses `toISOString()` instead of `toLocaleString()` for consistent naming across locales
- [Fixed]: [2026-06-12] `authorize()` with no arguments allows all authenticated users — empty role list no longer blocks access
- [Fixed]: [2026-06-12] Duplicate logout route removed — the duplicate `POST /api/auth/logout` in `server.js` was removed since it already exists in the auth router
- [Fixed]: [2026-06-12] `hasUsers()` call simplified in register route — removed redundant dynamic import, using the already-imported function directly
- [Fixed]: [2026-06-12] `AUTH_ENABLED=false` skip in auth middleware — when auth is globally disabled, `authenticate()` skips token verification entirely
- [Fixed]: [2026-06-12] Auth error messages unified — API/WebSocket auth failures now return "Authentication failed" instead of exposing specific failure reasons ("Invalid or expired token", "User not found")
- [Fixed]: [2026-06-12] Rate limit memory leak — periodic pruning interval (60s) cleans up expired rate limit entries from the in-memory map
- [Fixed]: [2026-06-12] `dotenv/config` imported at top of `server.js` — ensures environment variables are loaded before any module reads `process.env`
- [Fixed]: [2026-06-12] Static middleware re-enabled — removed `// TEMPORARILY DISABLED` comments on `express.static()` calls for both built and dev frontends
- [Fixed]: [2026-06-12] `express.json()` uses `strict: false` — allows non-object JSON bodies (arrays, strings) without throwing
- [Fixed]: [2026-06-12] Login page `/api/auth/status` fetch handles errors — wraps response check in a safe `.then()` that returns `null` on non-OK responses

### Changed

- [Changed]: [2026-06-12] `auth-middleware.js` — added `AUTH_ENABLED=false` skip, unified error messages, `authorize()` with no args allows all authenticated users
- [Changed]: [2026-06-12] `auth-utils.js` — JWT secrets now required (no defaults), added input validation on all public functions, `refreshAccessToken()` is async and returns full user payload, exported `JWT_SECRET` and `JWT_REFRESH_SECRET` for WebSocket verification
- [Changed]: [2026-06-12] `routes/auth.js` — email format validation, password byte-length limit, timing attack mitigation on login, rate limit pruning interval, removed `/api/auth/status` endpoint (no longer needed)
- [Changed]: [2026-06-12] `server.js` — `authenticate` middleware runs globally on every request; path traversal prevention on workspace/directory endpoints; config validation on PUT /api/configs; report path validation; global error handler; `dotenv/config` import; static middleware re-enabled; API key redaction in logs; graceful shutdown cleanup
- [Changed]: [2026-06-12] `session-store.js` — input validation on `loadSession()`, error handling on `saveSession()` and `deleteSession()`, whitelist-based `updateSession()`, ISO timestamp in session names, NaN-safe sorting
- [Changed]: [2026-06-12] `user-store.js` — input validation on `loadUser()`, error handling on `saveUser()` and `deleteUser()`, whitelist-based `updateUser()`, NaN-safe sorting
- [Changed]: [2026-06-12] `LoginPage.vue` — first-user notice now includes a link to `/register`; register link always visible (not gated by `hasUsers`); styled link in first-user notice
- [Changed]: [2026-06-12] `ChatView.vue` — `selectCommand()` now clears `inputText` before emitting the command event
- [Changed]: [2026-06-12] Login/register HTML pages in `server.js` — added skip-link for keyboard accessibility
- [Changed]: [2026-06-12] `src/benchmark/configs.json` — reset to minimal default config with a single `test` entry

### Added

- [Added]: [2026-06-12] `playwright` dependency added to `package.json` for browser automation testing

- [Added]: [2026-06-11] FolderPicker component — new Vue 3 directory browser modal for workspace selection with breadcrumb navigation, directory listing with item counts, loading/error states, and path confirmation
- [Added]: [2026-06-11] Tooltip component — reusable Vue 3 tooltip with hover-triggered delayed appearance (200ms show, 100ms hide), positioned above or below the trigger element, with smooth enter/leave transitions
- [Added]: [2026-06-11] New design token system — semantic color tokens (success, warning, error, info with dim variants), transition timing variables (--transition-fast, --transition, --transition-slow), refined radius tokens (--radius-sm, --radius, --radius-lg), and shadow tokens (--shadow-sm, --shadow, --shadow-lg)
- [Added]: [2026-06-11] Inline SVG icons throughout — replaced all emoji icons with semantic SVG icons in Sidebar (logo, session, action buttons), ChatView (connection badge, typing indicator, sidebar toggle), ChatMessage (assistant avatar), MessageInput (attach, send, abort), CloneModal (header icon, close, status indicators), CommandPalette (header, command icons), and ToastContainer (success, error, info)

### Changed

- [Changed]: [2026-06-11] Complete UI redesign — switched color scheme from GitHub-dark blue tones (#58a6ff accent) to refined dark theme with purple accent (#a78bfa); redesigned backgrounds to near-black (#09090b, #0c0c0e, #111114) with subtle elevated states; updated all text colors for improved contrast
- [Changed]: [2026-06-11] Sidebar — complete layout redesign with new logo (SVG icon + text), "New chat" button, "Recent" session list with scrollable area, "Settings" section (model, thinking, workspace), "Actions" section with 2x2 grid layout for fork/compact/export/clone, and footer with connection status + current model; collapsed state now hides via pointer-events instead of display:none
- [Changed]: [2026-06-11] CloneModal — redesigned with SVG icons, animated overlay (fadeIn + slideUp), progress track redesign, ghost cancel button, status icons with spin animation, and cleaner field styling with optional label indicator
- [Changed]: [2026-06-11] MessageInput — simplified placeholder text, updated hint text (replaced <kbd> elements with <span>), refined button hover/active states with scale transforms, updated abort button to use error color theme, reduced padding and max-height
- [Changed]: [2026-06-11] ChatView — new connection badge in header with animated dot, typing indicator with three-dot animation, improved empty state layout, refined suggestion buttons
- [Changed]: [2026-06-11] ChatView — added structured message styling with header (avatar, role label, timestamp), content area, fade-in animation, blinking streaming cursor, and consistent max-width (720px) flex layout; replaced inline style attributes with CSS classes
- [Changed]: [2026-06-11] ChatMessage — replaced emoji avatar with SVG icon, refined avatar colors using new semantic tokens, updated message bubble styling
- [Changed]: [2026-06-11] CommandPalette — SVG icon in header, refined padding and sizing, updated to use --bg-elevated for background
- [Changed]: [2026-06-11] ToastContainer — icon-based toast notifications with semantic color icons (checkmark, X, info), improved layout with flex gap, added pointer-events handling
- [Changed]: [2026-06-11] App.vue — integrated FolderPicker component, removed unused `nextTick` import from Vue
- [Changed]: [2026-06-11] index.html — updated page title to "Betty - AI Coding Agent"
- [Changed]: [2026-06-11] CSS variable naming — consolidated border tokens (--border, --border-light, --border-subtle), cleaned up color aliases (removed --accent-green/cyan/orange/red in favor of semantic --success/warning/error), unified button variables using accent-derived values

### Removed

- [Removed]: [2026-06-11] Inline message styles from ChatView — removed scattered inline `style` attributes on message elements; all message layout now handled by CSS classes in the component's `<style>` block for consistency and maintainability
- [Removed]: [2026-06-11] Emoji icons — removed all emoji icons from UI components (💬, 📷, ➤, ■, 🧠, 🔧, ⚡, ✕, ✓, ↗, ◈, ↓, ↯, 📁, ✦, ❓, ⌨️, 🗑️, 📂, 🔍, 🛠️, 🧠) and replaced with SVG equivalents
- [Removed]: [2026-06-11] MessageInput `defineExpose` methods — removed `clearImages()` and `getImages()` methods that were exposed to parent component; image handling now managed internally
- [Removed]: [2026-06-11] Image size validation comment — removed 10MB image size check comment in MessageInput file processing

### Added

- [Added]: [2026-06-11] Persistent session management — new file-based session store (`src/backend/session-store.js`) with CRUD operations (create, load, update, delete, list); sessions persisted to `~/.betty/sessions/` as JSON files with message history, metadata, and auto-timestamps
- [Added]: [2026-06-11] Session management in main web interface — sidebar session list with active indicator, message count, right-click-to-delete; WebSocket events for session CRUD (new, switch, delete, rename, list); session-aware message persistence with debounced saves
- [Added]: [2026-06-11] Environment variable example — `.env.example` documenting all configurable Betty server options (port, host, workspace, API keys for all supported providers)
- [Added]: [2026-06-11] Standalone benchmark API server — restored `src/benchmark/api-server.js` (Express server with SSE streaming, REST API, config CRUD, results retrieval, report management, build endpoint, clone endpoint, and kill-port endpoint); supports CORS, SPA fallback, and remote access via `API_HOST`/`API_PORT` env vars
- [Added]: [2026-06-11] Standalone benchmark Vue 3 frontend — restored `src/benchmark/frontend/` as a Vue 3 SPA with Vite 6, Pinia state management, Vue Router 4, and Tailwind CSS 4; includes Dashboard (real-time SSE metrics, live results table, log viewer), Config (JSON + visual editing modes, build settings, profiles), and Reports (browse, view, delete saved reports) views
- [Added]: [2026-06-11] Benchmark npm package — new `src/benchmark/package.json` with Express, axios, cors, dotenv, and express-rate-limit dependencies; scripts for `dev`, `dev:frontend`, `build:frontend`, and `start`

### Changed

- [Changed]: [2026-06-11] Sidebar — replaced Benchmark tab with Sessions section; session list shows name, message count, active state; right-click to delete sessions
- [Changed]: [2026-06-11] Backend server.js — added session management WebSocket handlers (new_session, list_sessions, switch_session, delete_session, rename_session); message persistence with debounced saves on agent_end; current session tracking with in-memory message buffer
- [Changed]: [2026-06-11] Frontend App.vue — replaced benchmark integration with session management; improved streaming message handling with pending message buffer to prevent lost responses; better deduplication of streaming vs agent_end messages; extractThinking/extractText helpers for multi-format message content
- [Changed]: [2026-06-11] WebSocket composable — fixed reactivity bug by removing `reactive()` wrapper from `Map` and `Array` instances; handlers now use plain JS collections
- [Changed]: [2026-06-11] Build scripts — `npm start` now runs `npm run build` first to ensure frontend is built; benchmark package `dev` script also builds frontend first
- [Changed]: [2026-06-11] `.gitignore` — added `src/benchmark/frontend/dist/` to exclude future frontend build artifacts; current dist files are committed as initial seed

### Removed

- [Removed]: [2026-06-11] Benchmark integration from main web interface — removed Benchmark tab from sidebar, all benchmark Vue components (BenchmarkView, BenchmarkDashboard, BenchmarkConfigs, BenchmarkRun, BenchmarkResults, BenchmarkReports), and the `useBenchmark` composable; benchmark is now only available as a standalone tool under `src/benchmark/`
- [Removed]: [2026-06-11] Benchmark-related frontend code — deleted `src/frontend/public/js/benchmark.js` (1154 lines), `src/frontend/src/utils.js` `renderMarkdownResults()` utility, and all benchmark WebSocket event handlers (benchmark_stdout, benchmark_stderr, benchmark_status, benchmark_exit, benchmark_error)
- [Removed]: [2026-06-11] Reverted removal of standalone benchmark frontend — undoes the earlier decision to remove `src/benchmark/frontend/` and `src/benchmark/api-server.js`; the benchmark is now available as both a standalone tool and through the main Betty web interface

### Added

- [Added]: [2026-06-11] Vue 3 frontend rebuild — rebuilt the entire Betty web frontend from vanilla HTML/JS/CSS to Vue 3 + Vite; new component-based architecture with `App.vue` root, 13 Vue components (Sidebar, ChatView, ChatMessage, MessageInput, CommandPalette, BenchmarkView, BenchmarkDashboard, BenchmarkConfigs, BenchmarkRun, BenchmarkResults, BenchmarkReports, CloneModal, ToastContainer), 3 composables (useWebSocket, useBenchmark, useToast), and shared CSS variables; Vite build outputs to `src/frontend/dist/`
- [Added]: [2026-06-11] Vite build tooling — added `vite` (^8.0.16), `vue` (^3.5.38), and `@vitejs/plugin-vue` (^6.0.7) dependencies; new `npm run build` and `npm run dev:vite` scripts in `package.json`
- [Added]: [2026-06-11] Production/dev frontend serving — `server.js` now detects built frontend in `dist/` and serves production assets; falls back to `public/` for dev mode when no build exists

### Changed

- [Changed]: [2026-06-11] Backend server.js — refactored `node:fs` imports to use consistent `await import()` style at top level; renamed `mkdirSync`, `writeFileSync`, `readdirSync`, `unlinkSync`, `statSync` to prefixed `_mkdirSync`, `_writeFileSync`, etc. to avoid conflicts with top-level `existsSync`

### Removed

- [Removed]: [2026-06-11] Standalone benchmark Vue 3 frontend — deleted `src/benchmark/frontend/` (Vue 3 SPA with Pinia, Vue Router, Tailwind CSS) and `src/benchmark/api-server.js` (Express API server); the benchmark is now accessed exclusively through the main Betty web interface's Benchmark tab

- [Removed]: [2026-06-11] Standalone benchmark Vue 3 frontend — deleted `src/benchmark/frontend/` (Vue 3 SPA with Pinia, Vue Router, Tailwind CSS) and `src/benchmark/api-server.js` (Express API server); the benchmark is now accessed exclusively through the main Betty web interface's Benchmark tab
- [Removed]: [2026-06-11] `npm run benchmark` script — removed from root `package.json` as the benchmark is no longer a standalone runnable module
- [Removed]: [2026-06-11] Project-local `.pi/skills/` definitions — deleted local copies of skill files (commit-and-push, deep-research, orchestrator, planning, playwright-cli, project-docs, testing-debugging) and all playwright-cli references and scripts

### Changed

- [Changed]: [2026-06-11] Benchmark README — updated `src/benchmark/README.md` to reflect integration into the main Betty web frontend; removed sections on standalone API server, remote access, environment variables, and architecture diagram; updated project structure to show the new layout under `betty/src/`
- [Changed]: [2026-06-11] `.gitignore` — removed `src/benchmark/frontend/dist/` entry as the standalone frontend no longer exists

### Added

- [Added]: [2026-06-10] Kill port API endpoint — new `POST /api/kill-port` endpoint in `api-server.js` that finds and forcefully kills all processes listening on the llama_port using `lsof -ti` and `kill -9`
- [Added]: [2026-06-10] Kill port frontend action — new `killPort()` action in the Pinia benchmark store (`stores/benchmark.js`) that calls the kill-port API endpoint
- [Added]: [2026-06-10] Kill port button — new "Kill Port" button in `Dashboard.vue` (visible only when benchmark is not running) with loading state, success message display, and an X-out icon
- [Added]: [2026-06-10] Live logs maximize button — new maximize/restore toggle in the Live Logs panel header in `Dashboard.vue` that expands the log container to fill available viewport height with a smooth transition

### Changed

- [Changed]: [2026-06-10] Default report name format — changed from `benchmark-YYYY-MM-DD-HH-mm-ss` timestamp-based names to `YYYY-MM-DD-modelname` format (e.g., `2026-06-10-gemma-4-E2B_q4_0-it`) in `api-server.js`; model name is extracted from `configs.json` with extension stripped
- [Changed]: [2026-06-10] Benchmark API URL — updated `VITE_API_URL` in `env.production` from `100.105.3.99` to `100.88.77.33`

### Added

- [Added]: [2026-06-09] Per-test-run configuration tracking — new `extractConfigsPerRun()` helper in `api-server.js` that computes detailed configuration values (test params, model params, server params, split/GPU params, environment variables, CMake flags) for each test run based on progression logic; saved reports now include `configsPerRun` array alongside the base `configs`
- [Added]: [2026-06-09] Test run config API endpoint — new `GET /api/report/:name/configs/:testRunId` endpoint that returns the detailed configuration for a specific test run within a saved report
- [Added]: [2026-06-09] Test run config modal — new interactive modal in `Reports.vue` that displays comprehensive configuration details per test run including test parameters, model parameters, server parameters, split & GPU parameters, environment variables, and CMake build flags; rows in the results table are now clickable to open the modal
- [Added]: [2026-06-09] Modal transition styles — added CSS transitions for modal enter/leave animations in `main.css` with fade and scale effects

### Changed

- [Changed]: [2026-06-09] Documentation directory renamed — moved `docs/llama-cpp/` to `docs/llama.cpp_docs/` with all 18 documentation files (architecture, build options, server flags, llamafile, tags, index) to match upstream llama.cpp naming conventions

### Removed

- [Removed]: [2026-06-09] Old llama.cpp documentation directory — deleted `docs/llama-cpp/` (18 files) as part of the directory rename to `llama.cpp_docs/`

### Removed

- [Removed]: [2026-06-09] Unnecessary columns from live results table — removed `Ctx Len`, `Batch`, and `GPU Layers` columns from the Dashboard live results table; these fields were always showing `—` since they are not included in the parsed `liveResults` data from `api-server.js`

### Changed

- [Changed]: [2026-06-09] Memory column format — changed MEM (GB) display from single used value to used/total format (e.g., "5.9 / 32 GB") in live results table, saved reports table, and markdown results file; added `avgMemTotal` to result averages and SSE-parsed data; updated console log, markdown tables, and Vue components across `index.js`, `api-server.js`, `Dashboard.vue`, and `Reports.vue`
- [Changed]: [2026-06-09] Benchmark config — disabled GPU selection, enabled skip_build
- [Changed]: [2026-06-09] Benchmark logging — added Avg Mem Used (GB) line to test run summary console output in index.js for consistency with api-server.js log parser
- [Changed]: [2026-06-08] Benchmark frontend API URL — updated `VITE_API_URL` in `.env.development` from `100.105.3.99` to `100.88.77.33` to point to the new API server; added `env.production` template with the previous server address

### Added

- [Added]: [2026-06-08] Speculative decoding params — new `spec_params` section in `configs.json` with `spec_type` (default `draft-mtp`) and `spec_draft_n_max` (default `3`); toggle switches and inline inputs in Config.vue visual editor; `--spec-type` and `--spec-draft-n-max` flags added to llama-server run script in `index.js`
- [Added]: [2026-06-08] Visual GPU selection editor — new toggle switch and add/remove UI in Config.vue visual editor for enabling/disabling GPU selection and managing GPU index array
- [Added]: [2026-06-08] Visual split params editor — new toggle switches and inline value inputs in Config.vue visual editor for layer_split, tensor_split, and primary_gpu split parameters

### Changed

- [Changed]: [2026-06-08] Benchmark config — disabled split_params (layer_split, tensor_split, primary_gpu); reduced build_cores from 20 to 14; downgraded CUDA from 13.3 to 13.2
- [Changed]: [2026-06-08] Frontend assets — rebuilt Vue frontend with new asset hashes
- [Changed]: [2026-06-08] SSE reliability — added `Retry-After` header to SSE endpoint; improved reconnection logic in both Vue store and vanilla JS frontend with status polling fallback when SSE drops; added 5s status polling interval as backup during long benchmarks
- [Changed]: [2026-06-08] Benchmark results table — replaced token count columns with `contextLength` and `batchSize` columns in Dashboard and Reports views for more relevant benchmark metrics

### Added

- [Added]: [2026-06-08] GPU selection config — new `gpu_selection` section in `configs.json` with `enabled`/`gpus` array (e.g., `[0, 1, 2]`); auto-generates `primaryGpu` (first GPU) and `tensorSplitValue` (equal split across GPUs) at startup; added GPU column to benchmark results table
- [Added]: [2026-06-08] `CUDACXX` path config — new `cuda_configs.cudacxx` field in `configs.json` (`/usr/local/cuda-13.3/bin/nvcc`); used by `buildEnv()`, `tryStartServer()`, and `getServerParamsSnapshot()` for consistent CUDA compiler path across build and runtime

### Removed

- [Removed]: [2026-06-08] Standalone benchmark web UI — deleted `src/benchmark/public/` (index.html, css/style.css, js/app.js) as the benchmark is now only accessed through the main Betty frontend's benchmark view

### Added

- [Added]: [2026-06-08] Standalone benchmark Vue 3 web frontend — new single-page application built with Vue 3, Pinia, Vue Router, and Tailwind CSS 4; features real-time SSE streaming for live benchmark progress, JSON and visual configuration editors, report management, and a responsive dark-themed UI
- [Added]: [2026-06-08] Model directory listing API — new `GET /api/models?directory=<path>` endpoint that scans a directory for model files (`.gguf`, `.bin`, `.safetensors`) and returns a sorted list; used by the visual config editor to populate the model dropdown
- [Added]: [2026-06-08] Configurable CORS origins — `CORS_ORIGIN` environment variable supports comma-separated origins or `*` for all; CORS preflight now explicitly allows `PUT`, `DELETE`, and `OPTIONS` methods with `Content-Type` and `Authorization` headers
- [Added]: [2026-06-08] Remote access support — `API_HOST` environment variable (default `0.0.0.0`) allows the API server to bind to all network interfaces for remote machine access
- [Added]: [2026-06-08] SPA fallback route — API server now serves `index.html` for all non-API routes to support Vue Router history mode
- [Added]: [2026-06-08] `ConfigSection` component — reusable form section component supporting `text`, `number`, `boolean`, and `select` input types with proper `v-model` two-way binding
- [Added]: [2026-06-08] Environment variable example — `.env.example` documenting all configurable API server options

- [Added]: [2026-06-07] System memory safety threshold — `max_sys_mem` config option (93%) that aborts a test run before starting if system memory usage exceeds the threshold, preventing OOM crashes; aborted runs are recorded in results with the abort reason
- [Added]: [2026-06-07] Per-message memory tracking — `getMem()` is called after each chat message and stored in the result; average memory used (GB) is calculated and reported per test run
- [Added]: [2026-06-07] Memory column in benchmark results — per-message results table includes memory used/total/%; test run averages table includes average memory used (GB); aborted runs are marked with their abort reason in both tables
- [Added]: [2026-06-07] Results file wipe on startup — existing `results.md` is wiped at the start of each benchmark run to avoid stale data

### Changed

- [Changed]: [2026-06-08] GPU split parameters — `tensor_split` and `primary_gpu` values in `split_params` are now auto-generated from `gpu_selection.gpus` at startup instead of read directly from config; tensor split is calculated as equal fractions (e.g., 3 GPUs → `33,33,33`)
- [Changed]: [2026-06-08] Benchmark config — enabled `skip_build` (set to `false`) to rebuild llama.cpp on each run
- [Changed]: [2026-06-08] API server — replaced generic `cors()` with explicit CORS configuration supporting configurable `CORS_ORIGIN` env var; added `API_HOST` env var for remote access binding; switched static file serving from `public/` to `frontend/dist/`; added SPA fallback route for Vue Router history mode; improved startup logging with host/port/directory info
- [Changed]: [2026-06-08] Benchmark package scripts — added `dev:frontend` for Vue dev server with API proxy, `build:frontend` for production build, and updated `start` to build frontend before launching server; changed `API_PORT` to parse as integer
- [Changed]: [2026-06-07] Benchmark main loop — now captures the return value from `runTestRun()` and skips the `areAllVariablesAtMax()` check when a run was aborted (configs not advanced on abort)
- [Changed]: [2026-06-07] Benchmark memory timer removed — the periodic memory logging interval was removed as it is no longer needed (memory is now tracked per-message)

### Fixed

- [Fixed]: [2026-06-07] Benchmark main loop — removed dangling `clearInterval(memTimerId)` call after removing the memory timer interval

### Changed

- [Changed]: [2026-06-07] Benchmark test parameters — moved `context_length`, `gpu_layer_offload`, `batch_size`, `u_batch_size`, and `cache_ram` (plus their step/max values) from hardcoded constants in `index.js` to a new `test_params` section in `configs.json` for centralized configuration
- [Changed]: [2026-06-07] Benchmark iteration bounds — `updateConfigs()` now caps all test variables at their configured maximums via `Math.min()` instead of unbounded increments; added `areAllVariablesAtMax()` to detect when all variables have reached their limits
- [Changed]: [2026-06-07] Benchmark result reporting — `writeResultsToMarkdown()` now runs after each test iteration for incremental reporting, not just at the end of the benchmark

### Fixed

- [Fixed]: [2026-06-07] Benchmark variable typo — renamed `cacheRamSMax` to `cacheRamMax` for consistency with other max variable names

### Added

- [Added]: [2026-06-07] Skip build option — added `skip_build` config flag and `--no-build` CLI argument to skip llama.cpp compilation; `startLlamaServer()` now uses `spawn()` with `shell: true` instead of manual command parsing; added `buildParams` cache variable to reduce repeated `configs.build_make_params` access; changed `llama_host` to 100.105.3.99

- [Added]: [2026-06-07] Image attachment support — drag & drop or click 📷 to attach up to 10 images (max 10MB each), with automatic compression (1920px max, JPEG 80% quality), inline thumbnails in chat, and base64 data URL transmission to the agent
- [Added]: [2026-06-07] Betty web frontend — a browser-based chat interface for the pi coding agent with real-time streaming, thinking block display, tool call visibility, code block rendering with copy buttons, dark theme, responsive design, auto-reconnect, session management, and model/thinking level controls
- [Added]: [2026-06-07] Right-aligned user message bubbles in chat — user messages now appear on the right with reversed header layout and adjusted bubble corner radii for a familiar chat UI
- [Added]: [2026-06-07] Command palette in chat input — type `/` to open a searchable command list with keyboard navigation, 6 built-in shortcuts (help, shortcuts, clear, compact, export, new), and live filtering against backend-provided commands

### Removed

- [Removed]: [2026-06-07] Deleted local `.pi/agents/` and `.pi/skills/` files (reviewer.md, scout.md, worker.md, and all skill definitions and references)

### Added

- [Added]: [2026-06-07] Workspace selector — sidebar 📁 button opens a directory browser modal to select which project directory the agent works in, with `WORKSPACE` environment variable for default, agent restart on change, and file icons for common project files

### Refactored

- [Changed]: [2026-06-07] Restructured project from flat layout to `src/` directory — moved `server.js` to `src/backend/server.js`, `public/index.html` to `src/frontend/public/index.html`, and `templates/project_template.md` to `src/frontend/templates/project_template.md`; updated backend path references and package.json scripts accordingly

### Added

- [Added]: [2026-06-07] llama.cpp benchmark tool (`src/benchmark/`) — automated benchmark runner that starts llama-server, sends 4 context-filling messages per test run via the `/completion` endpoint, measures total time in ms, prompt tokens/sec, and generation tokens/sec per message, logs server parameters and environment variables, writes results to `results.md` as markdown tables, and loops through config iterations (doubling context, incrementing batch/ubatch/cache sizes)
- [Added]: [2026-06-07] Benchmark config file (`src/benchmark/configs.json`) — configurable model path, CUDA build flags, model inference params (temp, top-p, top-k), multi-GPU tensor split, and llama-server runtime options
- [Added]: [2026-06-07] `axios` and `dotenv` dependencies for HTTP requests and environment variable loading in the benchmark tool

### Fixed

- [Fixed]: [2026-06-07] llama.cpp build — cmake now runs in the correct directory (`llama.cpp/`) with proper `cwd` and `env` options instead of relying on shell `export` commands that don't persist between `exec()` calls; added binary existence verification after build
- [Fixed]: [2026-06-07] llama-server spawn `ENOENT` — removed dead `export VAR=val` prefix from command string; added `cwd` to `spawn()` pointing to the binary directory; env vars now passed via spawn's `env` option
- [Fixed]: [2026-06-07] Build error messages were swallowed — `runCommand` rejected with `{ error, stderr }` but catch blocks accessed `error.message` (undefined on plain objects); now properly extracts and displays both error message and stderr
- [Fixed]: [2026-06-07] `isCloned()` — now uses `fs.statSync` to verify `llama.cpp` is a directory, not just a name in the listing

### Added

- [Added]: [2026-06-07] Verbose error display — `runBuild`, `init`, and `main` now show formatted error blocks with separator lines, stderr output, and helpful context (working directory, build cores, build directory contents)
- [Added]: [2026-06-07] 10-error limit — benchmark stops after 10 test run failures; error count displayed as `error N/10` in console output
- [Added]: [2026-06-07] `npm run benchmark` script in `package.json` to run the benchmark tool
- [Added]: [2026-06-07] Server parameters in `configs.json` — `server_params` section with `enabled`/`value` pattern for all llama-server flags (flash_attn, reasoning, profiling, presence_penalty, reasoning_budget, reasoning_budget_message, rope_scaling, jinja, parallel, n_predict, n_keep, stream, cache_prompt, cont_batching)
- [Added]: [2026-06-07] Split parameters in `configs.json` — `split_params` section with `enabled`/`value` pattern for layer_split, tensor_split, and primary_gpu

### Changed

- [Changed]: [2026-06-07] Benchmark config — disabled layer_split, tensor_split, primary_gpu, n_predict, and n_keep split params; added gpu_layers split param (value: 999); updated CUDA version from 13.3 to 13.2
- [Changed]: [2026-06-07] Benchmark build script — refactored `getBuildScript()` to use an array of flags instead of string concatenation, with improved logging of cmake flags and full command; fixed `CUDACXX` env var to only be set when present in process.env
- [Changed]: [2026-06-07] Benchmark server params — added `gpuLayers` to server params snapshot and test run configuration

### Added

- [Added]: [2026-06-07] Chat-based benchmark — switched from `/completion` to `/chat/completions` endpoint; benchmark now sends multi-turn chat requests with accumulated conversation history, extracts assistant response text, and reports `totalMessagesInContext` per message

### Changed

- [Changed]: [2026-06-07] Server lifecycle — `startLlamaServer()` now retries up to 5 times on port binding failures; `stopLlamaServer()` tries graceful `/shutdown` endpoint first then falls back to SIGTERM/SIGKILL; added `waitForPortFree()` to verify port is fully free (no TIME_WAIT)
- [Changed]: [2026-06-07] Pre-flight cleanup — added `ensureNoLlamaServer()` to detect and kill leftover llama-server processes before starting a new benchmark run; called in both `main()` and `runTestRun()`
- [Changed]: [2026-06-07] Signal handling — added SIGTERM, SIGINT, and uncaughtException handlers that gracefully stop llama-server and exit
- [Changed]: [2026-06-07] Server start logic — extracted `tryStartServer()` helper with early-death detection (3s timeout) and health polling; `startLlamaServer()` is now async with retry loop
- [Changed]: [2026-06-07] Test variable bounds — added `contextLengthMax`, `gpuLayerOffMax`, `batchSizeMax`, `uBatchSizeMax`, `cacheRamSMax` constants for future bound enforcement
- [Changed]: [2026-06-07] Results table — added "Messages in Context" column to per-message results markdown output
- [Changed]: [2026-06-07] Formatting — applied consistent line-break formatting to long if-statements and console.log calls in `getRunScript()` and `getServerParamsSnapshot()`

### Added

- [Added]: [2026-06-07] Benchmark API server (`src/benchmark/api-server.js`) — standalone Express server providing REST API and SSE streaming for the benchmark tool; supports real-time live metrics via Server-Sent Events, config CRUD, results retrieval, and report management (save/list/view/delete)
- [Added]: [2026-06-07] Benchmark REST API endpoints — `GET/PUT /api/configs` for config management, `GET /api/status` for live status, `POST /api/run` and `POST /api/stop` for benchmark lifecycle, `GET /api/results` for results data, `GET/POST/DELETE /api/report*` for report CRUD, `POST /api/save-report` to save current results as a named report, `GET /api/health` for health checks
- [Added]: [2026-06-07] SSE stream endpoint (`GET /api/stream`) — persistent SSE connection with heartbeat (15s interval), broadcasts benchmark stdout/stderr, status transitions, parsed live metrics, and exit/error events to all connected clients
- [Added]: [2026-06-07] BenchmarkManager class in main server (`src/backend/server.js`) — event-driven benchmark orchestrator with `start()`, `stop()`, `loadConfig()`, and `getResults()` methods; emits `stdout`, `stderr`, `status`, `results`, `exit`, and `error` events; parses benchmark log output for live metrics (tokens/sec, total tokens, timing, memory)
- [Added]: [2026-06-07] WebSocket benchmark commands — new WebSocket message types `benchmark_start`, `benchmark_stop`, `benchmark_get_config`, and `benchmark_get_results` handled in the main server's WebSocket handler
- [Added]: [2026-06-07] Benchmark frontend UI (`src/frontend/public/js/benchmark.js`, `src/frontend/public/css/benchmark.css`) — multi-page dashboard app with 5 views (Dashboard, Configs, Run, Results, Reports); live SSE-driven metrics display, config editor with typed fields and toggle switches, real-time log viewer, report viewer with download/delete, and responsive layout
- [Added]: [2026-06-07] App tab switching — added "Views" section in sidebar with Chat (💬) and Benchmark (⚡) tabs; `switchTab()` toggles between chat view and benchmark view, initializing the benchmark app on first visit
- [Added]: [2026-06-07] Collapsible sidebar — sidebar now supports collapse/expand state with CSS transitions; collapsed state hides sidebar content; mobile overlay for sidebar when open
- [Added]: [2026-06-07] Benchmark config schema (`src/frontend/public/js/benchmark.js`) — declarative config schema mapping JSON paths to UI field definitions (text, number, toggle types) with nested path support (e.g., `build_make_params.enable_cuda`)
- [Added]: [2026-06-07] Benchmark config categories — configs organized into 6 categories: Server, Build Parameters, Model Parameters, Server Parameters, Split Parameters, and Test Parameters, each with appropriate field types and hints

### Changed

- [Changed]: [2026-06-07] Frontend modal system replaced — replaced custom modal dialogs (select, confirm, input, editor) with native browser `prompt()`, `confirm()`, and `alert()` calls; replaced `showModal()`/`hideModal()` with `toast()` notifications for non-critical messages
- [Changed]: [2026-06-07] Dialog functions migrated — `showSelectDialog()`, `showConfirmDialog()`, `showInputDialog()`, `showEditorDialog()`, `showModal()`, `hideModal()`, `closeModal()` all removed; callers updated to use native dialogs or toast notifications
- [Changed]: [2026-06-07] Workspace selector — replaced directory browser modal with native `prompt()` for entering workspace path; `showWorkspaceModal()` now calls `prompt()` with current workspace as default
- [Changed]: [2026-06-07] Command palette display — `showCommands()` now shows available commands in a toast notification instead of a modal list
- [Changed]: [2026-06-07] Compact session — replaced custom modal with `prompt()` dialog for optional custom compaction instructions
- [Changed]: [2026-06-07] Fork session — replaced command list modal with `prompt()` showing available entry IDs for selecting fork point
- [Changed]: [2026-06-07] Help and shortcuts — replaced modal dialogs with toast notifications displaying help text and keyboard shortcuts
- [Changed]: [2026-06-07] Extension UI handlers — `select`, `confirm`, `input`, and `editor` extension UI methods now use native `prompt()` and `confirm()` instead of custom modals
- [Changed]: [2026-06-07] Benchmark config (`src/benchmark/configs.json`) — updated model from `gemma-4-E2B_q4_0-it.gguf` to `Qwen3.6-35B-A3B-Q8_0.gguf`; changed `llama_host` from `100.105.3.99` to `100.88.77.33`; enabled layer_split, tensor_split, and primary_gpu split params; increased `build_cores` from 16 to 20; updated CUDA version from 13.2 to 13.3; disabled CUDA compression; disabled jinja template; enabled gpu_layers (999); changed `cuda_max_scheduled_copies` from 16 to 14
- [Changed]: [2026-06-07] CSS variables — added new design tokens (`--bg-card`, `--border-light`, `--accent-blue/cyan/green/orange/red`, `--sidebar-width`, `--radius`, `--radius-sm`, `--btn-primary-bg/hover`, `--btn-secondary-bg/hover`, `--btn-danger-bg/hover`) for consistent theming across chat and benchmark views

- [Fixed]: [2026-06-10] Consolidate execSync import to top-level ES module in api-server.js, removing redundant CommonJS require() inside kill-port handler
