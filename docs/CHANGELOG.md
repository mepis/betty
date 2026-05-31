# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **Web Frontend**: Vue 3 SPA (`src/web/frontend/`) with real-time chat interface, WebSocket-based RPC client, and markdown rendering
- **Web Backend**: Express + WebSocket proxy (`src/web/backend/`) bridging the browser to the pi RPC server
- **Testing Agent**: New `.agents/testing/` agent with comprehensive test report and audit capabilities
- **Markdown Preview**: `MarkdownPreview.vue` component for rendering chat messages with syntax highlighting and copy-to-clipboard
- **Session Sidebar**: `SessionSidebar.vue` component for managing chat sessions with localStorage persistence

### Changed

- **Testing Agent**: Replaced old `.agents/testing/` agent with new version featuring structured test reports and audit workflows

### Removed

- **Stale Agent Artifacts**: Removed 516 obsolete files from deep-research, playwright-cli, and testing agent runs (logs, page captures, screenshots, agent reports)

### Fixed

- **WebSocket Reconnection**: RPC client now handles connection drops with exponential backoff and automatic reconnection
