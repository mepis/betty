# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- `.pi/settings.json` with optimized compaction settings (reserveTokens: 24576, keepRecentTokens: 30000)
- `.pi/extensions/optimize-compaction.ts` — research-backed compaction optimization extension:
  - Context pruning: tool result deduplication, error purging, observation masking
  - Custom compaction: structured JSON summaries, pinned first user message, code change descriptions
  - External memory: `.pi/session-memory.json` persists goals, constraints, decisions, and file states across compactions
  - `/prune` command to toggle pruning strategies on/off
  - `/memory` command to inspect persistent session memory
- `.agents/plans/optimize-compaction.md` — implementation plan with research justification

### Changed
- Web-based chat application for interacting with Pi coding agent via browser
- Express.js + WebSocket backend that spawns Pi in RPC mode and proxies communication
- Vue 3 + Vite frontend with real-time streaming chat UI
- `PiSession` class for managing Pi subprocess lifecycle (spawn, prompt, abort, cleanup)
- WebSocket protocol supporting prompt, stop, and new-session commands
- Streaming text display with markdown-like formatting (code blocks, bold, italic)
- Auto-reconnect with exponential backoff for WebSocket connections
- Health check endpoint (`/health`) and session listing API (`/api/sessions`)
- Grace period on WebSocket connection to avoid spawning Pi for transient connections
- Rate limiting (60 messages per 60 seconds per client) and 1MB message size limit
- SPA fallback serving frontend from backend in production builds
- Root `package.json` with npm scripts (`dev`, `backend`, `frontend`, `build`, `start`)
- `concurrently` and `playwright` as root devDependencies
- Testing scripts (`with_server.py`, `kill-backend.sh`) for automated test workflows

### Changed
- Backend port from 3000 to 3001 (server, kill script, test harness)
- `scripts/with_server.py` server path from `src/server.js` to `src/backend/server.js`
- `package.json` — added project description, npm scripts, and devDependencies
- `scripts/kill-backend.sh` — updated port references from 3000 to 3001

### Removed
- `.agents/deep-research/REPORT.md` — removed completed research report artifact
- `.agents/deep-research/STATE.md` — removed research state tracking artifact
