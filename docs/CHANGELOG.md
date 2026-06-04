# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **pi.dev SDK Research**: Comprehensive analytical report on the pi.dev SDK architecture, API, extensions, and integration patterns (`.agents/deep-research/REPORT.md`)
- **Web Chat App Design**: Complete design document with architecture, WebSocket protocol, phased implementation plan, and validation criteria (`.agents/plans/web-chat-app-design.md`)
- **Implementation Plan**: Detailed 4-phase implementation plan covering scaffolding, SDK integration, frontend, and polish (`.agents/plans/web chat app implementation plan/`)
- **Merge Request Skill**: New `.pi/skills/merge-request/` skill for generating MR descriptions
- **Project Template**: `templates/project_template.md` for scaffolding new projects

### Changed

- **Project Direction**: Shifted from old web chat app implementation to comprehensive design-first approach with detailed architecture documents and phased implementation plan
- **Deep Research**: Completed opencode.ai directory restriction research (STATE.md marked as Complete)
- **Plan Archives**: Moved web chat app design audit rounds 3 and 4 to `.agents/plans/archive/`

### Removed

- **Stale Agent Artifacts**: Removed 516 obsolete files from deep-research, playwright-cli, and testing agent runs (logs, page captures, screenshots, agent reports)
- **Old Web Chat App**: Removed `src/web/` (frontend Vue SPA, Express backend, configs) — superseded by new design document and implementation plan
- **Old Testing Agent**: Removed `.agents/testing/` artifacts (snapshots, test reports, state files, verification results)
- **Old Extensions**: Removed `.pi/extensions/optimize-compaction.ts` and `src/llama/llama.cpp`
- **Design Audit Plans**: Moved web chat app design audit rounds 3 and 4 to archive (`.agents/plans/archive/`) — no longer active

### Added

- **Betty Web Chat App**: Full implementation of a self-hosted, single-user web application for interacting with the pi.dev SDK agent via browser-based chat
  - **Backend** (`src/backend/`): Express.js server with WebSocket handler, agent runtime integration, REST API endpoints for sessions/models/commands/health/stats
  - **Frontend** (`src/frontend/`): Vue 3 SPA with Pinia stores (chat, sessions, settings), real-time streaming chat interface, session sidebar, extension dialog support, thinking output display, tool execution visibility
  - **WebSocket Protocol**: Full command/event protocol supporting prompt, abort, session management, fork/clone, model selection, thinking level control, compaction, extension UI dialogs, and real-time event relay
  - **Extension UI Context**: Complete `ExtensionUIContext` implementation bridging SDK extension dialogs to frontend via WebSocket (select, confirm, input, notify, widgets, status, working indicator, editor)
  - **REST API**: Endpoints for session CRUD, model listing, agent commands, health check, and session statistics
  - **Authentication**: Shared secret auth for both WebSocket (first-message auth with timeout) and REST API (X-Shared-Secret / Bearer token)
  - **Config**: `.env.example`, `.gitignore`, root `package.json` with concurrent dev scripts
  - **Documentation**: Comprehensive `README.md` with architecture diagram, WebSocket protocol docs, quick start guide

### Fixed

- **WebSocket Reconnection**: RPC client now handles connection drops with exponential backoff and automatic reconnection

### Changelog

- [Added]: Betty web chat app — full backend (Express + WebSocket + SDK integration) and frontend (Vue 3 + Pinia + real-time chat)
- [Added]: `.env.example` with server, auth, API key, and CORS configuration
- [Added]: `.gitignore` with Node.js, build output, IDE, and OS file patterns
- [Changed]: Deep research STATE.md marked as Complete (opencode.ai directory restriction research)
- [Changed]: Design audit plan files moved to archive directory
