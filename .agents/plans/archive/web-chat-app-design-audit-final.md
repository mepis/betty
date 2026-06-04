# Final Audit Report: Web Chat App Design Document

**Document audited:** `.agents/plans/web-chat-app-design.md`
**Date:** 2026-06-03
**Auditor:** pi coding agent — comprehensive review against pi SDK source types
**SDK version:** Current installed (`@earendil-works/pi-coding-agent`)
**Status:** ✅ Design is clean and ready for implementation

---

## Executive Summary

After **3 rounds of iterative review and fix**, the design document is now fully aligned with the SDK's API surface. All issues have been resolved across two audit rounds.

**Total issues found and fixed across all rounds: 9**
- Round 1 (previous): 6 issues (already fixed)
- Round 2: 3 issues (fixed in this session)

**Risk level: Low.** The design is comprehensive, accurate, and actionable.

---

## All Issues — Resolved ✓

### Round 1 (Already Fixed)

| # | Issue | Fix Applied |
|---|-------|-------------|
| 1 | `fork` response missing `selectedText` | Added to response shapes |
| 2 | `navigate_tree` missing `replaceInstructions`/`label` | Added to payload |
| 3 | `turn_start` missing `turnIndex`/`timestamp` | Added to event data |
| 4 | Missing `compact` WebSocket command | Added command, payload, handler, response |
| 5 | `setRebindSession()` not used | Documented in command handler |
| 6 | `getAvailableThinkingLevels()` not documented | Added to settings panel task |

### Round 2 (Fixed This Session)

| # | Issue | Fix Applied |
|---|-------|-------------|
| 7 | `session_info_changed` event: `name: string \| null` | Changed to `string \| undefined` |
| 8 | `get_last_assistant_text` response: `text: string \| null` | Changed to `string \| undefined` |
| 9 | `clone` response: spurious `selectedText?: string` | Removed field |

---

## Comprehensive SDK Verification

### AgentSession Events (17 events) — All Match ✅

| Event | Design vs SDK | Status |
|-------|---------------|--------|
| `agent_start` | `{}` | ✅ |
| `agent_end` | `{ messages, willRetry }` | ✅ |
| `turn_start` | `{ turnIndex, timestamp }` | ✅ |
| `turn_end` | `{ turnIndex, message, toolResults }` | ✅ |
| `message_start` | `{ message }` | ✅ |
| `message_update` | `{ message, assistantMessageEvent }` | ✅ |
| `message_end` | `{ message }` | ✅ |
| `tool_execution_start` | `{ toolCallId, toolName, args }` | ✅ |
| `tool_execution_update` | `{ toolCallId, toolName, partialResult }` | ✅ |
| `tool_execution_end` | `{ toolCallId, toolName, result, isError }` | ✅ |
| `queue_update` | `{ steering, followUp }` | ✅ |
| `compaction_start` | `{ reason }` | ✅ |
| `compaction_end` | `{ reason, result, aborted, willRetry, errorMessage? }` | ✅ |
| `auto_retry_start` | `{ attempt, maxAttempts, delayMs, errorMessage }` | ✅ |
| `auto_retry_end` | `{ success, attempt, finalError? }` | ✅ |
| `session_info_changed` | `{ name: string \| undefined }` | ✅ Fixed |
| `thinking_level_changed` | `{ level }` | ✅ |

### WebSocket Commands (16 commands) — All Match ✅

| Command | SDK Method | Status |
|---------|-----------|--------|
| `auth` | Backend security | ✅ |
| `prompt` | `session.prompt()` | ✅ |
| `abort` | `session.abort()` | ✅ |
| `new_session` | `runtime.newSession()` | ✅ |
| `switch_session` | `runtime.switchSession()` | ✅ |
| `fork` | `runtime.fork()` | ✅ |
| `clone` | `runtime.fork(getLeafId(), { position: "at" })` | ✅ |
| `compact` | `session.compact()` | ✅ |
| `navigate_tree` | `session.navigateTree()` | ✅ |
| `set_model` | `modelRegistry.find()` + `session.setModel()` | ✅ |
| `set_thinking_level` | `session.setThinkingLevel()` | ✅ |
| `set_session_name` | `session.setSessionName()` | ✅ |
| `get_fork_messages` | `session.getUserMessagesForForking()` | ✅ |
| `get_messages` | `session.messages` | ✅ |
| `get_last_assistant_text` | `session.getLastAssistantText()` | ✅ |
| `extension_ui_response` | Extension UI protocol | ✅ |

### Command Response Shapes (12 responses) — All Match ✅

| Command | Design | SDK | Status |
|---------|--------|-----|--------|
| `new_session` | `{ cancelled }` | `{ cancelled }` | ✅ |
| `switch_session` | `{ cancelled }` | `{ cancelled }` | ✅ |
| `fork` | `{ cancelled, selectedText? }` | `{ cancelled, selectedText? }` | ✅ |
| `clone` | `{ cancelled }` | `{ cancelled }` | ✅ Fixed |
| `compact` | `{ summary, firstKeptEntryId, tokensBefore, details? }` | `CompactionResult` | ✅ |
| `navigate_tree` | `{ editorText?, cancelled, aborted?, summaryEntry? }` | `{ editorText?, cancelled, aborted?, summaryEntry? }` | ✅ |
| `set_model` | `{ model }` | `Model<any>` | ✅ |
| `set_session_name` | `{ success: true }` | `void` | ✅ |
| `get_messages` | `{ messages: AgentMessage[] }` | `{ messages: AgentMessage[] }` | ✅ |
| `get_last_assistant_text` | `{ text: string \| undefined }` | `string \| undefined` | ✅ Fixed |
| `get_fork_messages` | `{ messages: { entryId, text }[] }` | `{ messages: { entryId, text }[] }` | ✅ |
| `extension_ui_response` | `{ success: true }` | N/A | ✅ |

### REST API (4 endpoints) — All Match ✅

| Endpoint | SDK Method | Status |
|----------|-----------|--------|
| `GET /api/models` | `modelRegistry.getAvailable()` | ✅ |
| `GET /api/commands` | Extension commands + prompt templates | ✅ |
| `GET /api/sessions/:id/stats` | `session.getSessionStats()` | ✅ |
| `GET /api/health` | Backend health check | ✅ |

### Key SDK Patterns (10 patterns) — All Correct ✅

| Pattern | SDK Method | Status |
|---------|-----------|--------|
| `bindExtensions()` after creation | `session.bindExtensions()` | ✅ |
| `bindExtensions()` after replacement | Required by SDK | ✅ |
| `setRebindSession()` | `runtime.setRebindSession(callback)` | ✅ |
| `runtime.dispose()` on close | `runtime.dispose(): Promise<void>` | ✅ |
| `runtime.diagnostics` reading | `diagnostics: readonly AgentSessionRuntimeDiagnostic[]` | ✅ |
| `modelFallbackMessage` display | `modelFallbackMessage: string \| undefined` | ✅ |
| `extensionsResult.errors` handling | `CreateAgentSessionResult.extensionsResult.errors` | ✅ |
| `settingsManager.drainErrors()` | `drainErrors(): SettingsError[]` | ✅ |
| `source: "rpc"` on prompts | `PromptOptions.source` | ✅ |
| `willRetry` on lifecycle events | `willRetry: boolean` | ✅ |

---

## What the Design Gets Right

1. **SDK embedding over RPC mode** — Zero IPC overhead, full type safety
2. **`AgentSessionRuntime` over `createAgentSession()`** — Supports session replacement
3. **Runtime factory pattern** — Closes over `AuthStorage` and `ModelRegistry`
4. **WebSocket with `ws` library** — Correct for bidirectional communication
5. **First-message auth** — Correct security pattern
6. **`prompt()` with `streamingBehavior`** — Unified steer/followUp approach
7. **Vue 3 + Pinia + Vite** — Solid modern SPA stack
8. **Tailwind CSS v4** — Zero-runtime CSS
9. **`marked` + `highlight.js` + `dompurify`** — Safe Markdown rendering
10. **JSONL session persistence** — Leverages pi's native format
11. **`DefaultResourceLoader` with cwd/agentDir** — Correct resource discovery
12. **`SettingsManager` with `drainErrors()`** — Per SDK docs
13. **`runtime.diagnostics` reading** — Per SDK docs
14. **`bindExtensions()` lifecycle** — Creation + session replacement
15. **`setRebindSession()`** — Automates re-subscribe + re-bind
16. **`runtime.dispose()` cleanup** — Correct async dispose pattern
17. **Full `assistantMessageEvent` passthrough** — Correct for streaming
18. **All 9 extension UI methods** — 4 dialog + 5 fire-and-forget
19. **3 `extension_ui_response` shapes** — Matching SDK union type
20. **`source: "rpc"` on prompts** — Correct for extension filtering
21. **`willRetry` on lifecycle events** — Correct for retry indicators
22. **`cancelled` on session replacement** — Correct for extension cancellation
23. **Phased implementation plan** — Logical progression
24. **Validation criteria** — Good testability with L1-L3 levels
25. **File structure** — Clean separation of concerns
26. **`CompactionResult` shape** — Matches SDK exactly
27. **`turn_end` with `toolResults`** — Matches SDK `TurnEndEvent`
28. **`get_last_assistant_text` returns `undefined`** — Fixed to match SDK
29. **`clone` without `selectedText`** — Fixed to match SDK
30. **`session_info_changed` uses `undefined`** — Fixed to match SDK

---

## Issues Noted (No Action Required)

1. **`session_info` missing some `RpcSessionState` fields** — Frontend can derive these from other events
2. **`extension_error` event not in SDK** — Custom backend event, reasonable shape
3. **`getAvailableThinkingLevels()` not a REST endpoint** — WebSocket-side calls are correct
4. **`withSession` callback not documented** — Not needed for web chat app

---

## Overall Assessment

**The design document is fully aligned with the SDK and ready for implementation.**

All 9 issues across 2 audit rounds have been resolved. The protocol accurately reflects the SDK's API surface for:
- All 17+ event types
- All 16+ WebSocket commands  
- All 12+ command response shapes
- All 4 REST endpoints
- All 10+ key SDK patterns

**Recommendation: Proceed with implementation.**
