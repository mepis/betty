# Betty App - Critical Bug Fixes

**Date:** 2026-05-16
**Files:** `src/stores/chat.ts`, `src/stores/auth.ts`, `server.ts`, `src/server/userStore.ts`

## Critical Regression — server.ts
- [x] **REG-01**: `userStore.deleteUser(id)` called without `await` — returns `Promise<boolean>` which is always truthy, so the 404 check never fires. Fixed: Added `await` before `userStore.deleteUser(id)` in the DELETE /api/users/:id handler.

## Edge Case Bugs — server.ts
- [x] **EC-01**: `RATE_LIMIT_WINDOW=0` and `RATE_LIMIT_MAX=0` cause permanent lockouts (entry.count >= 0 always true). Fixed: Added config validation that exits with error if either value is ≤ 0.
- [x] **EC-02**: `parseBody` has no timeout — slow/lively attacks could hang indefinitely. Fixed: Added 10-second timeout with 408 response.
- [x] **EC-05**: Non-object image array elements pass validation in prompt handler. Fixed: Added per-element type check ensuring each image is a non-null object with `type='image'`, `data` (string), and `mimeType` (string).

## Edge Case Bugs — chat.ts
- [x] **EC-03**: `new WebSocket(getWsUrl())` lacks try/catch — invalid URLs or OOM could crash the store. Fixed: Wrapped WebSocket creation in try/catch with user-friendly error message.
- [x] **EC-04**: `JSON.stringify` not wrapped in try/catch in `send()` — malformed data could throw. Fixed: Wrapped `ws.send(JSON.stringify(msg))` in try/catch.

## Edge Case Bugs — userStore.ts
- [x] **EC-06**: bcrypt cost 31 allowed — extremely high cost causes severe performance degradation. Fixed: Capped maximum bcrypt cost at 15 (from 31), with comment explaining practical upper bound.

## Critical Bugs — chat.ts
- [x] **C-03**: Race condition: duplicate WebSocket connections when connect() called during CONNECTING state
- [x] **C-04**: `wsError` never cleared on connection attempt
- [x] **C-05**: WebSocket can close between state check and handler assignment
- [x] **C-07**: Stale `ws` reference in `onclose` handler after disconnect()
- [x] **C-08**: No cleanup of pending reconnect timeout
- [x] **C-32**: `handleWsMessage` `models` case calls `.map()` on `m.data.models` without validating it's an array
- [x] **C-54**: `respondToUiRequest()` spreads `...response` into message payload — potential data leak
- [x] **C-58**: `sendMessage` — No input length limit on message text
- [x] **C-61**: `handleWsMessage` — `as unknown as X` type casts bypass TypeScript safety
- [x] **C-60**: `handleWsMessage` — `error` event doesn't clear `isStreaming`
- [x] **C-27**: Missing default case in handleWsMessage switch statement
- [x] **C-30**: No validation of `m.data` shape before accessing properties

## Major Bugs — chat.ts (Phase 2)
- [x] **C-20**: `sendMessage` — No error handling if WebSocket not connected
- [x] **C-23**: `abort` — Sends abort message even when not connected
- [x] **C-35**: `compact` — No confirmation that compaction succeeded
- [x] **C-40**: `setModel` — No validation that model exists in available models
- [x] **C-45**: `switchSession` — No validation that session exists
- [x] **C-50**: `fork` — Race condition: fork during active stream
- [x] **C-55**: `handleWsMessage` `toolCallEnd` — `m.data.toolCallId` without null check (already fixed in critical phase)
- [x] **C-62**: `sendMessage` — Images array not validated for size/type
- [x] **C-63**: `handleWsMessage` `agentEnd` — doesn't handle missing text/role fields
- [x] **C-64**: `handleWsMessage` `messageUpdate` — overwrites existing messages without checking (already fixed — uses `+=` append)
- [x] **C-65**: `handleWsMessage` `state` — doesn't validate state shape (already fixed in critical phase as C-30)
- [x] **C-66**: `handleWsMessage` `models` — doesn't handle empty models list

## Major Bugs — auth.ts (Phase 2)
- [x] **A-11**: `loadSession` — Fire-and-forget call during store initialization

## Critical Bugs — auth.ts
- [x] **A-01**: `localStorage.getItem()` at module scope without try/catch crashes in private browsing
- [x] **A-05**: `login()` stores `data.token` without verifying it's a string

## Minor Bugs — chat.ts (Phase 3)
- [x] **C-09**: Redundant null checks in `send()` — Added clarifying comment noting `ws` is always set by `connect()`; optional chaining on `readyState` is sufficient
- [x] **C-10**: More descriptive error messages — Improved "Connection failed", "Not connected to server", "Model not found", "Invalid entry ID", "Invalid session path", and "Not connected to server (compact)" to include actionable guidance
- [x] **C-11**: Store initialization in auth.ts — Cleaned up `void loadSession()` pattern (removed `void` prefix, clarified comment)
- [x] **C-01**: `wsBaseUrl` computed once — now a function `getWsBaseUrl()` re-evaluated each call
- [x] **C-02**: `shouldReconnect` is a plain `let` — skipped (fine for internal use)
- [x] **C-06**: `getWsUrl()` cached `baseUrl` locally to avoid redundant lookups
- [x] **C-15**: `sendMessage` — Added 100ms debounce via `lastSendTime` / `DEBOUNCE_MS`
- [x] **C-18**: `newSession` — Now clears message history BEFORE sending `new_session` request
- [x] **C-22**: `handleWsMessage` default — Added `console.warn("[ws] Unknown message type:", msg.type)`
- [x] **C-25**: `handleWsMessage` state handler — Session name validated to max 200 characters
- [x] **C-28**: `handleWsMessage` — Added `steer` handler with direction (string) and strength (-1..1) validation
- [x] **C-33**: `handleWsMessage` — Added `bash` handler with command (non-empty string) validation
- [x] **C-36**: `handleWsMessage` — Added `follow_up` handler with mode (auto/manual/disabled) validation
- [x] **C-38**: `handleWsMessage` — Added `auto_compaction` handler with enabled (boolean) validation
- [x] **C-42**: `handleWsMessage` — Added `auto_retry` handler with enabled (boolean) validation
- [x] **C-48**: `handleWsMessage` — Added `thinking_level` handler with level (off/low/medium/high) validation
- [x] **C-52**: `handleWsMessage` — Added `cycle_model` handler with model existence validation
- [x] **C-53**: `handleWsMessage` — Added `cycle_thinking_level` handler with level validation
- [x] **C-56**: `handleWsMessage` last_assistant_text — Warns if text field is undefined
- [x] **C-57**: `handleWsMessage` commands — Validates response is an array
- [x] **C-59**: `handleWsMessage` stats — Validates response is an object
- [x] **C-67**: `handleWsMessage` agent_end — Added `validateTimestamp()` helper; validates timestamps are within 24h past / 1h future

## Major Bugs — server.ts
- [x] **S-06**: handlerMap entries — Unvalidated command fields (entryId, sessionPath, message, provider, modelId, etc.)
- [x] **S-07**: `spawnPiForClient` — TOCTOU race — check-then-act on client tracking
- [x] **S-08**: `ws.send()` calls — No `readyState` check before sending
- [x] **S-09**: Missing rate limiting — No rate limiting on any endpoint
- [x] **S-10**: Error handling in handlers — Some handlers don't catch errors from PiRpcClient
- [x] **S-11**: `handleApiRoute` body parsing — Body parsed once but used multiple times
- [x] **S-12**: Static file serve — No Content-Type validation for served files

## Minor Bugs — server.ts
- [x] **S-13**: `getMime` — No Content-Type validation (already addressed by S-12: `SAFE_EXTENSIONS.has(ext)` check guards `getMime`)
- [x] **S-14**: `streamingBehavior` — Undocumented config option (validated as string in prompt handler)
- [x] **S-15**: No file size limits — Static files served without size limits (added `MAX_STATIC_FILE_SIZE` check via `fs.statSync`)
- [x] **S-16**: bcrypt cost factor — Default cost factor hardcoded (now configurable via `BCRYPT_COST` env var, validated range 4-31)
- [x] **S-17**: Silent `JSON.parse` drops — RPC `handleOutput` silently ignores bad JSON (now logs warning)
- [x] **S-18**: `msg.type` could be missing after valid `JSON.parse` (guarded with `!eventType` check)
- [x] **S-19**: `msg.images` not validated before forwarding to RPC (now checks `Array.isArray`)
- [x] **S-20**: `compact` handler passes `customInstructions` without validation (now validates string type)
- [x] **S-21**: `switch_session` doesn't validate session path format (now rejects paths with `..`)
- [x] **S-22**: `set_session_name` allows empty name (now checks `trim().length === 0`)
- [x] **S-23**: `respondToUiRequest` spreads response — potential data leak (now only allows known safe keys)
- [x] **S-24**: `parseBody` — `req.destroy()` may throw if stream already destroyed (now guards with `!req.destroyed`)
- [x] **S-25**: `handleOutput` — `newlineIndex` search on very long lines could be slow/DoS (now rejects lines > `MAX_RPC_LINE_LENGTH`)
- [x] **S-26**: `spawnPiForClient` — error from `piClient.start()` not caught (now wrapped in try/catch)
- [x] **S-27**: `authenticateWebSocket` — URL parsing could throw (now wrapped in try/catch)
- [x] **S-28**: `requestHandler` — `req.url` could be undefined (now extracted and validated early)
- [x] **S-29**: `cleanupRateLimit` — modifying Map during iteration (now collects keys first, then deletes)
- [x] **S-30**: `handleApiRoute` — `body` properties cast without validation (now validates types before casting)
- [x] **S-31**: `handleOutput` — buffer not bounded, could grow unbounded (now truncates if buffer > 10x line limit)

## Cosmetic Bugs
- [x] **S-32**: `handlerMap` entries — Improved code ordering comments for all 25 command handlers (added descriptive one-line comments before each handler)
- [x] **S-33**: Static HTML sanitization note — Added clarification comment on dev-mode HTML (no user input reaches this path, so no XSS risk)
- [x] **SU-08**: Code style improvements in `src/server/` — Added JSDoc to `getSecret()` in auth.ts, documented permission model in permissions.ts, added JSDoc to `getBcryptCost()` in userStore.ts

## Minor Bugs
- [x] **A-15**: `validateToken` — Could be more efficient (added local JWT expiry check)
- [x] **SU-05**: env vars lack upper-bound length checks — Added length validation for DEFAULT_ADMIN_USERNAME/PASSWORD
- [x] **SU-06**: `hasPermission` accepts `string` instead of `Command` type — Changed parameter to `Command`
- [x] **SU-07**: `save` uses synchronous `writeFileSync` — Converted to async `fs/promises`
