# Web Chat App Implementation Plan — Review Findings

**Date:** 2026-06-03
**Auditor:** pi coding agent
**Documents reviewed:**
- `web-chat-app-design.md` (design document)
- `web-chat-app-design-audit.md` (audit round 1)
- `web-chat-app-design-audit-round2.md` (audit round 2)
- `web-chat-app-design-audit-final.md` (final audit)
- `01-project-scaffolding-and-backend-foundation.md` (milestone 1)
- `02-pi-sdk-integration.md` (milestone 2)
- `03-frontend-chat-interface.md` (milestone 3)
- `04-settings-and-polish.md` (milestone 4)

---

## Executive Summary

The design document has been thoroughly audited 3 times and is well-aligned with the SDK. The implementation plan breaks it into 4 clear milestones with detailed tasks. However, this review found **17 issues** spanning critical to low severity — the most important being three that would cause actual feature failures if implemented as-is.

| Severity | Count | Key Issues |
|----------|-------|------------|
| 🔴 Critical | 3 | Missing `extension_ui_request` handler, no message transformation, `extension_ui_response` not routed to SDK |
| 🟡 High | 6 | Missing available levels update, `modelRegistry` scope, no default command case, prompt error handling, ThinkingBlock markdown, toolcall deltas |
| 🟢 Medium | 4 | Compact result interpretation, ThinkingBlock content type, switch_session identifier, thinking content handling |
| ⚪ Low | 4 | Build ordering, sessionPath in sidebar, delta types completeness, interval cleanup |

---

## 🔴 Critical Issues

### 1. `extension_ui_request` event missing from frontend handler

**Location:** Milestone 3, Task 3.3.7 — `handleEvent()` switch statement

**Problem:** The backend relays `extension_ui_request` events (design doc §6), but the frontend handler has **no case for this event**. Extension dialogs (select, confirm, input, editor) will silently fail — the agent will block waiting for a response that never arrives.

**Impact:** Extension UI features are completely non-functional.

**Fix:** Add `extension_ui_request` case in `handleEvent()` that opens an `ExtensionDialog` component and waits for `extension_ui_response` command.

---

### 2. `get_messages` response lacks frontend transformation

**Location:** Task 2.3.12 (backend) + Task 3.1.1 (frontend store)

**Problem:** Task 2.3.12 returns raw `runtime.session.messages` (SDK `AgentMessage[]`). The frontend `Message` store interface has `role`, `content`, `toolCalls`, `thinkingContent`. **No transformation layer** is documented to convert SDK messages to frontend messages.

**Impact:** Reconnection after disconnect will show blank or broken messages.

**Fix:** Document a `transformMessage()` function that maps SDK `AgentMessage[]` → frontend `Message[]`, handling text assembly, tool call extraction, and thinking content.

---

### 3. `extension_ui_response` handler doesn't route to SDK

**Location:** Milestone 2, Task 2.3.17

**Problem:** The handler sends `{ success: true }` response to the client but **never calls the SDK's extension response mechanism**. The SDK's RPC extension system needs the actual response data (`value`, `confirmed`, `cancelled`) routed back to the pending dialog.

**Impact:** Extension dialogs will never receive user input — they will time out.

**Fix:** Route the response through the SDK's extension system — the exact mechanism depends on how `bindExtensions()` stores pending responses.

---

## 🟡 High-Priority Issues

### 4. `thinking_level_changed` handler doesn't update available levels

**Location:** Task 3.3.7 + Task 4.1.3

**Problem:** Handler sets `chatStore.setThinkingLevel(event.data.level)` but doesn't update the available levels list. The settings panel filters by `getAvailableThinkingLevels()` for the current model.

**Impact:** After model change, the thinking level dropdown may show invalid options.

**Fix:** Also update `availableThinkingLevels` in the store when `thinking_level_changed` fires.

---

### 5. `set_model` handler: `modelRegistry` scope unclear

**Location:** Task 2.3.14 vs Task 2.4.1

**Problem:** Task 2.3.14 calls `modelRegistry.find(provider, modelId)` in `command-handler.ts`, but `modelRegistry` is imported in Task 2.4.1 (REST routes module). The command handler has no import or injection of `modelRegistry`.

**Impact:** Command handler will have `modelRegistry` undefined at runtime — model switching will crash.

**Fix:** Import `modelRegistry` in `command-handler.ts` or pass it as a constructor parameter.

---

### 6. Missing `default` case in command switch

**Location:** Task 2.3.18 — command handler switch statement

**Problem:** No `default` case. Unknown command types will silently do nothing instead of returning an error.

**Fix:** Add `default: ws.send({ type: 'error', data: { message: `Unknown command: ${command.type}` } })`

---

### 7. `prompt()` error during streaming not explicitly handled

**Location:** Task 2.3.3

**Problem:** `runtime.session.prompt()` throws if called during streaming without `streamingBehavior`. The catch block (Task 2.3.18) catches errors, but the specific "streaming in progress" error should be relayed with a clear user message.

**Fix:** Add explicit try/catch around `prompt()` with a user-friendly error message like "Please use 'steer' or 'followUp' streaming behavior while the agent is active."

---

### 8. `ThinkingBlock` doesn't render markdown

**Location:** Task 3.3.5

**Problem:** `ThinkingBlock.vue` accepts `content: string` but doesn't use `MarkdownRenderer`. Thinking output can contain markdown formatting.

**Fix:** Pass `content` through `MarkdownRenderer` inside `ThinkingBlock`.

---

### 9. `toolcall_*` delta events not handled in frontend

**Location:** Task 3.3.7 — `message_update` handler

**Problem:** Backend relays `toolcall_start`, `toolcall_delta`, `toolcall_end` via `message_update` events. Frontend only handles `text_delta` and `thinking_delta`.

**Impact:** Tool call information within streaming messages is lost — users can't see what tools are being called in real-time.

**Fix:** Add handling for `toolcall_delta` in the `message_update` case.

---

## 🟢 Medium-Priority Issues

### 10. `compact` result field interpretation is wrong

**Location:** Task 3.3.7 — `compaction_end` handler

**Problem:** `stopCompacting({ tokensSaved: event.data.result.tokensBefore })` — `tokensBefore` is the token count *before* compaction, not tokens saved.

**Impact:** The "tokens saved" display will be misleading (shows total tokens before compaction, not the reduction).

**Fix:** Either compute tokens saved from `tokensBefore` (if `tokensAfter` is available) or display as "tokens before compaction: X".

---

### 11. `ThinkingBlock` content type mismatch

**Location:** Task 3.1.1 + Task 3.3.5

**Problem:** Store tracks `thinkingContent` as a string accumulated from deltas. This is correct for accumulation, but `ThinkingBlock` should handle potentially large content gracefully (scroll, virtualization for very long thinking).

**Fix:** Add scroll container with max-height and overflow-y-auto to `ThinkingBlock`.

---

### 12. `switch_session` uses wrong identifier

**Location:** Task 3.5.3 — `switchSession()`

**Problem:** Sends `{ sessionPath: sessionId }` but `sessionId` from the store is likely a short ID, while the SDK expects the full JSONL file path.

**Impact:** Session switching will fail with "session not found."

**Fix:** Use `session.sessionFile` (full path) instead of `session.id` for `switch_session`.

---

## ⚪ Low-Priority / Observations

### 13. Build script ordering in Milestone 4

**Location:** Task 4.3.5

**Problem:** `"build": "cd src/frontend && npm run build && cd ../backend && npm run build"` runs sequentially but doesn't fail if frontend build fails.

**Fix:** Use `&&` chain at root level or `npm run build:frontend && npm run build:backend`.

---

### 14. `session_info` event missing `sessionPath` in sidebar

**Location:** Task 2.2.5 + Task 3.5.3

**Problem:** `session_info` includes `sessionFile` (full path), but the sidebar (Task 3.5.3) uses `session.id` instead of `session.sessionFile` — see issue #12.

**Status:** Covered by issue #12.

---

### 15. `message_update` delta types completeness

**Location:** Task 3.3.7

**Problem:** All delta types are documented in the design (`text_start`, `text_delta`, `text_end`, `thinking_start`, `thinking_delta`, `thinking_end`, `toolcall_start`, `toolcall_delta`, `toolcall_end`, `done`, `error`) but the frontend only handles `text_delta` and `thinking_delta`. The `error` delta type should at minimum be handled to show streaming errors inline.

**Fix:** Add handling for `error` delta type in the `message_update` case.

---

### 16. `settingsManager.drainErrors()` interval not cleaned up

**Location:** Task 2.1.9

**Problem:** Creates a `setInterval` but it's not cleared on WebSocket close.

**Fix:** Store the interval ID and `clearInterval()` in the close handler (Task 2.1.6).

---

### 17. `getAvailableThinkingLevels()` not a WebSocket command

**Location:** Task 4.1.3

**Problem:** The frontend needs to call `runtime.session.getAvailableThinkingLevels()` after model changes. This is documented for the settings panel but not as a WebSocket command.

**Fix:** Either add a `get_available_thinking_levels` WebSocket command, or have the backend relay `thinking_level_changed` with available levels.

---

## What the Plan Gets Right

1. **SDK embedding over RPC mode** — Correct for same-language integration. Zero IPC overhead.
2. **`AgentSessionRuntime` over `createAgentSession()`** — Correct, supports session replacement.
3. **Runtime factory pattern** — Correctly closes over `AuthStorage` and `ModelRegistry`.
4. **WebSocket with `ws` library** — Correct for bidirectional communication.
5. **First-message auth** — Correct security pattern. No secrets in query params.
6. **`prompt()` with `streamingBehavior`** — Correct unified approach for steer/followUp.
7. **Vue 3 + Pinia + Vite** — Solid modern stack for SPA.
8. **Tailwind CSS v4** — Good choice, zero-runtime CSS.
9. **`marked` + `highlight.js` + `dompurify`** — Correct for safe Markdown rendering.
10. **JSONL session persistence** — Correct, leverages pi's native format.
11. **`DefaultResourceLoader` with cwd/agentDir** — Correct for extension/skill/prompt discovery.
12. **`SettingsManager` with `drainErrors()`** — Correct, per SDK docs.
13. **`runtime.diagnostics` reading** — Correct, per SDK docs.
14. **Session replacement re-subscribe + re-bind** — Correctly documented in both Task 2.1 and 2.2.
15. **`bindExtensions()` with all binding fields** — Correct `ExtensionBindings` interface.
16. **`runtime.dispose()` for cleanup** — Correct async dispose pattern.
17. **Full `assistantMessageEvent` passthrough** — Correct for streaming display with `partial`.
18. **All 9 extension UI methods** — 4 dialog + 5 fire-and-forget.
19. **3 `extension_ui_response` shapes** — Matching `RpcExtensionUIResponse` union type.
20. **`source: "rpc"` on all prompts** — Correct for extension input filtering.
21. **`willRetry` on `agent_end` and `compaction_end`** — Correct for retry indicators.
22. **`cancelled` on session replacement responses** — Correct for extension cancellation handling.
23. **Phased implementation plan** — Logical progression from scaffolding to polish.
24. **Validation criteria** — Good testability planning with L1-L3 levels.
25. **File structure** — Clean separation of concerns.

---

## Recommended Fix Priority

1. **Fix #1, #2, #3** — These are blocking issues that will cause features to fail completely
2. **Fix #4–#9** — These will cause degraded UX or runtime errors in common scenarios
3. **Fix #10–#12** — These are bugs that will produce incorrect behavior
4. **Fix #13–#17** — These are minor issues that can be addressed during implementation

---

## Comparison with Prior Audits

| Audit Round | Issues Found | Status |
|-------------|-------------|--------|
| Round 1 (prior) | 6 issues | All fixed in design doc |
| Round 2 | 3 issues | All fixed in design doc |
| Final audit | 0 issues (design doc clean) | Design doc verified correct |
| **This review** | **17 issues** | **Implementation plan gaps** |

**Note:** The design document itself is clean and SDK-accurate. The issues found here are in the **implementation plan** — gaps between what the design doc specifies and what the milestone files actually implement. The design doc correctly defines `extension_ui_request` events and `extension_ui_response` handling, but the milestone files don't wire them up in the frontend handler.
