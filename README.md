# Betty - Web Frontend for pi Coding Agent

A web-based chat interface for the [pi coding agent](https://pi.dev), accessible from any browser on the network.

## Features

- 💬 Real-time chat with streaming responses
- 🧠 Thinking block display (collapsible)
- 🔧 Tool call visibility (bash, read, edit, write, etc.)
- 📋 Code block rendering with copy buttons
- 🎨 Dark theme with clean typography
- 📱 Responsive design (works on mobile)
- 🔄 Auto-reconnect on disconnection
- 📂 Session management (new, fork, compact)
- ⚡ Model and thinking level controls
- 🖥️ Extension UI support (dialogs, confirmations)

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Open `http://localhost:3000` in your browser.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `HOST` | `0.0.0.0` | Bind address (use `0.0.0.0` for remote access) |

### Remote Access

To make Betty accessible from other computers on your network:

```bash
HOST=0.0.0.0 PORT=3000 npm start
```

Then access from another computer at `http://<your-ip>:3000`.

### Firewall

Make sure port 3000 is open:

```bash
# UFW (Ubuntu)
sudo ufw allow 3000/tcp

# firewalld (Fedora/RHEL)
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload
```

### SSH Tunnel (Alternative)

For secure remote access without opening ports:

```bash
ssh -L 3000:localhost:3000 user@your-server
```

Then access `http://localhost:3000` locally.

## Model Configuration

Betty reads your pi settings from `~/.pi/agent/settings.json`:

```json
{
  "defaultProvider": "ollama",
  "defaultModel": "Qwen3.6-35B-A3B-Q8_0.gguf"
}
```

You can switch models and thinking levels directly from the web UI sidebar.

## Architecture

```
Browser ←→ WebSocket ←→ Node.js Server ←→ pi (RPC mode)
```

- **Express** serves the static frontend
- **WebSocket** handles real-time bidirectional communication
- **pi --mode rpc** runs as a managed subprocess
- The JSONL RPC protocol bridges WebSocket messages to the agent

## License

MIT
