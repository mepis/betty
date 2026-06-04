# Betty — Self-Hosted LLM Agentic Chat

A self-hosted, single-user web application for interacting with an AI coding agent via a browser-based chat interface. Built with Vue 3, Express.js, and the pi.dev SDK.

## Features

- Real-time streaming of agent responses
- Full agent capabilities (file read/write/edit, bash, tools, extensions, skills)
- Session management (create, list, resume, delete, fork, clone, navigate)
- Markdown rendering with syntax highlighting
- Tool execution visibility
- Thinking output display (collapsible)
- Model selection and thinking level control
- Extension UI protocol support (dialogs, notifications, widgets)
- Session persistence via JSONL format

## Quick Start

### Prerequisites

- Node.js 18+
- pi-coding-agent SDK installed

### Installation

```bash
# Install dependencies
npm install
cd src/backend && npm install
cd ../frontend && npm install
```

### Development

```bash
# Start both backend and frontend
npm run dev

# Or start individually
npm run dev:backend   # Backend on port 3001
npm run dev:frontend  # Frontend on port 5173
```

### Production Build

```bash
npm run build
npm start
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `PORT` — Backend server port (default: 3001)
- `SHARED_SECRET` — Authentication secret for WebSocket connections
- `CWD` — Working directory for the agent (default: process.cwd())

Optional:
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` — API keys for models
- `FRONTEND_ORIGIN` — CORS origin for production

## Architecture

```
Browser (Vue 3 SPA) ←→ WebSocket ←→ Express.js ←→ pi SDK
     ↑                       ↑              ↑
  Pinia Store         First-msg Auth   AgentSessionRuntime
```

## WebSocket Protocol

### Authentication
First message must be `{ type: 'auth', payload: { secret: '...' } }`

### Commands
- `prompt` — Send a message to the agent
- `abort` — Stop current operation
- `new_session` — Create a new session
- `switch_session` — Switch to an existing session
- `fork` — Fork from a previous message
- `clone` — Clone the current branch
- `compact` — Manually compact the session
- `navigate_tree` — Navigate within the session tree
- `set_model` — Change the active model
- `set_thinking_level` — Change thinking level
- `set_session_name` — Set session display name
- `extension_ui_response` — Respond to extension dialogs

### Events
- `agent_start` / `agent_end` — Agent lifecycle
- `turn_start` / `turn_end` — Turn lifecycle
- `message_start` / `message_update` / `message_end` — Message streaming
- `tool_execution_*` — Tool execution events
- `compaction_start` / `compaction_end` — Compaction events
- `auto_retry_start` / `auto_retry_end` — Auto-retry events
- `queue_update` — Pending message queue state
- `session_info` / `session_changed` — Session management
- `extension_ui_request` — Extension dialog requests
- `extension_error` — Extension errors

## License

Private / Self-hosted
