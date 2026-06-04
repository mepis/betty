# Web Chat App — Implementation Milestones

Implementation plan for the **Self-Hosted LLM Agentic Chat Web Application** based on the design doc at [web-chat-app-design.md](../web-chat-app-design.md).

---

## Overview

| Milestone | Title | Est. Effort | Status |
|---|---|---|---|
| **1** | Project Scaffolding and Backend Foundation | 2–3 days | Not Started |
| **2** | pi SDK Integration | 4–5 days | Not Started |
| **3** | Frontend Chat Interface | 4–5 days | Not Started |
| **4** | Settings and Polish | 2–3 days | Not Started |
| | **Total** | **12–16 days** | |

---

## Milestone Dependencies

```
Milestone 1 ──┬──► Milestone 2 ──┬──► Milestone 3 ──┬──► Milestone 4
              │                   │                    │
              │                   │                    │
              └───────────────────┴────────────────────┘
              (Milestone 2 depends on 1)  (Milestone 3 depends on 2)  (Milestone 4 depends on 3)
```

All milestones are sequential — each depends on the previous one being complete.

---

## Quick Reference

### Milestone 1: Project Scaffolding and Backend Foundation

**Goal:** Set up the project structure, Express server, and basic WebSocket infrastructure.

**Key deliverables:**
- Monorepo project structure with `src/backend/` and `src/frontend/`
- Express server with health check endpoint
- CORS and authentication middleware
- WebSocket server with first-message authentication
- Heartbeat/ping-pong keepalive

**Files created:**
- `src/backend/package.json`, `tsconfig.json`, `src/server.ts`, `src/auth.ts`
- `src/backend/src/websocket/handler.ts`, `protocol.ts`, `heartbeat.ts`
- `src/frontend/package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- `src/frontend/src/main.ts`, `App.vue`, `styles/main.css`
- Root: `package.json`, `.env.example`, `.gitignore`, `README.md`

**Design doc reference:** §3 Phase 1, §5 File Structure

---

### Milestone 2: pi SDK Integration

**Goal:** Embed the pi SDK and relay agent events over WebSocket.

**Key deliverables:**
- `AgentSessionRuntime` creation and lifecycle management
- Extension binding via `bindExtensions()`
- Event relay mapping all SDK event types to WebSocket messages
- Command handler for all client-to-server commands (prompt, abort, session management, etc.)
- REST API endpoints (`/api/models`, `/api/commands`, `/api/sessions`, `/api/sessions/:id/stats`)
- `setRebindSession()` for automatic re-subscription after session replacement

**Files created:**
- `src/backend/src/agent/runtime.ts` — Runtime lifecycle
- `src/backend/src/agent/event-relay.ts` — Event mapping
- `src/backend/src/agent/command-handler.ts` — Command routing
- `src/backend/src/routes/models.ts`, `commands.ts`, `sessions.ts`, `session-stats.ts`
- `src/backend/src/websocket/extension-ui.ts` — Extension UI protocol

**Design doc reference:** §3 Phase 2, §6 WebSocket Protocol

---

### Milestone 3: Frontend Chat Interface

**Goal:** Build the Vue 3 chat UI with real-time streaming.

**Key deliverables:**
- Pinia stores for chat state and session management
- WebSocket client service with reconnection
- Chat view with streaming, markdown rendering, tool execution display
- Thinking output display (collapsible)
- Session sidebar with CRUD operations
- Responsive layout (mobile-friendly)

**Files created:**
- `src/frontend/src/stores/chat.ts`, `sessions.ts`, `settings.ts`
- `src/frontend/src/services/websocket.ts`
- `src/frontend/src/composables/useWebSocket.ts`
- `src/frontend/src/components/ChatView.vue`, `MessageBubble.vue`, `StreamingIndicator.vue`
- `src/frontend/src/components/ToolExecution.vue`, `ThinkingBlock.vue`, `InputArea.vue`
- `src/frontend/src/components/SessionSidebar.vue`, `MarkdownRenderer.vue`
- `src/frontend/src/styles/markdown.css`

**Design doc reference:** §3 Phase 3

---

### Milestone 4: Settings and Polish

**Goal:** Add model selection, thinking level control, error handling, and production build.

**Key deliverables:**
- Settings panel (model selector, thinking level, API keys, session stats)
- Error toast notifications
- Loading states and empty states
- Keyboard shortcuts (Ctrl+Enter, Escape, Enter, Shift+Enter)
- Connection status bar
- Production build configuration
- Environment variable documentation

**Files created:**
- `src/frontend/src/components/SettingsPanel.vue`, `ConnectionBar.vue`, `Toast.vue`
- `src/frontend/src/composables/useToast.ts`
- Updated: `server.ts` (static file serving, catch-all route)
- Updated: `.env.example`, `.gitignore`, `README.md`

**Design doc reference:** §3 Phase 4

---

## Validation Summary

Each milestone has its own validation criteria from the design doc (§4):

| Milestone | Validation Levels | Primary Method |
|---|---|---|
| 1 | L1, L2 | Manual testing (curl, wscat) |
| 2 | L1, L2 | Manual testing (curl, wscat, agent interaction) |
| 3 | L2, L3 | Visual inspection, interaction testing |
| 4 | L2, L3 | End-to-end testing, production testing |

---

## How to Use

1. **Start with Milestone 1** — read the milestone file, complete all todos, verify acceptance criteria
2. **Move to Milestone 2** — depends on Milestone 1 being complete
3. **Continue sequentially** through Milestones 3 and 4
4. **Each milestone file** contains:
   - Detailed todo lists with sub-tasks
   - Code examples and patterns
   - Additional info and context from the design doc
   - Acceptance criteria for verification
   - Common pitfalls to avoid
   - Integration notes connecting to other milestones

---

## Design Doc Cross-References

| Section | Description | Relevant Milestone |
|---|---|---|
| §1 Purpose | Project overview | All |
| §2 Approach | Architecture, technical decisions | All |
| §3 Phased Plan | Phase 1–4 tasks | 1–4 respectively |
| §4 Validation | Acceptance criteria | All |
| §5 File Structure | Directory layout | 1 |
| §6 WebSocket Protocol | Message types | 2, 3 |
| §7 Dependencies | Package list | 1 |
| §8 Progress Tracker | Checklist | All |
| §9 Notes | Security, performance, SDK behaviors | All |
