# Audit Report: Web Chat App Design Document (Fresh Review)

**Document audited:** `.agents/plans/web-chat-app-design.md`
**Date:** 2026-06-03
**Auditor:** pi coding agent — fresh review against pi SDK source types
**SDK version:** Current installed (`@earendil-works/pi-coding-agent` in `/home/jon/.local/lib/node_modules/`)
**Status:** Design is well-aligned with SDK. All prior critical issues are resolved. Minor gaps remain.

---

## Executive Summary

This is a fresh audit of the design document against the actual SDK type definitions (`agent-session.d.ts`, `agent-session-runtime.d.ts`, `extensions/types.d.ts`, `rpc-types.d.ts`, `session-manager.d.ts`, `settings-manager.d.ts`, `model-registry.d.ts`, `auth-storage.d.ts`).

**All 5 critical issues from the prior audit have been resolved.** The design document now accurately reflects the SDK's API surface for:
- `bindExtensions()` lifecycle (creation + session replacement)
- `runtime.dispose()` cleanup pattern
- `message_update` event structure (full `assistantMessageEvent` passthrough)
- All 9 extension UI methods (4 dialog + 5 fire-and-forget)
- `extension_ui_response` response shapes (3 distinct types)

**Risk level: Low-Medium** — A few minor gaps in event/command completeness and one missing command will not cause implementation failures but should be addressed.

---

## Prior Issues — All Resolved ✓

| # | Issue | Status | Verification |
|---|-------|--------|-------------|
| 1 | Missing `bindExtensions()` | ✅ Fixed | Task 2.1 documents `bindExtensions({ uiContext, onError, commandContextActions })` after runtime creation AND after every session replacement. Matches SDK `ExtensionBindings` interface. |
| 2 | Wrong cleanup pattern | ✅ Fixed | Task 2.1 uses `await runtime.dispose()` on WebSocket close. Matches `AgentSessionRuntime.dispose(): Promise<void>`. |
| 3 | Incomplete `message_update` | ✅ Fixed | Section 6 passes through full `assistantMessageEvent` object with `partial`, `toolCall`, `reason` fields. Matches `MessageUpdateEvent` SDK type. |
| 4 | Missing fire-and-forget methods | ✅ Fixed | Section 6 includes all 9 methods: `select`, `confirm`, `input`, `editor`, `notify`, `setStatus`, `setWidget`, `setTitle`, `set_editor_text`. Matches `RpcExtensionUIRequest` union type. |
| 5 | Wrong `extension_ui_response` shape | ✅ Fixed | Section 6 defines 3 distinct shapes matching `RpcExtensionUIResponse`: `{value}`, `{confirmed}`, `{cancelled}`. |

---

## Issues Verified as Correct (Previously Flagged, Now Confirmed)

| # | Issue | Status | Verification Against SDK |
|---|-------|--------|-------------------------|
| 6 | `session_info_changed` / `thinking_level_changed` events | ✅ Correct | Design includes both events. SDK: `{ type: "session_info_changed"; name: string \| undefined }` and `{ type: "thinking_level_changed"; level: ThinkingLevel }`. |
| 7 | `compaction_end` with `willRetry`/`errorMessage` | ✅ Correct | Design: `{ reason, result, aborted, willRetry, errorMessage? }`. SDK: identical structure. |
| 8 | `auto_retry_start` with `delayMs` | ✅ Correct | Design includes `delayMs`. SDK: `delayMs: number`. |
| 9 | `auto_retry_end` with `finalError` | ✅ Correct | Design includes `finalError?`. SDK: `finalError?: string`. |
| 10 | `agent_end` with `willRetry` | ✅ Correct | Design: `{ messages, willRetry }`. SDK: `{ type: "agent_end"; messages: AgentMessage[]; willRetry: boolean }`. |
| 11 | `fork`/`new_session` with `cancelled` | ✅ Correct | Design mentions `cancelled` in response. SDK: `Promise<{ cancelled: boolean }>`. |
| 12 | `clone` command | ✅ Correct | Design: `runtime.fork(runtime.session.getLeafId(), { position: "at" })`. Matches RPC `clone` command. |
| 13 | `navigateTree()` support | ✅ Correct | Design includes `navigate_tree` command with `targetId`, `summarize`, `customInstructions`. |
| 14 | `source: "rpc"` on prompt | ✅ Correct | Task 2.3: `source: "rpc"` on all `prompt()` calls. Matches `PromptOptions.source`. |
| 15 | `modelRegistry.getAvailable()` synchronous | ✅ Correct | Design treats as REST endpoint. SDK: `getAvailable(): Model<Api>[]` (synchronous). |
| 16 | `settingsManager.drainErrors()` | ✅ Correct | Task 2.1 and 2.4 document periodic `drainErrors()` calls. SDK docs: "Use drainErrors() and report them in your app layer." |
| 17 | `runtime.diagnostics` handling | ✅ Correct | Task 2.1: "Read `runtime.diagnostics` after creation and relay to the frontend." SDK: `diagnostics: readonly AgentSessionRuntimeDiagnostic[]`. |
| 18 | `set_session_name` command | ✅ Correct | Design includes `set_session_name`. SDK: `session.setSessionName(name): void`. |
| 19 | `get_fork_messages` command | ✅ Correct | Design includes `get_fork_messages`. SDK: `session.getUserMessagesForForking(): Array<{ entryId, text }>`. |
| 20 | `get_messages` command | ✅ Correct | Design includes `get_messages`. SDK: `session.messages: AgentMessage[]`. |
| 21 | `get_last_assistant_text` command | ✅ Correct | Design includes `get_last_assistant_text`. SDK: `session.getLastAssistantText(): string \| undefined`. |

---

## Minor Issues (Should Fix Before Implementation)

### 1. `fork` Command Response Missing `selectedText`

The design documents the `fork` response with `cancelled` but omits `selectedText`:

```typescript
// Design:
{ cancelled: boolean }

// SDK (AgentSessionRuntime.fork):
Promise<{ cancelled: boolean; selectedText?: string }>
```

The `selectedText` field contains the text from the forked entry, which is useful for pre-filling the input area when navigating to a fork point. This is also returned by the RPC `fork` command response.

**Fix:** Add `selectedText?: string` to the `fork` response.

### 2. `navigate_tree` Command Missing `replaceInstructions` and `label` Options

The design includes `navigate_tree` with `targetId`, `summarize`, and `customInstructions`:

```typescript
// Design:
{ type: 'navigate_tree', payload: { targetId: string, summarize?: boolean, customInstructions?: string } }

// SDK (AgentSession.navigateTree):
navigateTree(targetId: string, options?: {
  summarize?: boolean;
  customInstructions?: string;
  replaceInstructions?: boolean;  // Missing in design
  label?: string;                 // Missing in design
}): Promise<{ editorText?: string; cancelled: boolean; aborted?: boolean; summaryEntry?: BranchSummaryEntry }>
```

The `replaceInstructions` option controls whether `customInstructions` replaces or appends to the default summarization prompt. The `label` option attaches a user-defined marker to the branch summary entry.

**Fix:** Add `replaceInstructions?: boolean` and `label?: string` to the `navigate_tree` payload.

### 3. `turn_start` Event Missing `turnIndex` and `timestamp`

The design defines `turn_start` with empty data:

```typescript
// Design:
{ type: 'turn_start', data: {} }

// SDK (TurnStartEvent):
{ type: "turn_start"; turnIndex: number; timestamp: number }
```

The `turnIndex` and `timestamp` fields are useful for tracking turn progression and debugging.

**Fix:** Add `turnIndex: number` and `timestamp: number` to the `turn_start` event.

### 4. Missing `compact` Command

The WebSocket protocol has no command for manual session compaction. The SDK supports it:

```typescript
// SDK:
session.compact(customInstructions?: string): Promise<CompactionResult>
```

The design mentions "Compaction events show 'Compacting conversation...' indicator" in Task 2.2, implying compaction is supported, but there's no way for the frontend to trigger it.

**Fix:** Add `compact` WebSocket command:
```typescript
{ type: 'compact', payload: { customInstructions?: string } }
```

### 5. `setRebindSession()` Not Used

The design mentions `setRebindSession()` in the notes (item 24) as a consideration but does not use it in the implementation tasks. The SDK provides:

```typescript
// SDK (AgentSessionRuntime):
setRebindSession(rebindSession?: (session: AgentSession) => Promise<void>): void
```

This method automates the re-subscribe + re-bind pattern after session replacement. Using it would simplify Task 2.1 and Task 2.2.

**Fix:** Consider using `setRebindSession()` to simplify the session replacement flow. Document the callback that re-subscribes to events and re-binds extensions.

### 6. `getAvailableThinkingLevels()` Not Documented for Settings Panel

The design lists all thinking levels (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`) in the settings panel. However, not all models support all levels. The SDK provides:

```typescript
// SDK:
session.getAvailableThinkingLevels(): ThinkingLevel[]
```

The frontend should call this to show only valid options for the current model.

**Fix:** Add `getAvailableThinkingLevels()` to the settings panel implementation. Filter the thinking level selector to only show levels returned by this method.

---

## Issues Noted (No Action Required)

### 1. `setBeforeSessionInvalidate()` Not Documented

The SDK provides `setBeforeSessionInvalidate(callback)` for synchronous UI teardown before session invalidation. This is primarily for TUI component cleanup and is not needed for a web chat app.

**Status:** No action needed. Web chat has no TUI components to tear down.

### 2. `model_select` / `thinking_level_select` Events Not in Protocol

The SDK emits `model_select` and `thinking_level_select` events when the model or thinking level changes. These are primarily for extension hooks, not core protocol events. The frontend already knows about its own changes and can handle `session_info_changed` for model changes.

**Status:** No action needed. These are extension-oriented events.

### 3. `get_state` RPC Command Not in WebSocket Protocol

The RPC protocol has a `get_state` command that returns the full `RpcSessionState` object. The WebSocket protocol achieves the same by combining `session_info` events with `get_messages` and `get_fork_messages` commands.

**Status:** No action needed. The WebSocket approach is more granular and flexible.

### 4. `ExtensionUIContext` Methods Not Relevant to Web

Several `ExtensionUIContext` methods are TUI-specific and not applicable to a web chat app:
- `setFooter()`, `setHeader()` — TUI component factories
- `custom()` — TUI overlay components
- `onTerminalInput()` — raw terminal input listener
- `setEditorComponent()` / `getEditorComponent()` — TUI editor component
- `setTheme()` / `getTheme()` / `getAllThemes()` — TUI theme management
- `getToolsExpanded()` / `setToolsExpanded()` — TUI tool output expansion

**Status:** No action needed. These are TUI-specific methods.

### 5. `importFromJsonl()` Not in Scope

The SDK provides `runtime.importFromJsonl(inputPath, cwdOverride?)` for importing external JSONL files. This is not in the design scope.

**Status:** No action needed. Import functionality is out of scope for a self-hosted single-user chat app.

---

## What the Design Gets Right (Confirmed)

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

## Summary of Required Changes

| Priority | Location | Change |
|----------|----------|--------|
| **Minor** | Section 6 (`fork` response) | Add `selectedText?: string` to fork response |
| **Minor** | Section 6 (`navigate_tree` command) | Add `replaceInstructions?: boolean` and `label?: string` |
| **Minor** | Section 6 (`turn_start` event) | Add `turnIndex: number` and `timestamp: number` |
| **Minor** | Section 6 (commands) | Add `compact` WebSocket command |
| **Minor** | Task 2.1 / 2.2 | Consider using `setRebindSession()` to simplify session replacement |
| **Minor** | Task 4.1 (Settings panel) | Use `getAvailableThinkingLevels()` to filter thinking level selector |

---

## Overall Assessment

The design document is **well-aligned with the SDK** and ready for implementation. All critical issues from the prior audit have been resolved. The remaining gaps are minor and will not cause implementation failures — they are primarily about completeness of event/command definitions rather than fundamental architectural issues.

**Recommendation:** Proceed with implementation. The minor issues can be addressed iteratively during development.
