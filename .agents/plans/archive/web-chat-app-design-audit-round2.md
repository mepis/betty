# Audit Report: Web Chat App Design Document (Round 2 — Fresh Review)

**Document audited:** `.agents/plans/web-chat-app-design.md`
**Date:** 2026-06-03
**Auditor:** pi coding agent — fresh review against pi SDK source types
**SDK version:** Current installed (`@earendil-works/pi-coding-agent` in `/home/jon/.local/lib/node_modules/`)
**Status:** Design is clean and ready for implementation

---

## Executive Summary

This is a fresh audit of the design document against the actual SDK type definitions (`agent-session.d.ts`, `agent-session-runtime.d.ts`, `extensions/types.d.ts`, `rpc-types.d.ts`, `session-manager.d.ts`, `settings-manager.d.ts`, `model-registry.d.ts`, `auth-storage.d.ts`, `compaction/compaction.d.ts`).

**All issues from the prior audit have been resolved.** This round found and fixed 3 additional issues:
1. `session_info_changed` event: `name: string | null` → `name: string | undefined` (matching SDK)
2. `get_last_assistant_text` response type: `string | null` → `string | undefined` (matching SDK)
3. `clone` response: removed spurious `selectedText` field (SDK's `fork()` with `position: "at"` does not return `selectedText`)

**Risk level: Low** — The design document is now accurately aligned with the SDK's API surface.

---

## Round 1 Issues — All Resolved ✓

All 6 issues from the prior audit were already fixed or were already addressed:

| # | Issue | Status | Verification |
|---|-------|--------|--------------|
| 1 | `fork` response missing `selectedText` | ✅ Fixed | Response shapes section includes `selectedText?: string` |
| 2 | `navigate_tree` missing `replaceInstructions`/`label` | ✅ Fixed | Payload includes both fields |
| 3 | `turn_start` missing `turnIndex`/`timestamp` | ✅ Fixed | Event data includes both fields |
| 4 | Missing `compact` command | ✅ Fixed | Command in WSCommand type, protocol, and handler |
| 5 | `setRebindSession()` not used | ✅ Fixed | Documented in command handler with implementation details |
| 6 | `getAvailableThinkingLevels()` not documented | ✅ Fixed | Settings panel task documents filtering by this method |

---

## Round 2 Issues — Fixed ✓

### 1. `session_info_changed` Event Type

**Issue:** Design said `name: string | null` but SDK returns `name: string | undefined`.

```typescript
// Design (before fix):
{ type: 'session_info_changed', data: { name: string | null } }

// SDK (AgentSessionEvent.session_info_changed):
{ type: "session_info_changed"; name: string | undefined }
```

**Fix:** Changed to `string | undefined` with SDK reference comment.

### 2. `get_last_assistant_text` Response Type

**Issue:** Design said `string | null` but SDK returns `string | undefined`.

```typescript
// Design (before fix):
{ type: 'response', command: 'get_last_assistant_text', success: true, data: { text: string | null } }

// SDK (AgentSession.getLastAssistantText):
getLastAssistantText(): string | undefined
```

**Fix:** Changed to `string | undefined` with SDK reference comment.

### 2. `clone` Response Missing `selectedText`

**Issue:** Design included `selectedText?: string` in clone response, but `clone` uses `fork()` with `position: "at"` which does NOT return `selectedText`.

```typescript
// Design (before fix):
{ type: 'response', command: 'clone', success: true, data: { cancelled: boolean, selectedText?: string } }

// SDK (AgentSessionRuntime.fork with position: "at"):
fork(entryId: string, options?: { position?: "before" | "at" }): Promise<{ cancelled: boolean; selectedText?: string }>
// Note: selectedText is only populated for actual forks (position: "before"), not clones (position: "at")
```

The RPC protocol also confirms: clone response is `{ cancelled: boolean }` without `selectedText`.

**Fix:** Removed `selectedText` from clone response, added comment explaining the distinction.

---

## Comprehensive SDK Verification (All Items)

### AgentSession Events — All Match ✅

| Event | Design | SDK | Status |
|-------|--------|-----|--------|
| `agent_start` | `{}` | `{}` | ✅ |
| `agent_end` | `{ messages, willRetry }` | `{ messages, willRetry }` | ✅ |
| `turn_start` | `{ turnIndex, timestamp }` | `{ turnIndex, timestamp }` | ✅ |
| `turn_end` | `{ turnIndex, message, toolResults }` | `{ turnIndex, message, toolResults }` | ✅ |
| `message_start` | `{ message }` | `{ message }` | ✅ |
| `message_update` | `{ message, assistantMessageEvent }` | `{ message, assistantMessageEvent }` | ✅ |
| `message_end` | `{ message }` | `{ message }` | ✅ |
| `tool_execution_start` | `{ toolCallId, toolName, args }` | `{ toolCallId, toolName, args }` | ✅ |
| `tool_execution_update` | `{ toolCallId, toolName, partialResult }` | `{ toolCallId, toolName, partialResult }` | ✅ |
| `tool_execution_end` | `{ toolCallId, toolName, result, isError }` | `{ toolCallId, toolName, result, isError }` | ✅ |
| `queue_update` | `{ steering, followUp }` | `{ steering, followUp }` | ✅ |
| `compaction_start` | `{ reason }` | `{ reason }` | ✅ |
| `compaction_end` | `{ reason, result, aborted, willRetry, errorMessage? }` | `{ reason, result, aborted, willRetry, errorMessage? }` | ✅ |
| `auto_retry_start` | `{ attempt, maxAttempts, delayMs, errorMessage }` | `{ attempt, maxAttempts, delayMs, errorMessage }` | ✅ |
| `auto_retry_end` | `{ success, attempt, finalError? }` | `{ success, attempt, finalError? }` | ✅ |
| `session_info_changed` | `{ name }` | `{ name }` | ✅ |
| `thinking_level_changed` | `{ level }` | `{ level }` | ✅ |

### Extension Events — All Match ✅

| Event | Design | SDK | Status |
|-------|--------|-----|--------|
| `extension_error` | `{ extensionPath, event, error, stack? }` | Custom backend event (not SDK) | ✅ Reasonable |
| `extension_ui_request` | All 9 methods documented | 4 dialog + 5 fire-and-forget | ✅ |
| `extension_ui_response` | 3 shapes (value/confirmed/cancelled) | `RpcExtensionUIResponse` union | ✅ |

### Session Management Events — All Match ✅

| Event | Design | SDK | Status |
|-------|--------|-----|--------|
| `session_info` | `{ sessionId, sessionFile, model, thinkingLevel, sessionName? }` | Subset of `RpcSessionState` | ✅ |
| `session_changed` | `{}` | Custom backend event | ✅ |

### WebSocket Commands — All Match ✅

| Command | Design | SDK | Status |
|---------|--------|-----|--------|
| `auth` | `{ secret }` | Backend security | ✅ |
| `prompt` | `{ text, streamingBehavior? }` | `prompt(text, options)` | ✅ |
| `abort` | `{}` | `abort()` | ✅ |
| `new_session` | `{ parentSession? }` | `newSession(options)` | ✅ |
| `switch_session` | `{ sessionPath, cwdOverride? }` | `switchSession(path, options)` | ✅ |
| `fork` | `{ entryId, position? }` | `fork(entryId, options)` | ✅ |
| `clone` | `{}` | `fork(getLeafId(), { position: "at" })` | ✅ |
| `compact` | `{ customInstructions? }` | `compact(customInstructions)` | ✅ |
| `navigate_tree` | `{ targetId, summarize?, customInstructions?, replaceInstructions?, label? }` | `navigateTree(targetId, options)` | ✅ |
| `set_model` | `{ provider, modelId }` | `setModel(modelRegistry.find())` | ✅ |
| `set_thinking_level` | `{ level }` | `setThinkingLevel(level)` | ✅ |
| `set_session_name` | `{ name }` | `setSessionName(name)` | ✅ |
| `get_fork_messages` | `{}` | `getUserMessagesForForking()` | ✅ |
| `get_messages` | `{}` | `messages` | ✅ |
| `get_last_assistant_text` | `{}` | `getLastAssistantText()` | ✅ |
| `extension_ui_response` | 3 shapes | `RpcExtensionUIResponse` | ✅ |

### Command Response Shapes — All Match ✅

| Command | Design | SDK | Status |
|---------|--------|-----|--------|
| `new_session` | `{ cancelled }` | `{ cancelled }` | ✅ |
| `switch_session` | `{ cancelled }` | `{ cancelled }` | ✅ |
| `fork` | `{ cancelled, selectedText? }` | `{ cancelled, selectedText? }` | ✅ |
| `clone` | `{ cancelled }` | `{ cancelled }` | ✅ |
| `compact` | `{ summary, firstKeptEntryId, tokensBefore, details? }` | `CompactionResult` | ✅ |
| `navigate_tree` | `{ editorText?, cancelled, aborted?, summaryEntry? }` | `{ editorText?, cancelled, aborted?, summaryEntry? }` | ✅ |
| `set_model` | `{ model }` | `Model<any>` | ✅ |
| `set_session_name` | `{ success: true }` | `void` | ✅ |
| `get_messages` | `{ messages: AgentMessage[] }` | `{ messages: AgentMessage[] }` | ✅ |
| `get_last_assistant_text` | `{ text: string \| undefined }` | `string \| undefined` | ✅ Fixed |
| `get_fork_messages` | `{ messages: { entryId, text }[] }` | `{ messages: { entryId, text }[] }` | ✅ |
| `extension_ui_response` | `{ success: true }` | N/A (fire-and-forget) | ✅ |

### REST API — All Match ✅

| Endpoint | Design | SDK | Status |
|----------|--------|-----|--------|
| `GET /api/models` | `modelRegistry.getAvailable()` | `getAvailable(): Model<Api>[]` | ✅ |
| `GET /api/commands` | `resourceLoader.getPrompts()` + extensions | Extension commands + prompt templates | ✅ |
| `GET /api/sessions/:id/stats` | `session.getSessionStats()` | `getSessionStats(): SessionStats` | ✅ |
| `GET /api/health` | `{ status: "ok" }` | Backend health check | ✅ |

### Key SDK Patterns — All Correct ✅

| Pattern | Design | SDK | Status |
|---------|--------|-----|--------|
| `bindExtensions()` after creation | ✅ | Required | ✅ |
| `bindExtensions()` after replacement | ✅ | Required | ✅ |
| `setRebindSession()` | ✅ | `setRebindSession(callback)` | ✅ |
| `runtime.dispose()` on close | ✅ | `dispose(): Promise<void>` | ✅ |
| `runtime.diagnostics` reading | ✅ | `diagnostics: readonly AgentSessionRuntimeDiagnostic[]` | ✅ |
| `modelFallbackMessage` display | ✅ | `modelFallbackMessage: string \| undefined` | ✅ |
| `extensionsResult.errors` handling | ✅ | `CreateAgentSessionResult.extensionsResult.errors` | ✅ |
| `settingsManager.drainErrors()` | ✅ | `drainErrors(): SettingsError[]` | ✅ |
| `source: "rpc"` on prompts | ✅ | `PromptOptions.source` | ✅ |
| `willRetry` on `agent_end` | ✅ | `willRetry: boolean` | ✅ |
| `cancelled` on session replacement | ✅ | `{ cancelled: boolean }` | ✅ |

---

## Issues Noted (No Action Required)

### 1. `session_info` Missing Some `RpcSessionState` Fields

The design's `session_info` event includes `{ sessionId, sessionFile, model, thinkingLevel, sessionName? }` but `RpcSessionState` has additional fields: `isStreaming`, `isCompacting`, `steeringMode`, `followUpMode`, `autoCompactionEnabled`, `messageCount`, `pendingMessageCount`.

**Status:** No action needed. The frontend can derive `isStreaming` from `agent_start`/`agent_end`, `isCompacting` from `compaction_start`/`compaction_end`, and queue state from `queue_update`. Adding all fields would bloat the event without significant benefit.

### 2. `extension_error` Event Not in SDK

The `extension_error` event is a custom backend event, not a direct SDK event. It's derived from the `onError` listener in `bindExtensions()`.

**Status:** No action needed. The design's shape (`extensionPath`, `event`, `error`, `stack?`) is reasonable for relay purposes.

### 3. `getAvailableThinkingLevels()` Not a REST Endpoint

The design calls `getAvailableThinkingLevels()` on the WebSocket side (per session/model change), not as a REST endpoint. This is the correct approach since it's session-specific.

**Status:** No action needed. WebSocket-side calls are appropriate for session-scoped queries.

### 4. `withSession` Callback Not Documented

The SDK's `newSession()`, `switchSession()`, and `fork()` accept a `withSession` callback for post-replacement actions. The design doesn't document this.

**Status:** No action needed. The web chat app doesn't need to interact with the new session immediately after creation — the frontend will receive `session_changed` and `get_messages` to populate state.

---

## What the Design Gets Right (Confirmed)

1. **SDK embedding over RPC mode** — Correct for same-language integration
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

---

## Summary of Changes in This Round

| # | Location | Change |
|---|----------|--------|
| 1 | Server Events (`session_info_changed`) | `name: string \| null` → `name: string \| undefined` |
| 2 | Command Response Shapes (`get_last_assistant_text`) | `string \| null` → `string \| undefined` |
| 3 | Command Response Shapes (`clone`) | Removed `selectedText?: string` |

---

## Overall Assessment

The design document is **fully aligned with the SDK** and ready for implementation. All critical and minor issues have been resolved across two audit rounds. The protocol accurately reflects the SDK's API surface for:

- All 17+ event types
- All 16+ WebSocket commands
- All 12+ command response shapes
- All 4 REST endpoints
- All key SDK patterns (lifecycle, error handling, session management)

**Risk level: Low.** The design is comprehensive, accurate, and actionable.

**Recommendation: Proceed with implementation.**
