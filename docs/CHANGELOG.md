# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **MySQL/MariaDB backend** — Persistent storage via `mysql2` connection pool replacing JSON-file user store (`src/server/db.ts`, `src/server/sessionStore.ts`, `scripts/init-db.sql`)
- **Session persistence** — Sessions and messages persisted to `sessions` and `session_messages` tables with transactional batch inserts (`src/server/sessionStore.ts`)
- **Database reference documentation** (`docs/reference/database.md`) — Full schema, API methods, connection pool config, health check format
- **`.admin-credentials.json`** — Auto-generated admin credentials persisted to disk with `0600` permissions when `DEFAULT_ADMIN_USERNAME`/`DEFAULT_ADMIN_PASSWORD` are not set (M15 fix)
- **dotenv support** — Server loads `.env` on startup (`server.ts`)
- **Environment variable docs** — Database config, bcrypt config, JWT config, default admin config (`docs/reference/environment.md`)
- **npm script `db:init`** — `mysql < scripts/init-db.sql` for manual DB initialization

### Changed

- **UserStore migrated to MySQL** — All user CRUD operations now use parameterized queries against the `users` table instead of JSON file storage (`src/server/userStore.ts`)
- **Session tracking in WebSocket handler** — `switch_session`, `set_session_name` now update the database (`server.ts`)
- **Graceful shutdown** — Database pools closed on `SIGINT` (`server.ts`, `src/server/db.ts`)
- **Environment docs updated** — Added database, bcrypt, JWT, and default admin sections (`docs/reference.environment.md`)
- **Dependencies updated** — Added `mysql2`, `dotenv`, `@types/mysql`, `playwright`, `@types/mysql` (`package.json`)
- **`.gitignore` updated** — Added `.admin-credentials.json`

- [Added] MySQL/MariaDB backend for persistent user, session, and message storage
- [Added] Session persistence with transactional batch inserts
- [Added] Database reference documentation
- [Added] Auto-generated admin credentials file with secure permissions (M15 fix)
- [Added] dotenv support for server-side environment loading
- [Changed] UserStore migrated from JSON file to MySQL with parameterized queries
- [Changed] Session tracking integrated with database in WebSocket handler
- [Changed] Graceful shutdown closes database pools
- [Changed] Environment reference docs expanded with database, bcrypt, JWT, admin config
- [Changed] Added mysql2, dotenv, playwright, and type dependencies
- [Fixed] Auto-generated admin credentials persisted to disk (M15 fix)
- [Security] Parameterized SQL queries throughout (no string concatenation)
- [Security] JWT token shape validation on verify
- [Security] Input validation on all RPC handlers (type, length, format checks)
- [Security] File size limit for static file serving (100MB)
- [Security] Content-Type allowlist for static files
- [Security] Request timeout on body parsing (10s)
- [Security] WebSocket URL parsing guarded against errors
- [Security] Safe response sanitization in `respondToUiRequest`
- [Fixed] Race condition: duplicate WebSocket connections during CONNECTING state
- [Fixed] Stale WebSocket handler references after disconnect
- [Fixed] Missing reconnect timeout cleanup
- [Fixed] localStorage crashes in private browsing
- [Fixed] Token validation with local JWT expiry check before API call
- [Fixed] Missing data shape validation in WebSocket message handlers
- [Fixed] Message length limit enforcement (10,000 chars)
- [Fixed] Image upload validation (max 4, 4MB each, valid MIME types)
- [Fixed] Model existence validation before setModel
- [Fixed] Fork race condition during active stream
- [Fixed] Session path validation in switchSession
- [Fixed] Pi process cleanup with clearPendingResponses on shutdown — skill now runs to completion without human intervention, never pauses for approval, adapts to failures (dev server down, subagent failures, missing test data) and continues; added max loop limits for Phase 4 (5 fix/review loops) and Phase 5 (2 regression loops); enhanced error handling instructions across all phases; expanded Critical Rules from 14 to 18 items

### Added

- **PI skill**: testing-debugging — 6-phase QA workflow (recon, backend audit, frontend testing, bug fixing, regression, report); rewritten to orchestrator mode with aggressive subagent delegation (parallel scouts for recon, parallel workers for backend audit, worker→reviewer→worker chain for bug fixing)
- **PI skill** (commit-and-push): "Proceed Without Asking" section — executes immediately without asking for permission
- Agent rule: always update `docs/CHANGELOG.md` before every commit (Rule 12 in `.pi/PROJECT_RULES.md`)
- Repository audit report (`docs/audit.md`) — security findings, code quality assessment, recommendations
- Audit reference in documentation index
- **PI skills**: commit-and-push, deep-research, planning, playwright-cli
- **Documentation overhaul**: comprehensive project documentation with Mermaid diagrams, cross-links, and tags
- New feature pages: Steering Mode, Auto Compaction, Auto Retry, Bash Tool, Commands
- New reference pages: Environment Configuration, HTTPS/TLS Configuration
- Updated protocol reference with all 30+ command types
- Updated store documentation with all actions
- Updated architecture deep-dive with feature architecture diagram
- Updated QA page with practical examples for steering, follow-up, auto-compaction, and auto-retry

### Added

- **Multi-user authentication** with JWT tokens and bcrypt password hashing
- **Role-based access control (RBAC)** with three roles: admin, user, viewer
- **Login page** with dark theme matching Betty's UI
- **Admin user management panel** for creating, updating, and deleting users
- **WebSocket authentication** via JWT token in connection URL (`?token=<jwt>`)
- **REST API** for auth (`/api/auth/login`, `/api/me`) and user management (`/api/users` CRUD)
- **Command permission gating** — viewers can only read, users can chat, admins have full access
- `src/server/userStore.ts` — JSON-file user store with bcrypt hashing
- `src/server/auth.ts` — JWT token generation and validation
- `src/server/permissions.ts` — Role-based permission maps for all commands

### Fixed

- Critical bugs in WebSocket store, types, and server (`9eee367`)

## [1.0.0] - 2026-05-16

### Added

- **Full web UI** built with Vue 3, Vite, and Pinia
- **Real-time streaming chat** via WebSocket communication with pi
- **Model switching** via dropdown selector in the UI
- **Thinking level cycling** — click the badge to cycle through levels
- **Session management** with sidebar (new session, switch, rename)
- **Context compaction** to manage conversation history
- **Fork conversations** from any message entry point
- **Clone sessions** for branching experimentation
- **Tool call visibility** — shows results of bash, read, edit, write operations
- **Keyboard shortcuts** — Enter to send, Shift+Enter for newline
- **Responsive design** — mobile-friendly sidebar with toggle
- **Dark theme** — GitHub Dark-inspired styling
- **Settings panel** — configure thinking level, view session info, trigger compaction
- **HTTPS support** — self-signed certificate auto-generation for local testing
- **Custom TLS certificates** — support for production-grade certificates
- **Reverse proxy compatibility** — works behind nginx, Caddy, etc.
- **Remote access** — serve the UI over HTTPS on any network interface
- **Model discovery** — auto-detect available models from pi
- **Verbose logging** — toggleable detailed output for debugging
- **Session persistence** — sessions stored on disk with configurable directory

### Changed

- Single port architecture: HTTP/HTTPS and WebSocket served from the same port (default 3001)
- Production builds are served by the Node.js server directly (no separate static file server needed)

### Configuration

- Environment variables for server port, HTTPS, model selection, session storage, and more
- Frontend variables for WebSocket URL and port customization

### Protocol

- JSON-based WebSocket message protocol supporting prompt, abort, state queries, tool execution events, and more
