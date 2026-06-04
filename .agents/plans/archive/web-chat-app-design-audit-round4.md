# Web Chat App Design Audit - Round 4

**Date:** 2026-06-03
**Status:** All issues fixed
**Comparison against:** pi SDK docs (sdk.md, extensions.md, rpc.md)

---

## Issues Fixed

### 1. `runtime.session.name` should be `runtime.session.getSessionName()`
**Severity: High**
**Files:** Milestone 2 Task 2.2.5 (`02-pi-sdk-integration.md`)
**Fix:** Changed `runtime.session.name` → `runtime.session.getSessionName()`. The SDK `AgentSession` interface has `sessionFile` and `sessionId` as direct properties, but `sessionName` is accessed via the `getSessionName()` method.

### 2. Missing `model_select` event in WebSocket protocol
**Severity: Medium**
**Files:** Design doc §6, Milestone 2 Task 2.2, Milestone 3 Task 3.3.7, Milestone 4 Completion Checklist
**Fix:** Added `model_select` event to the WebSocket protocol with shape:
```typescript
{ type: 'model_select', data: { model, provider, previousModel, previousProvider, source: 'set' | 'cycle' | 'restore' } }
```
Added event handler in Milestone 3's `ChatView.vue` event routing. Added to completion checklist in Milestone 4.

### 3. `setRebindSession()` may not exist as an SDK method
**Severity: Medium**
**Files:** Milestone 2 Task 2.2.3
**Fix:** Updated the task to note that `setRebindSession()` should be checked for existence. Added the manual re-subscription pattern from SDK docs as a fallback:
```typescript
// Manual pattern from SDK docs:
unsubscribe();
session = runtime.session;
unsubscribe = session.subscribe(eventHandler);
runtime.session.bindExtensions({ uiContext, onError, commandContextActions });
```

### 4. `cwdOverride` parameter in `switchSession()` is undocumented
**Severity: Low**
**Files:** Milestone 2 Task 2.3.6
**Fix:** Added a note that `cwdOverride` is a custom extension parameter and the SDK's `switchSession(sessionPath)` may not support it. Added fallback to `switchSession(sessionPath)` if `cwdOverride` is unsupported.

### 5. `get_session_stats` should use SDK built-in stats
**Severity: Low**
**Files:** Milestone 2 Task 2.4.4
**Fix:** Reordered the approach to prioritize SDK's built-in stats (preferred) with JSONL parsing as fallback. Added reference to RPC docs' `get_session_stats` response shape for guidance.

### 6. Duplicate acceptance criteria in Milestone 2
**Severity: Trivial**
**Files:** Milestone 2 Task 2.3 Acceptance Criteria
**Fix:** Removed duplicate line: "prompt with `streamingBehavior: 'followUp'` queues after agent finishes".

### 7. Duplicate acceptance criteria in Milestone 4
**Severity: Trivial**
**Files:** Milestone 4 Task 4.1 Acceptance Criteria
**Fix:** Removed duplicate line: "Thinking level changes take effect on next prompt".

### 8. Missing `break;` after `thinking_level_changed` case in frontend event handler
**Severity: Medium**
**Files:** Milestone 3 Task 3.3.7
**Fix:** Added missing `break;` statement after the `thinking_level_changed` case in the `handleEvent` switch. Without this, the handler would fall through to `extension_ui_request`, causing incorrect behavior.

---

## Files Modified

| File | Changes |
|------|---------|  
| `web-chat-app-design.md` | Added `model_select` event to protocol, event types list, and validation criteria |
| `02-pi-sdk-integration.md` | 8 fixes: `getSessionName()`, `model_select` event handler, `setRebindSession()` fallback, `cwdOverride` note, `get_session_stats` approach, duplicate acceptance criteria removal, event types table update |
| `03-frontend-chat-interface.md` | Added `model_select` handler, fixed missing `break;` after `thinking_level_changed` case |
| `04-settings-and-polish.md` | Removed duplicate acceptance criteria, added `model_select` to completion checklist |

---

## Remaining Notes

### `setRebindSession()` Verification
The implementation should verify whether `runtime.setRebindSession()` exists in the installed SDK version. If not, the manual re-subscription pattern (added to Task 2.2.3) should be used. The SDK docs show the manual pattern: `unsubscribe()`, reassign `session = runtime.session`, `unsubscribe = session.subscribe(eventHandler)`, and re-bind extensions.

### `cwdOverride` Verification
The `cwdOverride` parameter in `switchSession()` is a custom extension. The implementation should verify this parameter is supported by the SDK's `AgentSessionRuntime.switchSession()` method. If not, it should be removed or implemented as a separate feature. The RPC docs only show `switchSession(sessionPath)` without additional parameters.

### `get_session_stats` Implementation
The SDK's built-in stats method should be verified. The RPC docs show `get_session_stats` returns detailed stats (tokens, cost, context usage). The implementation should check if `AgentSession` or `AgentSessionRuntime` exposes a similar method. If not, the JSONL parsing fallback should be used.

### `model_select` Event Source
The `model_select` event comes from the SDK's extension event system (see `pi.on("model_select", ...)` in extensions.md). The backend should subscribe to this event on the session and relay it to the frontend. The event payload includes `model`, `previousModel`, and `source` (`"set" | "cycle" | "restore"`) fields as documented in the extensions.md docs.
