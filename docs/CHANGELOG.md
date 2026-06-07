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

### Refactored

- [Changed]: [2026-06-07] Restructured project from flat layout to `src/` directory — moved `server.js` to `src/backend/server.js`, `public/index.html` to `src/frontend/public/index.html`, and `templates/project_template.md` to `src/frontend/templates/project_template.md`; updated backend path references and package.json scripts accordingly

### Added

- [Added]: [2026-06-07] llama.cpp benchmark tool (`src/benchmark/`) — automated benchmark runner that starts llama-server, sends 4 context-filling messages per test run via the `/completion` endpoint, measures total time in ms, prompt tokens/sec, and generation tokens/sec per message, logs server parameters and environment variables, writes results to `results.md` as markdown tables, and loops through config iterations (doubling context, incrementing batch/ubatch/cache sizes)
- [Added]: [2026-06-07] Benchmark config file (`src/benchmark/configs.json`) — configurable model path, CUDA build flags, model inference params (temp, top-p, top-k), multi-GPU tensor split, and llama-server runtime options
- [Added]: [2026-06-07] `axios` and `dotenv` dependencies for HTTP requests and environment variable loading in the benchmark tool
