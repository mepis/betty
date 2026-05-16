# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
