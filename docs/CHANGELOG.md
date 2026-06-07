# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- [Added]: [2026-06-07] Image attachment support — drag & drop or click 📷 to attach up to 10 images (max 10MB each), with automatic compression (1920px max, JPEG 80% quality), inline thumbnails in chat, and base64 data URL transmission to the agent
- [Added]: [2026-06-07] Betty web frontend — a browser-based chat interface for the pi coding agent with real-time streaming, thinking block display, tool call visibility, code block rendering with copy buttons, dark theme, responsive design, auto-reconnect, session management, and model/thinking level controls
- [Added]: [2026-06-07] Right-aligned user message bubbles in chat — user messages now appear on the right with reversed header layout and adjusted bubble corner radii for a familiar chat UI
- [Added]: [2026-06-07] Command palette in chat input — type `/` to open a searchable command list with keyboard navigation, 6 built-in shortcuts (help, shortcuts, clear, compact, export, new), and live filtering against backend-provided commands

### Removed

- [Removed]: [2026-06-07] Deleted local `.pi/agents/` and `.pi/skills/` files (reviewer.md, scout.md, worker.md, and all skill definitions and references)

### Added

- [Added]: [2026-06-07] Workspace selector — sidebar 📁 button opens a directory browser modal to select which project directory the agent works in, with `WORKSPACE` environment variable for default, agent restart on change, and file icons for common project files
