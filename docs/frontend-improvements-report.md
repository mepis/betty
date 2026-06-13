# Frontend Chat Interface Improvements Report

**Date:** 2026-06-12
**Based on:** Opencode.ai Web UI analysis (library/topics/opencode-web-ui-chat-message-handling/)
**Target:** Betty frontend (`src/frontend/`)

---

## Executive Summary

This report compares how Opencode.ai handles chat messages in its web UI against Betty's current frontend implementation. Opencode's approach is significantly more sophisticated, leveraging Solid.js stores with binary search, a rich part-based message system, virtualized rendering, context tool grouping, paced text streaming, and intelligent auto-scroll. Betty's current implementation is functional but lacks many UX refinements that directly impact perceived performance, readability, and information density.

**Key findings:** 12 improvement areas identified across 5 categories. The highest-impact, lowest-effort wins are: (1) paced text streaming, (2) context tool grouping, (3) virtualized rendering for long sessions, and (4) improved auto-scroll with gesture detection.

---

## 1. Message Architecture

### Opencode: Part-Based Composition

Opencode uses a **part-based message model** where each message is an array of typed `Part[]` objects. There are 11 part types:

| Part Type | Purpose |
|---|---|
| `TextPart` | Markdown text content |
| `ReasoningPart` | Chain-of-thought reasoning with timing |
| `ToolPart` | Tool invocations with 4 states (pending, running, completed, error) |
| `FilePart` | File attachments with mime type and source |
| `SubtaskPart` | Subtask delegation |
| `StepStartPart` / `StepFinishPart` | Step boundaries |
| `SnapshotPart` | Filesystem snapshot reference |
| `PatchPart` | File patch with hash |
| `AgentPart` | Agent reference |
| `RetryPart` | Retry attempts |
| `CompactionPart` | Context compaction marker |

Each part type has a **dedicated renderer** dispatched via `PART_MAPPING`. Tool calls further dispatch to a `ToolRegistry` with 12+ specialized renderers (read, list, glob, grep, webfetch, websearch, task, bash, edit, write, apply_patch, todowrite, question, skill).

### Betty: Flat Content Blocks

Betty uses a **flat content block** model with inline `v-html` rendering:
- `thinking` blocks (collapsible)
- `text` blocks (markdown via `renderMarkdown()`)
- `toolCall` blocks (collapsible, JSON.stringify'd arguments)
- `image` blocks (for user messages)

**Gap:** Tool calls are rendered as raw JSON dumps. No distinction between tool states (pending/running/completed/error). No specialized rendering per tool type.

---

## 2. Streaming Behavior

### Opencode: Paced Text Rendering

```typescript
const TEXT_RENDER_PACE_MS = 24
const TEXT_RENDER_SNAP = /[\s.,!?;:)\]]/
```

Text streams at ~24ms intervals, **snapping to word/sentence boundaries**. Steps increase with remaining text size (2, 4, 8, 16, 24 chars). This creates a natural reading rhythm instead of a wall-of-text dump.

### Betty: Immediate Full Render

Betty appends delta text directly to `streamingMsg.value.content` and re-renders the entire message via `v-html` on every delta. The streaming cursor blinks, but there's no pacing — text appears as fast as the server sends it.

**Improvement:** Implement paced text rendering with word-boundary snapping. Buffer incoming deltas and release them at ~24ms intervals.

---

## 3. Auto-Scroll

### Opencode: Intelligent Scroll Management

- **Bottom anchor detection:** `scrollHeight - clientHeight - scrollTop <= 4`
- **90-frame grace period:** After content changes, keeps scroll locked for 90 animation frames
- **12-frame hold during active turn:** Extends lock while model is working
- **Gesture detection:** Distinguishes user scroll from auto-scroll via wheel/touch/pointer events
- **Resume button:** Floating "jump to bottom" button when scrolled away during active turn

### Betty: Naive Scroll-to-Bottom

```javascript
function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
    }
  });
}
```

Called on every message length change and streaming content change. No gesture detection — if a user scrolls up to read, the next delta forces them back to bottom.

**Improvement:** Implement gesture-aware auto-scroll with a resume-to-bottom floating button.

---

## 4. Virtualized Rendering

### Opencode: Virtualizer with Row Cache

Uses `virtua/solid` Virtualizer with a **row cache** (16 sessions). Only visible rows are rendered. Rows are compared by key and reused when equal to avoid re-rendering.

Row types include: `CommentStrip`, `UserMessage`, `TurnDivider`, `AssistantPart`, `Thinking`, `DiffSummary`, `Error`, `Retry`, `BottomSpacer`.

### Betty: Full DOM Render

All messages are rendered in the DOM via `v-for`. For long sessions (100+ messages), this creates performance issues as every message component stays mounted and reactive.

**Improvement:** Implement virtualized rendering for the message list. At minimum, render only messages within the viewport plus a buffer zone.

---

## 5. Context Tool Grouping

### Opencode: Collapsed Context Tools

```typescript
const CONTEXT_GROUP_TOOLS = new Set(["read", "glob", "grep", "list"])
const HIDDEN_TOOLS = new Set(["todowrite"])
```

Consecutive context-gathering tools (read, glob, grep, list) are **collapsed into a single "Gathering Context" collapsible** with a summary like "3 reads, 2 searches, 1 list". This dramatically reduces visual noise.

### Betty: Individual Tool Blocks

Every tool call is rendered as its own collapsible block with JSON'd arguments. A sequence of 10 file reads produces 10 separate collapsible blocks.

**Improvement:** Group consecutive read/glob/grep/list tool calls into a single collapsible summary.

---

## 6. Real-Time Sync

### Opencode: Event-Driven with Binary Search

WebSocket events push real-time updates: `message.updated`, `message.part.updated`, `message.part.delta` (streaming), `session.status`, etc. An **event reducer** applies them to Solid.js stores using **binary search** for O(log n) upserts. Messages are sorted by ID.

### Betty: Event Forwarding with Array Push

Events from the RPC agent are forwarded directly to WebSocket clients. Messages are appended via `messages.value.push()`. No deduplication beyond simple ID checks. No binary search — uses `findIndex` (O(n)).

**Improvement:** For large sessions, switch to sorted arrays with binary search for message lookups.

---

## 7. Optimistic UI Updates

### Opencode: Immediate Render Before Server Confirmation

```typescript
session.addOptimisticMessage() — Creates a user message with generated ID
mergeOptimisticPage() — Reconciles optimistic items with server data
```

Messages are rendered immediately before server confirmation, then reconciled.

### Betty: Partial Optimistic Updates

Betty shows user messages immediately (good) but uses a separate `streamingMsg` ref for assistant responses during streaming, then merges them into the messages array on `agent_end`. This creates a brief visual discontinuity.

**Improvement:** Merge streaming messages into the main array immediately with a streaming flag, eliminating the separate `streamingMsg` ref pattern.

---

## 8. Thinking/Reasoning Display

### Opencode: Thinking Indicator with Heading Extraction

- `TextShimmer` component shows "Thinking..." animation
- **Extracts reasoning heading** from reasoning part text (markdown headings, bold text)
- Configurable via `showReasoningSummaries` setting
- Shows timing (start/end) for reasoning

### Betty: Collapsible Thinking Block

Thinking is rendered as a collapsible block with a "🧠 Thinking" header. No heading extraction, no timing, no shimmer animation during active reasoning.

**Improvement:** Add a shimmer/thinking animation during active reasoning. Extract and display reasoning headings. Show timing metadata.

---

## 9. Timeline Structure

### Opencode: User Messages as Timeline Anchors

Only `UserMessage[]` drives the virtualized timeline. Assistant messages are **grouped under their parent user message** via `parentID` linking. This creates a clear turn-taking structure.

Row construction per user message:
1. Comment annotations → `CommentStrip`
2. User message → `UserMessage`
3. Compaction part → `TurnDivider`
4. Grouped assistant parts (context grouping)
5. Interrupted marker → `TurnDivider`
6. Active + busy → `Thinking`
7. Active + retry → `Retry`
8. Completed with diffs → `DiffSummary`
9. Error → `Error`

### Betty: Flat Message List

All messages (user and assistant) are flat-listed in chronological order. No parent-child grouping. No turn dividers. No compaction markers. No diff summaries.

**Improvement:** Group assistant messages under their parent user message. Add visual turn dividers for compaction and interruption events.

---

## 10. Markdown Rendering

### Opencode: Dedicated Markdown Renderer

Uses a proper markdown renderer (likely marked or similar) with syntax highlighting for code blocks.

### Betty: Regex-Based Markdown

```javascript
// utils.js — renderMarkdown()
html = html.replace(/```(\w*)\n([\s\S]*?)```/g, ...);
html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
```

The regex-based markdown renderer is fragile:
- No nested list support
- No table support
- No strikethrough
- No task lists
- Code blocks have no syntax highlighting
- Bold/italic parsing breaks on edge cases
- List parsing is naive (doesn't handle indentation)

**Improvement:** Replace with a proper markdown library (marked, markdown-it, or remark). Add syntax highlighting via highlight.js or shiki.

---

## 11. Session Management

### Opencode: Rich Session Actions

- Double-click to edit session title
- Inline input with Enter/Escape/Blur handlers
- Parent-child navigation via breadcrumb (`Parent / Child`)
- Archive, delete, share, rename
- Session status display (idle, busy, retry)
- File diff list per session

### Betty: Basic Session Management

- Session list in sidebar
- Switch, delete, rename sessions
- No session titles (uses timestamps)
- No session status indicators
- No archive/share functionality

**Improvement:** Add session title editing, status indicators, and archive functionality.

---

## 12. Performance Optimizations

### Opencode: Comprehensive

- Binary search for all lookups (O(log n))
- Solid.js fine-grained reactivity (`createMemo`, `createStore`, `produce`)
- Virtualized rendering (only visible rows)
- Row reuse by key comparison
- LRU cache for session data (~10 sessions)
- Cursor-based pagination (200 messages per page)
- Background prefetching

### Betty: Minimal

- Vue 3 reactivity (component-level, not fine-grained)
- No virtualization
- No pagination
- No caching
- Linear search (`findIndex`) for message lookups

**Improvement:** Implement virtualization, pagination for long sessions, and switch to sorted arrays with binary search.

---

## Implementation Summary (2026-06-12)

All P0 and P1 improvements (in scope) have been implemented. See `.agents/plans/frontend-improvements.md` for the detailed plan.

### Files Created
- `src/frontend/src/composables/useStreaming.js` — Paced text streaming composable (24ms intervals, word-boundary snapping)
- `src/frontend/src/composables/useAutoScroll.js` — Gesture-aware auto-scroll with resume button
- `src/frontend/src/composables/useVirtualList.js` — Lightweight virtualization for large sessions
- `src/frontend/src/composables/useMessageStore.js` — Binary search for message lookups

### Files Modified
- `src/frontend/src/utils.js` — Replaced regex markdown with `marked` + `highlight.js`
- `src/frontend/src/main.js` — Added highlight.js CSS import
- `src/frontend/src/App.vue` — Merged streaming into main array, binary search dedup, streaming composable
- `src/frontend/src/components/ChatView.vue` — Auto-scroll, virtualization, resume button
- `src/frontend/src/components/ChatMessage.vue` — Context tool grouping, tool state rendering, thinking shimmer

### Dependencies Added
- `marked` (^12.0.0) — Proper markdown rendering with GFM support
- `highlight.js` (^11.9.0) — Syntax highlighting for code blocks

### Items Deferred (Out of Scope)
- **Parent-child message grouping** — Requires backend message model change (parentID linking)
- **Session pagination** — Requires backend cursor-based pagination support
- **Turn dividers / diff summaries** — Requires backend event changes for compaction markers

| Improvement | Impact | Effort | Priority | Status |
|---|---|---|---|---|
| **Paced text streaming** | High | Low | **P0** | ✅ Done |
| **Context tool grouping** | High | Medium | **P0** | ✅ Done |
| **Gesture-aware auto-scroll** | High | Medium | **P0** | ✅ Done |
| **Replace regex markdown** | High | Medium | **P0** | ✅ Done |
| **Virtualized rendering** | High | High | **P1** | ✅ Done |
| **Merge streaming into main array** | Medium | Low | **P1** | ✅ Done |
| **Parent-child message grouping** | Medium | Medium | **P1** | ⏭ Out of scope |
| **Tool state rendering** | Medium | Medium | **P1** | ✅ Done |
| **Thinking shimmer animation** | Low | Low | **P2** | ✅ Done |
| **Binary search for lookups** | Low | Low | **P2** | ✅ Done |
| **Session pagination** | Low | Medium | **P2** | ⏭ Out of scope |
| **Turn dividers / diff summaries** | Low | Medium | **P2** | ⏭ Out of scope |

---

## Recommended Implementation Order

### Phase 1: Quick Wins (P0)

1. **Paced text streaming** — Buffer deltas, release at 24ms intervals with word-boundary snapping
2. **Context tool grouping** — Collapse consecutive read/glob/grep/list into summary
3. **Gesture-aware auto-scroll** — Detect user scroll intent, add resume button
4. **Replace regex markdown** — Switch to `marked` library with syntax highlighting

### Phase 2: Architecture Improvements (P1)

5. **Merge streaming into main array** — Eliminate `streamingMsg` ref, use streaming flag
6. **Virtualized rendering** — Only render visible messages
7. **Parent-child message grouping** — Group assistant messages under user messages
8. **Tool state rendering** — Show pending/running/completed/error states per tool

### Phase 3: Polish (P2)

9. **Thinking shimmer animation** — Add animation during active reasoning
10. **Binary search for lookups** — Sort messages by ID, use binary search
11. **Session pagination** — Load messages in pages for long sessions
12. **Turn dividers / diff summaries** — Visual separators for compaction and file changes

---

## Reference: Opencode Source Files

The Opencode analysis is based on these source files in the anomalyco/opencode repository:

- `packages/sdk/js/src/v2/gen/types.gen.ts` — Message and Part type definitions
- `packages/app/src/context/global-sync/event-reducer.ts` — WebSocket event processing
- `packages/app/src/context/directory-sync.ts` — Per-directory state management
- `packages/app/src/pages/session/message-timeline.tsx` — Chat timeline component (~1,600 lines)
- `packages/app/src/pages/session/message-timeline.data.ts` — Timeline row construction
- `packages/ui/src/components/message-part.tsx` — Part rendering (~2,400 lines)
- `packages/app/src/context/sync.tsx` — Optimistic update utilities
