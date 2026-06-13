# Opencode Web UI Chat Message Handling — Detailed Analysis

## Repository

- **Source:** github.com/anomalyco/opencode (dev branch)
- **Relevant packages:**
  - `packages/sdk/js/src/v2/gen/types.gen.ts` — Message and Part type definitions
  - `packages/app/src/context/global-sync/event-reducer.ts` — WebSocket event processing
  - `packages/app/src/context/directory-sync.ts` — Per-directory state management
  - `packages/app/src/context/server-sync.tsx` — Server sync context
  - `packages/app/src/pages/session/message-timeline.tsx` — Chat timeline component
  - `packages/app/src/pages/session/message-timeline.data.ts` — Timeline row construction
  - `packages/ui/src/components/message-part.tsx` — Part rendering (2,400+ lines)
  - `packages/app/src/context/sync.tsx` — Optimistic update utilities

---

## 1. SDK Message Types

### Message Roles

Two message roles form a parent-child relationship:

- **`UserMessage`** — User input with `agent`, `model`, `system` prompt, `tools`, and optional `summary` (title, body, diffs)
- **`AssistantMessage`** — LLM response linked to a `UserMessage` via `parentID`; includes `error` (typed errors), `cost`, `tokens`, `modelID`, `providerID`, `agent`, `path`

Messages are identified by string `id` and sorted by ID (binary search for O(log n) lookups).

### Part Types (11 total)

Each message has an array of `Part[]`:

| Type | Purpose |
|---|---|
| `TextPart` | Markdown text content with optional `synthetic` flag and metadata |
| `ReasoningPart` | Chain-of-thought reasoning with timing (start/end) |
| `ToolPart` | Tool invocation with 4 states: `pending`, `running`, `completed`, `error` |
| `FilePart` | File attachments with mime type, URL, source info (file/symbol/resource) |
| `SubtaskPart` | Subtask delegation with prompt, description, agent, model |
| `StepStartPart` | LLM step boundary marker with optional snapshot |
| `StepFinishPart` | Step completion with reason, cost, token counts |
| `SnapshotPart` | Filesystem snapshot reference |
| `PatchPart` | File patch with hash and file list |
| `AgentPart` | Agent reference with optional source text range |
| `RetryPart` | Retry attempt with attempt count and error |
| `CompactionPart` | Context compaction marker (auto/manual, overflow flag) |

### ToolPart States

```
ToolStatePending  { status: "pending", input, raw }
ToolStateRunning  { status: "running", input, title?, metadata?, time.start }
ToolStateCompleted { status: "completed", input, output, title, metadata, time.start/end, attachments? }
ToolStateError    { status: "error", input, error, metadata?, time.start/end }
```

---

## 2. WebSocket Event System

The server pushes real-time events to the client. The event reducer (`event-reducer.ts`) handles:

### Message Events

| Event | Action |
|---|---|
| `message.updated` | Binary search by ID, upsert message into store |
| `message.removed` | Remove message + all parts + text deltas |
| `message.part.updated` | Binary search by part ID, upsert part; skip `patch`, `step-start`, `step-finish` |
| `message.part.removed` | Binary search by part ID, splice out part |
| `message.part.delta` | **Streaming** — append delta string to `part_text_accum_delta[partID]` and to the field on the part |

### Session Events

| Event | Action |
|---|---|
| `session.created` | Insert session into sorted list, trim to limit |
| `session.updated` | Reconcile session; if archived, remove and cleanup caches |
| `session.deleted` | Remove session and cleanup caches |
| `session.status` | Update status (`idle`, `busy`, `retry`) |
| `session.diff` | Update file diff list |

### Other Events

`todo.updated`, `vcs.branch.updated`, `permission.asked/replied`, `question.asked/replied/rejected`, `lsp.updated`

---

## 3. Directory Sync Layer

Each directory gets its own sync context (`directory-sync.ts`) with:

### State Shape

```typescript
{
  message: Record<string, Message[]>  // sessionID → messages
  part: Record<string, Part[]>        // messageID → parts
  session: Session[]
  session_status: Record<string, SessionStatus>
  session_diff: Record<string, SnapshotFileDiff[]>
  todo: Record<string, Todo[]>
  permission: Record<string, PermissionRequest[]>
  question: Record<string, QuestionRequest[]>
  part_text_accum_delta: Record<string, string>  // partID → accumulated delta
}
```

### Optimistic Updates

Messages are added immediately for responsiveness:

- `session.optimistic.add()` — Inserts message + parts into both optimistic queue and store
- `session.addOptimisticMessage()` — Creates a user message with generated ID and parts
- On server response, `mergeOptimisticPage()` reconciles optimistic items with server data
- Confirmed items are removed from the optimistic queue

### Message Loading & Pagination

- **Initial load:** 80 messages per session
- **History load:** 200 messages per page, cursor-based pagination
- **Prefetch:** Sessions can be prefetched in background
- **Cache:** LRU with configurable limit (~10 sessions), eviction on access

---

## 4. Timeline Rendering

### MessageTimeline Component

The core chat display (`message-timeline.tsx`, ~1,600 lines):

1. **Filter to user messages** — Only `UserMessage[]` drives the timeline
2. **Group assistant messages** — `assistantMessagesByParent` maps `parentID → AssistantMessage[]`
3. **Construct timeline rows** — `Timeline.constructMessageRows()` per user message
4. **Virtualize** — `virtua/solid` Virtualizer with row cache (16 sessions)

### Timeline Row Types

```
CommentStrip      — File comment annotations (from synthetic text parts)
UserMessage       — User input display
TurnDivider       — Compaction or interruption markers
AssistantPart     — Individual assistant part or context group
Thinking          — Streaming indicator with reasoning heading
DiffSummary       — File change summary (up to 10 files, expandable)
Error             — Error card
Retry             — Retry prompt
BottomSpacer      — 64px bottom padding
```

### Row Construction Logic

For each user message:
1. Extract comment annotations from synthetic text parts → `CommentStrip`
2. Render user message → `UserMessage`
3. If compaction part exists → `TurnDivider` (compaction)
4. Group assistant parts (context grouping for read/glob/grep/list)
5. If interrupted (MessageAbortedError) → `TurnDivider` (interrupted) between groups
6. If active + busy → `Thinking` with reasoning heading
7. If active + retry status → `Retry`
8. If completed with diffs → `DiffSummary`
9. If error → `Error`

### Row Reuse

Rows are compared by key (e.g., `user-message:{id}`, `assistant-part:{userMessageID}:{groupKey}`) and reused when equal to avoid re-rendering.

---

## 5. Part Grouping

### Context Tool Grouping

Consecutive context-gathering tools are collapsed:

```typescript
const CONTEXT_GROUP_TOOLS = new Set(["read", "glob", "grep", "list"])
const HIDDEN_TOOLS = new Set(["todowrite"])
```

`groupParts()` scans parts and groups consecutive context tools into a `ContextToolGroup` with a summary ("3 reads, 2 searches, 1 list").

### Part Rendering

Each part type maps to a renderer via `PART_MAPPING`:

| Type | Renderer |
|---|---|
| `text` | `TextPartDisplay` — Markdown with paced streaming, copy button |
| `reasoning` | `ReasoningPartDisplay` — Markdown with streaming |
| `tool` | `ToolPartDisplay` — Dispatches to ToolRegistry |
| `compaction` | `CompactionPartDisplay` — Divider line |

### Tool Registry (12+ renderers)

| Tool | Display |
|---|---|
| `read` | File path + loaded files list |
| `list`/`glob`/`grep` | Search results in markdown |
| `webfetch`/`websearch` | URL with clickable link |
| `task` | Colored agent card, clickable to child session |
| `bash` | `$ command\n\noutput` with copy, ANSI stripped |
| `edit`/`write` | File diff viewer in accordion |
| `apply_patch` | Multi-file diff viewer with add/delete/move labels |
| `todowrite` | Checkbox list (hidden from timeline, shown in composer dock) |
| `question` | Q&A pairs |
| `skill` | Named skill invocation |

---

## 6. Streaming Behavior

### Paced Text Rendering

```typescript
const TEXT_RENDER_PACE_MS = 24
const TEXT_RENDER_SNAP = /[\s.,!?;:)\]]/
```

Text streams at ~24ms intervals, snapping to word/sentence boundaries. Steps increase with remaining text size (2, 4, 8, 16, 24 chars).

### Auto-Scroll

- **Bottom anchor detection:** `scrollHeight - clientHeight - scrollTop <= 4`
- **90-frame grace period:** After content changes, keeps scroll locked for 90 animation frames
- **12-frame hold during active turn:** While model is working, extends lock to 12 frames per change
- **Gesture detection:** Distinguishes user scroll from auto-scroll via wheel/touch/pointer events
- **Resume button:** Floating "jump to bottom" button when scrolled away during active turn

### Thinking Indicator

- `TextShimmer` component shows "Thinking..." animation
- Extracts reasoning heading from reasoning part text (markdown headings, bold text)
- Hidden when `showReasoningSummaries` setting is disabled

---

## 7. Session Management

### Title Editing

- Double-click to edit session title
- Inline input with Enter/Escape/Blur handlers
- Parent-child navigation via breadcrumb (`Parent / Child`)

### Actions

- **Archive:** Sets `time.archived`, removes from list
- **Delete:** Removes session + all child sessions (recursive)
- **Share:** Generates share URL via `session.share()` API
- **Rename:** Updates session title

---

## 8. Key Architectural Decisions

1. **Binary search everywhere** — All lookups use binary search on sorted arrays (by ID) for O(log n) performance
2. **Solid.js signals + stores** — Fine-grained reactivity with `createMemo`, `createStore`, `produce`
3. **Event-driven over polling** — WebSocket events push all state changes; no polling
4. **Optimistic UI** — Immediate rendering before server confirmation
5. **Virtualized rendering** — Only visible rows rendered; cache persists across session switches
6. **Part-based composition** — Messages are arrays of typed parts, enabling streaming and incremental updates
7. **Context grouping** — Reduces visual noise from consecutive read/search operations
