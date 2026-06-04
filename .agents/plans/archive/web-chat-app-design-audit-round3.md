# Web Chat App Design Audit — Round 3

**Date:** 2026-06-03  
**Status:** All critical issues fixed  
**Comparison against:** pi SDK docs (sdk.md, extensions.md, rpc.md)

---

## Issues Fixed

### 1. `modelRegistry.getAvailable()` is async (was marked synchronous)
**Severity:** Critical  
**Files:** Design doc §2.4, §7; Milestone 2 Tasks 2.4.1, 2.4.9, Additional Info, Acceptance Criteria, Common Pitfalls  
**Fix:** Changed all references from "synchronous" to "async", added `await` to all calls.

### 2. `runtime.session.model.name` doesn't exist on SDK `Model` type
**Severity:** Critical  
**Files:** Milestone 2 Task 2.2.5 (session_info event)  
**Fix:** Changed to `runtime.session.model.id`. The SDK `Model` type has `id` and `provider`, not `name`.

### 3. `navigateTree()` return type was wrong
**Severity:** Critical  
**Files:** Design doc §6 (navigate_tree response), §9 (Notes), Milestone 2 Task 2.3.9  
**Fix:** Removed `aborted` and `summaryEntry` from return type. SDK only returns `{ editorText?, cancelled: boolean }`.

### 4. `fork()` response used wrong field name
**Severity:** Critical  
**Files:** Design doc §6 (fork response, fork command description, clone response), Milestone 2 Task 2.3.7, Additional Info  
**Fix:** Changed `selectedText` → `text` everywhere to match RPC protocol.

### 5. `getAvailableThinkingLevels()` doesn't exist on `AgentSession`
**Severity:** High  
**Files:** Design doc §4.1.3; Milestone 2 Task 2.2.2; Milestone 3 Task 3.3.7; Milestone 4 Tasks 4.1.3, 4.1.8, Additional Info  
**Fix:** Removed all references to this method. Added notes explaining that available thinking levels are determined by the model's `reasoning` property (reasoning models support off/minimal/low/medium/high/xhigh; non-reasoning models always use 'off').

### 6. `runtime.session.id` should be `runtime.session.sessionId`
**Severity:** High  
**Files:** Milestone 2 Task 2.2.5  
**Fix:** Changed `runtime.session.id` → `runtime.session.sessionId`.

### 7. `modelRegistry.find()` return type
**Severity:** Medium  
**Files:** Design doc §2.3.14; Milestone 2 Task 2.3.14  
**Fix:** Changed `Model<any>` → `Model | undefined` with null checks.

### 8. `getLastAssistantText()` returns `null` not `undefined`
**Severity:** Medium  
**Files:** Design doc §6 (get_last_assistant_text response)  
**Fix:** Updated response shape to `{ text: string | null }`.

### 9. `compaction_end.result` is `null` not `undefined`
**Severity:** Low  
**Files:** Design doc §6; Milestone 2 Additional Info  
**Fix:** Changed "undefined (not null)" to "null".

### 10. Model listing should use `id` not `name`
**Severity:** Low  
**Files:** Design doc §2.4 Acceptance Criteria; Milestone 2 Acceptance Criteria; Milestone 4 Additional Info  
**Fix:** Changed "provider, name" to "provider, id" in model listing descriptions.

---

## Files Modified

| File | Changes |
|------|---------|
| `web-chat-app-design.md` | 13 fixes across §2.4, §6, §7, §9 |
| `01-project-scaffolding-and-backend-foundation.md` | No changes needed |
| `02-pi-sdk-integration.md` | 12 fixes across Tasks 2.2.2, 2.2.5, 2.3.7, 2.3.9, 2.3.13, 2.3.14, 2.4.1, 2.4.9, Additional Info, Acceptance Criteria, Common Pitfalls |
| `03-frontend-chat-interface.md` | 1 fix in Task 3.3.7 |
| `04-settings-and-polish.md` | 4 fixes in Tasks 4.1.2, 4.1.3, 4.1.8, Additional Info |

---

## Archive Files (Historical Records)

The following files in `archive/` contain outdated audit findings from previous rounds. They are historical records and were not modified:

- `web-chat-app-design-audit.md` — Initial audit (Round 1)
- `web-chat-app-design-audit-round2.md` — Second audit round
- `web-chat-app-design-audit-final.md` — Final audit from previous cycle
- `web-chat-app-review.md` — General review notes

These files reference issues that have since been fixed. They serve as a changelog of the evolution of the design.

---

## Remaining Notes

### Extension UI Context Method Count
The design doc lists 15 methods for `ExtensionUIContext` but the RPC protocol defines 9. Several methods (`setWorkingMessage`, `setWorkingVisible`, `setWorkingIndicator`, `setHiddenThinkingLabel`, `pasteToEditor`, `getEditorText`) are explicitly marked as no-ops or degraded in RPC mode. This is acceptable since the web app runs in RPC mode and these methods will be no-ops.

### `thinking_level_changed` Event Source
The `thinking_level_changed` event in the design doc should clarify it comes from the SDK's `thinking_level_select` event, not a custom event. The event payload uses `event.level` which matches the SDK's `AgentSessionEvent` type.

### `get_commands` Response Shape
The design doc's `get_commands` response shows `path` as a top-level field. The RPC docs show `path` is optional and nested within `sourceInfo`. This is a minor discrepancy that may need clarification.

### `set_model` Response Data
The design doc's `set_model` response was updated to return the Model object directly (not wrapped in a `model` field), matching the RPC protocol.
