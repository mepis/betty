# Repository Audit: Betty

**Date:** 2026-05-16
**Scope:** Full codebase review (server, frontend, configuration, documentation)
**Tags:** `security`, `code-quality`, `architecture`, `audit`

---

## 1. Project Summary

**Betty** is a web-based AI coding assistant UI built with Vue 3, Vite, and Pinia. It acts as a thin WebSocket frontend for [pi](https://pi.dev), the terminal-based coding harness. The server wraps pi's RPC mode and exposes a WebSocket API to the browser.

### Architecture Overview

```
┌──────────────────┐                          ┌──────────────────┐
│   Vue 3 Frontend  │  HTTP/WS (same port)   │  Node.js Server  │
│   (Vite dev /     │ ◄────────────────────► │  (HTTPS + WS)    │
│    Vite build)    │   JSON messages        │                  │
└──────────────────┘                          └────────┬─────────┘
                                                       │
                                                 stdin/stdout (JSONL)
                                                       │
                                                ┌──────▼───────┐
                                                │    pi RPC     │
                                                │  --mode rpc   │
                                                └──────────────┘
```

**Key design decisions:**
- One `pi --mode rpc` process per WebSocket client (session isolation)
- Pinia store as single source of truth for frontend state
- Server is stateless between reconnections; session state lives in pi
- JSON-based WebSocket protocol for bidirectional communication

---

## 2. Security Findings

### 🔴 High Severity

#### S1: API Keys Exposed via Committed `.env` File

| Field | Value |
|-------|-------|
| **Location** | `.env` |
| **Impact** | API keys could be committed to the repository |
| **Details** | The `.gitignore` lists `.env`, but the file exists in the working tree. It was likely committed before the gitignore rule was added. The file currently contains harmless defaults (`VITE_WS_URL`, `VITE_WS_PORT`), but the pattern is dangerous — API keys could be accidentally committed. |
| **Recommendation** | Verify `.env` was never in git history (`git log --all -- .env`). If it was, use BFG Repo-Cleaner to remove it. Use `.env.example` for template values. |

#### S2: Self-Signed Certificates Committed to Repository

| Field | Value |
|-------|-------|
| **Location** | `.certs/cert.pem`, `.certs/key.pem` |
| **Impact** | Private key material in version control |
| **Details** | Both the certificate and private key are tracked in git, despite `.certs/` being in `.gitignore`. These were likely committed before the gitignore rule. The private key should never be in version control. |
| **Recommendation** | Remove from git history (`git rm -r --cached .certs/`). The server auto-generates these on startup when `HTTPS=true`. |

#### S3: No Rate Limiting on WebSocket

| Field | Value |
|-------|-------|
| **Location** | `server.ts` |
| **Impact** | Denial of service, resource exhaustion |
| **Details** | Any client can flood the server with commands. No per-connection or global rate limiting exists. Combined with the 5-minute RPC timeout (finding S7), this could exhaust system resources. |
| **Recommendation** | Add rate limiting middleware. Consider per-connection message quotas or a token bucket algorithm. |

### 🟡 Medium Severity

#### S4: API Key Passed as CLI Argument

| Field | Value |
|-------|-------|
| **Location** | `server.ts:157` |
| **Impact** | API key visible in process listings |
| **Details** | `--api-key` is passed to the `pi` process as a CLI argument (`args.push("--api-key", options.apikey)`). On Linux, this is visible via `ps aux` or `/proc/<pid>/cmdline`. |
| **Recommendation** | Rely on environment variables (`process.env.ANTHROPIC_API_KEY`) instead. The `pi` process already inherits the parent's environment. Remove the `--api-key` CLI flag usage. |

#### S5: No Authentication on WebSocket

| Field | Value |
|-------|-------|
| **Location** | `server.ts` (connection handler) |
| **Impact** | Unauthorized access to pi instance |
| **Details** | Any connection to the WebSocket endpoint is accepted without authentication. Anyone who can reach the server port can send commands to the AI, consume tokens, and access sessions. |
| **Recommendation** | Add at minimum a token-based auth layer. Accept an `Authorization` header or query parameter during the WebSocket handshake and validate before accepting the connection. |

#### S6: `v-html` Rendering of AI Content

| Field | Value |
|-------|-------|
| **Location** | `App.vue` (template, `v-html="formatContent(msg.content)"`) |
| **Impact** | Potential XSS if tool output is injected |
| **Details** | AI content is rendered via `v-html`. While the content comes from the AI (not direct user input), tool output (e.g., bash results) is injected into messages. If a tool is compromised or the AI is tricked, malicious HTML could be rendered. |
| **Recommendation** | Sanitize tool output before rendering. Consider using a DOMPurify library. Alternatively, render tool results in `<pre>` blocks without HTML interpretation. |

#### S7: 5-Minute RPC Timeout Is Excessively Long

| Field | Value |
|-------|-------|
| **Location** | `server.ts:187` |
| **Impact** | Resource leakage, stalled connections |
| **Details** | All RPC commands default to a 5-minute timeout. Long-running commands (e.g., bash scripts, large file operations) could hold resources indefinitely. There's no per-command timeout differentiation. |
| **Recommendation** | Shorten the default timeout (e.g., 60 seconds). Allow commands that may take longer (like `bash`) to specify their own timeout. Add a command timeout configuration. |

---

## 3. Code Quality

### Strengths

| Area | Assessment |
|------|-----------|
| **Separation of concerns** | Clean: server handles transport, frontend handles UI, store handles state |
| **Type safety** | Full TypeScript coverage with well-defined interfaces for the WebSocket protocol |
| **Error handling** | Basic error handling on WebSocket connection, message parsing, and RPC calls |
| **Auto-reconnect** | Client reconnects after 2 seconds on disconnect |
| **Directory traversal protection** | `serveStaticFile` validates `fullPath.startsWith(distDir)` |
| **Documentation** | Comprehensive README, architecture deep-dive, changelog, and project rules |

### Issues

#### C1: Fragile Markdown-to-HTML Parser ✅ RESOLVED

| Field | Value |
|-------|-------|
| **Location** | `App.vue:333-341` (replaced) |
| **Previous Impact** | Incorrect rendering of edge-case markdown |
| **Status** | Replaced regex-based parser with [`marked`](https://marked.js.org) (GFM mode, breaks enabled) |
| **Resolution** | Proper handling of nested lists, tables, fenced code blocks with language specifiers, and correct escaping of special characters inside inline code. |
| **File changed** | `src/App.vue`, `package.json` (added `marked` dependency) |

#### C2: No Unit Tests

| Field | Value |
|-------|-------|
| **Location** | Entire repository |
| **Impact** | Regression risk, no safety net for changes |
| **Details** | Zero test files exist. Rule 8 in `PROJECT_RULES.md` mandates tests ("Tests verify intent, not just behavior"), but none are implemented. |
| **Recommendation** | Start with tests for the store logic (message handling, state transitions). Consider Vitest for Vue/Vite compatibility. |

#### C3: Unbounded `clientRpcs` Map

| Field | Value |
|-------|-------|
| **Location** | `server.ts` (`clientRpcs` Map) |
| **Impact** | Memory leak on abnormal disconnections |
| **Details** | If WebSocket close events don't fire (e.g., TCP reset, network drop), `PiRpcClient` instances are never cleaned up. The `stop()` call in the close handler helps, but edge cases exist. |
| **Recommendation** | Add a periodic cleanup interval that removes stale clients (e.g., no message received in 5 minutes). Add heartbeat/ping-pong to detect dead connections. |

#### C4: No Rollback on Failed `sendMessage`

| Field | Value |
|-------|-------|
| **Location** | `stores/chat.ts` (`sendMessage`) |
| **Impact** | UI shows messages that were never sent |
| **Details** | User messages and placeholder assistant messages are added locally before sending. If the send fails (e.g., WebSocket disconnects), the UI shows a message that never reached the server. No rollback on failure. |
| **Recommendation** | Add a "sending" state. Only finalize the message in the store after receiving confirmation from the server. Show a visual indicator that the message is pending. |

#### C5: Fragile Message Deduplication

| Field | Value |
|-------|-------|
| **Location** | `stores/chat.ts:133-148` (`agent_end` handler) |
| **Impact** | Incorrect deduplication of messages |
| **Details** | Content comparison via `normalizeContent` uses string equality. Two different messages with the same text would be incorrectly deduplicated. This is especially problematic for short or generic messages. |
| **Recommendation** | Use message IDs or timestamps for deduplication instead of content comparison. |

#### C6: Unused `abort` Function in `App.vue`

| Field | Value |
|-------|-------|
| **Location** | `App.vue` |
| **Impact** | Dead code |
| **Details** | The `abort()` function is defined in the `<script setup>` block but never called. The abort button in the template calls `store.abort()` directly instead. |
| **Recommendation** | Remove the unused `abort` function. |

---

## 4. Configuration & Build

### Assessment

| Aspect | Status | Details |
|--------|--------|---------|
| **TypeScript** | ✅ Good | Strict mode enabled, path aliases configured |
| **Vite** | ✅ Good | Proper Vue plugin, proxy configured for dev mode |
| **Dependencies** | ⚠️ Minor issue | `@pinia/nuxt` is listed but unused (not a Nuxt project) |
| **Scripts** | ✅ Good | Clear dev/build/start scripts with `concurrently` |
| **MIME types** | ✅ Good | Comprehensive coverage for static file serving |

### Issues

| # | Issue | Recommendation |
|---|-------|---------------|
| D1 | `@pinia/nuxt` in `dependencies` | Remove — this is a Vite+Vue project, not Nuxt |
| D2 | `skipLibCheck: true` in `tsconfig.json` | Consider enabling to catch type errors in dependencies |

---

## 5. Missing / Incomplete Features

| # | Feature | Details |
|---|---------|---------|
| F1 | **No tests** | Zero test files. Rule 8 in PROJECT_RULES.md mandates tests. |
| F2 | **Incomplete sidebar session list** | Sidebar shows only the current session. Session listing/switching isn't implemented in the UI. |
| F3 | **No image upload UI** | The protocol supports `images` in prompts, but the UI has no image upload button. |
| F4 | **No fork/clone UI** | Features exist in the protocol and store actions but have no UI hooks. |
| F5 | **No keyboard shortcut for model switching** | Model switching requires clicking the badge and then the selector modal. |
| F6 | **No error recovery for stale WebSocket** | If the server restarts, the client reconnects but doesn't re-fetch state automatically. |

---

## 6. Recommendations (Priority Order)

### Immediate (Security)

1. **Remove `.certs/` and `.env` from git history** — Use BFG Repo-Cleaner if they were ever committed.
2. **Add WebSocket authentication** — Token-based auth before accepting connections.
3. **Add rate limiting** — Prevent WebSocket flooding on the server.

### Short-Term (Quality)

4. **Add unit tests** — Start with store logic (message handling, state transitions). Use Vitest.
5. ~~Replace regex markdown parser~~ — ✅ Done. Replaced with `marked` (GFM + breaks).
6. **Remove `@pinia/nuxt` dependency** — It's unused.
7. **Add input validation** — On the `bash` command and any user input.

### Medium-Term (Robustness)

8. **Fix stale WebSocket handling** — Re-fetch state on reconnect.
9. **Add UI for fork/clone features** — Implemented in backend, invisible in UI.
10. **Add heartbeat/ping-pong** — Detect dead WebSocket connections.
11. **Reduce RPC timeout** — Shorten from 5 minutes to ~60 seconds.
12. **Add memory leak protection** — Periodic cleanup of stale `clientRpcs`.

---

## 7. File Summary

| File | Lines | Role |
|------|-------|------|
| `server.ts` | ~380 | WebSocket server + RPC client wrapper |
| `src/App.vue` | ~570 | Main UI component + CSS (~800 lines total) |
| `src/stores/chat.ts` | ~300 | Pinia store: WebSocket client, state, events |
| `src/types.ts` | ~190 | TypeScript interfaces for WS protocol |
| `docs/architecture.md` | ~150 | Architecture deep-dive |
| `README.md` | ~200 | User-facing documentation |
| `docs/CHANGELOG.md` | ~60 | Changelog |
| `docs/index.md` + `docs/tags.md` | ~150 | Documentation navigation |
| `.pi/PROJECT_RULES.md` | ~50 | 12 project development rules |

**Total source code: ~1,500 lines** (excluding CSS in App.vue)

---

## 8. Scoring

| Category | Score | Notes |
|----------|-------|-------|
| **Security** | ⚠️ 5/10 | No auth, no rate limiting, committed secrets |
| **Code Quality** | ✅ 8/10 | Clean architecture, no tests, proper markdown parser |
| **Documentation** | ✅ 9/10 | Comprehensive README, architecture docs, changelog |
| **Architecture** | ✅ 8/10 | Clean separation, good process model |
| **Testing** | ❌ 0/10 | No tests |
| **Maintainability** | ✅ 7/10 | Well-structured but no tests as safety net |

**Overall: 6.8/10** — Solid architecture and documentation, but security gaps and lack of tests are significant concerns.

---

*Tags: `security`, `code-quality`, `architecture`, `audit`*
