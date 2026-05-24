---
scope: "Full codebase audit - Pi Chat app (Vue frontend + Express/WS backend)"
started_at: "2026-05-23"
last_updated: "2026-05-23"
current_phase: "Phase 1"
status: "active"
---

## Phase Progress
- [x] Phase 1: Reconnaissance & Scope
- [x] Phase 2: Backend Code Audit (13 bugs found: 2 Critical, 4 Major, 7 Minor)
- [x] Phase 3: Frontend Testing (10/10 tests passed, 0 errors, 0 warnings)
- [x] Phase 4: Bug Fixing & Re-Testing (11 fixed, 2 by design)
- [x] Phase 5: Regression & Edge-Case Testing (6/7 passed, 1 backend-only failure)
- [x] Phase 6: Final Report Generation

## Bugs Found So Far
- Total: 13 | Fixed: 11 | Remaining: 2

## Final Status
All phases complete. 11 bugs fixed, 2 by design. Frontend tests all pass. Backend API test failed due to Pi subprocess instability (environment issue, not code bug). Final report written to TEST_REPORT.md.

## Codebase Map

### Backend (`src/backend/`)
- **server.js** — Express + WebSocket server
  - GET `/health` — Health check
  - GET `/api/sessions` — List active sessions
  - GET `/*` — SPA fallback (serves frontend dist)
  - WebSocket `/ws` — Real-time chat communication
- **pi-session.js** — PiSession class (extends EventEmitter)
  - Manages `pi --mode rpc` subprocess
  - Handles JSONL event stream from Pi
  - Methods: start(), prompt(), steer(), followUp(), abort(), newSession(), stop(), isAlive()

### Frontend (`src/frontend/`)
- **App.vue** — Main Vue 3 component (chat UI)
- **main.js** — Vue app entry point
- **composables/useWebSocket.js** — WebSocket connection manager with auto-reconnect
- **styles/main.css** — Dark theme styles (GitHub-inspired)
- **index.html** — SPA entry

### Scripts
- `with_server.py` — Test server manager (Python)
- `frontend_test.py` — Playwright test suite (expects auth, many pages not present)
- `kill-backend.sh` — Backend kill script

### Dev Server Commands
- `npm run dev` — Starts both backend (port 3001) and frontend (Vite port) concurrently
- `npm run backend` — Backend only: `cd src/backend && node server.js`
- `npm run frontend` — Frontend only: `cd src/frontend && npx vite --host`

### Routes/Endpoints
| Type | Path | Handler |
|------|------|---------|
| API | GET /health | server.js |
| API | GET /api/sessions | server.js |
| SPA | GET /* | server.js (fallback) |
| WS | /ws | server.js (auto-session on connect) |

### Frontend Pages
- Single-page chat app (no routing framework — just App.vue)
- No authentication
- No separate routes

### Dependencies
- Backend: express, ws, uuid
- Frontend: vue 3, vite
- Root: concurrently

## Scope Notes
- Frontend is a simple chat interface (no auth, no routing)
- The frontend_test.py script references many pages (login, register, users, rag, etc.) that do NOT exist in the current codebase
- Backend has no authentication middleware, no database, no session persistence
- WebSocket auto-creates a Pi session on every connection
