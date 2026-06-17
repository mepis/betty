# Betty - Web Frontend for pi Coding Agent

A web-based chat interface for the [pi coding agent](https://pi.dev), accessible from any browser on the network.

## Features

- 🔐 **User authentication** — JWT-based login with secure password hashing
- 👤 **Multi-user support** — First user becomes admin automatically
- 🔄 **Persistent sessions** — httpOnly cookies with automatic refresh
- 📱 **Responsive design** — Works on mobile and desktop
- 💬 Real-time chat with streaming responses
- 🖼️ **Image attachments** - drag & drop or click 📷 to attach images (up to 10MB each, max 10 images)
- 🧠 Thinking block display (collapsible)
- 🔧 Tool call visibility (bash, read, edit, write, etc.)
- 📋 Code block rendering with copy buttons
- 🎨 Dark theme with clean typography
- 📱 Responsive design (works on mobile)
- 🔄 Auto-reconnect on disconnection
- 📂 Session management (new, fork, compact)
- ⚡ Model and thinking level controls
- 🖥️ Extension UI support (dialogs, confirmations)
- 📁 **Workspace selector** - switch between projects/repos

- 💬 Real-time chat with streaming responses
- 🖼️ **Image attachments** - drag & drop or click 📷 to attach images (up to 10MB each, max 10 images)
- 🧠 Thinking block display (collapsible)
- 🔧 Tool call visibility (bash, read, edit, write, etc.)
- 📋 Code block rendering with copy buttons
- 🎨 Dark theme with clean typography
- 📱 Responsive design (works on mobile)
- 🔄 Auto-reconnect on disconnection
- 📂 Session management (new, fork, compact)
- ⚡ Model and thinking level controls
- 🖥️ Extension UI support (dialogs, confirmations)
- 📁 **Workspace selector** - switch between projects/repos

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
| `WORKSPACE` | `$HOME` | Default working directory for the agent |
| `AUTH_ENABLED` | `true` | Enable/disable authentication |
| `JWT_SECRET` | *(generated)* | Secret key for signing access tokens |
| `JWT_REFRESH_SECRET` | *(generated)* | Secret key for signing refresh tokens |
| `JWT_EXPIRES_IN` | `24h` | Access token expiration time |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token expiration time |

### Authentication

Betty includes built-in user authentication to protect access to the coding agent.

**Getting started:**
1. Start Betty for the first time
2. You'll be redirected to the registration page
3. Create your admin account (first user is always admin)
4. You'll be logged in automatically and redirected to the chat

**Additional users:**
- From the login page, click "Create one" to register new accounts
- Each user gets their own sessions and workspace access

**Security features:**
- Passwords are hashed with bcrypt (cost factor 12)
- Sessions use httpOnly cookies (immune to XSS token theft)
- Access tokens expire after 24 hours
- Refresh tokens allow silent re-authentication for 7 days
- Rate limiting on login (10/min) and registration (3/min)

**Disabling authentication:**
Set `AUTH_ENABLED=false` in your `.env` file. This is useful for single-user setups or local development.

**Token rotation:**
To change JWT secrets (e.g., after a security concern), update the secrets in `.env` and restart Betty. All existing sessions will be invalidated.

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

## Workspace Selection

Betty includes a workspace selector in the sidebar. Click the 📁 button to browse directories and select which project to work in. The agent will restart with the new working directory.

You can also set a default workspace via the `WORKSPACE` environment variable:

```bash
WORKSPACE=/home/jon/git/my-project npm start
```

## Image Support

Betty supports sending images to the agent for visual analysis. You can attach images by:

- **Drag & drop** images onto the input area
- **Click the 📷 button** to open a file picker
- **Multi-image support** - attach up to 10 images per message
- **Automatic compression** - images are resized (max 1920px) and compressed to JPEG at 80% quality
- **File size limit** - 10MB per image

Images are sent as base64 data URLs in the OpenAI-compatible format:
```json
{
  "type": "image_url",
  "image_url": { "url": "data:image/jpeg;base64,..." }
}
```

Images are displayed as thumbnails in the chat alongside your message text.

## Architecture

```
Browser ←→ WebSocket ←→ Node.js Server ←→ pi (RPC mode)
```

- **Express** provides API endpoints
- **WebSocket** handles real-time bidirectional communication
- **pi --mode rpc** runs as a managed subprocess with the selected working directory
- The JSONL RPC protocol bridges WebSocket messages to the agent

## License

MIT
