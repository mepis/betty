# pi.dev Web Interface

Self-hosted web app for [pi.dev](https://pi.dev) using the RPC server protocol.

## Tech Stack

- **Frontend**: Vue 3 + Tailwind CSS + Vite
- **Backend**: Node.js + Express.js + WebSocket
- **Protocol**: pi.dev RPC (JSONL over stdin/stdout)

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Development mode (auto-restart on changes)
npm run dev

# Production
npm start
```

The server runs on `http://localhost:3000` by default.

## Environment Variables

| Variable     | Default | Description                          |
|-------------|---------|--------------------------------------|
| `PORT`      | `3000`  | HTTP server port                     |
| `PI_BIN`    | `pi`    | Path to the pi executable            |
| `PI_MODE`   | `rpc`   | pi subcommand to use                 |

## Architecture

The backend spawns a single `pi --mode rpc` child process. All WebSocket clients share this process:

1. **Commands** from any client → JSONL on pi stdin
2. **Events** from pi stdout → broadcast to all connected clients
3. The Vue frontend renders a real-time chat interface with streaming responses

## RPC Commands Supported

prompt, steer, follow_up, abort, bash, get_state, get_messages, set_model, cycle_model, compact, new_session, switch_session, fork, clone, export_html
