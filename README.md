# Betty — AI Coding Assistant (Web UI)

A modern web interface for [pi](https://pi.dev), the minimal terminal coding harness. Built with **Vue 3**, **Vite**, **Pinia**, and **WebSocket** communication.

## Architecture

```
┌──────────────────┐                          ┌──────────────────┐
│   Vue 3 Frontend  │  HTTP/WS (same port)   │  Node.js Server  │
│   (Vite dev /     │ ◄────────────────────► │  (HTTPS + WS)    │
│    Vite build)    │   JSON messages        │                  │
└──────────────────┘                          └────────┬─────────┘
                                                       │
                                                 stdin/stdout (JSONL)
                                                       │
                                                ┌──────▼───────┐
                                                │    pi RPC     │
                                                │  --mode rpc   │
                                                └──────────────┘
```

In **dev mode**: Vite dev server (:5173) serves the frontend, proxies API calls to the server (:3001).
In **production mode**: The Node.js server serves static files from `dist/` and handles WebSocket connections on the same port.

## Prerequisites

- **Node.js 20+**
- **pi** installed globally (`npm install -g @earendil-works/pi-coding-agent`)
- **API key** for an LLM provider (Anthropic, OpenAI, etc.)

### Setting up an API key

```bash
# Option 1: Environment variable
export ANTHROPIC_API_KEY=sk-ant-...

# Option 2: pi login (interactive OAuth)
pi /login

# Option 3: models.json for custom providers
# Edit ~/.pi/agent/models.json
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set your API key (if not already set)
export ANTHROPIC_API_KEY=sk-ant-...

# 3. Start both server and frontend (hot-reload)
npm run dev

# 4. Open http://localhost:5173
```

### Separate processes

```bash
# Terminal 1 — Backend server
npm run dev:server

# Terminal 2 — Frontend dev server
npm run dev:client
```

### Production

```bash
# Build and start in one command
npm run start:prod

# Or separately:
npm run build
npm start
```

The server now serves the built frontend **and** handles WebSocket connections on the same port (default 3001).

### Remote Access (HTTPS)

For remote access, enable HTTPS. The server supports two modes:

#### Self-signed certificate (local/testing)

```bash
# .env
HTTPS=true

npm run start:prod
```

On first start, a self-signed certificate is auto-generated in `.certs/`. Trust it in your browser:

- **Chrome**: Visit `https://localhost:3001`, click "Advanced" → "Proceed to localhost"
- **Firefox**: Visit `https://localhost:3001`, click "Advanced" → "Accept the Risk and Continue"

#### Custom certificate (production)

```bash
# .env
HTTPS=true
HTTPS_CERT_PATH=/path/to/fullchain.pem
HTTPS_KEY_PATH=/path/to/privkey.pem

npm run start:prod
```

#### With a reverse proxy (nginx, Caddy, etc.)

For production deployments, use a reverse proxy for TLS termination:

```nginx
# nginx example
server {
    listen 443 ssl;
    server_name betty.example.com;

    ssl_certificate     /etc/letsencrypt/live/betty.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/betty.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Then keep `HTTPS=false` in `.env` (the proxy handles TLS).

### Authentication & RBAC

Betty supports multi-user authentication with role-based access control.

#### Setup

Generate a JWT secret and set it in `.env`:

```bash
# Generate a secret (run once)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Add to .env
JWT_SECRET=your-generated-secret-here
```

On first start, a default admin user is created:
- **Username**: `admin` (customizable via `DEFAULT_ADMIN_USERNAME`)
- **Password**: `admin` (customizable via `DEFAULT_ADMIN_PASSWORD`)

> ⚠️ **Important**: Change the default admin password immediately after first login via the admin panel.

#### Roles

| Role | Chat | Sessions | User Management |
|------|------|----------|----------------|
| **admin** | ✅ | ✅ | ✅ |
| **user** | ✅ | ✅ | ❌ |
| **viewer** | ❌ | Read-only | ❌ |

#### Disabling Authentication

For single-user/local deployments, disable auth:

```bash
# .env
AUTH_ENABLED=false
```

#### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | — | Login, returns JWT token |
| `GET` | `/api/me` | Bearer token | Get current user info |
| `GET` | `/api/users` | Admin | List all users |
| `POST` | `/api/users` | Admin | Create user |
| `PUT` | `/api/users/:id` | Admin | Update user (role/password) |
| `DELETE` | `/api/users/:id` | Admin | Delete user |

#### WebSocket Authentication

Include the JWT token in the WebSocket URL:

```javascript
const ws = new WebSocket(`wss://host:3001?token=${jwtToken}`);
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WS_PORT` | `3001` | Server port (HTTP/HTTPS + WebSocket on same port) |
| `HTTPS` | `false` | Enable HTTPS (set to `true`) |
| `HTTPS_CERT_PATH` | — | Path to TLS certificate PEM file |
| `HTTPS_KEY_PATH` | — | Path to TLS private key PEM file |
| `PI_PROVIDER` | — | LLM provider (e.g., `anthropic`, `openai`) |
| `PI_MODEL` | — | Model ID (e.g., `claude-sonnet-4-20250514`) |
| `PI_NO_SESSION` | `false` | Disable session persistence |
| `PI_SESSION_DIR` | — | Custom session storage directory |
| `PI_THINKING_LEVEL` | — | Thinking level (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`) |
| `PI_VERBOSE` | `false` | Enable verbose logging |
| `JWT_SECRET` | — | **Required** for auth. JWT signing secret |
| `AUTH_ENABLED` | `true` | Enable authentication (set `false` to disable) |
| `DEFAULT_ADMIN_USERNAME` | `admin` | Default admin username |
| `DEFAULT_ADMIN_PASSWORD` | `admin` | Default admin password (change after first login) |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_WS_URL` | `ws://localhost:3001` | WebSocket server URL (overrides auto-detection) |
| `VITE_WS_PORT` | `3001` | WebSocket port (used when VITE_WS_URL is not set) |

## Features

- 💬 Real-time streaming chat with WebSocket
- 🔐 Multi-user authentication with JWT
- 👥 Role-based access control (admin, user, viewer)
- 🤖 Model switching (dropdown selector)
- 💭 Thinking level cycling (click badge)
- 📂 Session management (sidebar)
- 🔄 Context compaction
- ⌨️ Keyboard shortcuts (Enter to send, Shift+Enter for newline)
- 📱 Responsive design (mobile-friendly sidebar)
- 🌙 Dark theme (GitHub Dark style)
- 🛠️ Tool call visibility (shows bash, read, edit, write results)
- ⚙️ Settings panel (thinking level, session info, compaction)
- 👤 Admin user management panel

## WebSocket Protocol

> **Note**: When auth is enabled, connect with `?token=<jwt>` query parameter.

### Server → Client (Auth Events)

```json
{ "type": "connected", "user": { "id": "...", "username": "...", "role": "admin" } }
{ "type": "auth_required" }
{ "type": "auth_error", "message": "Invalid or expired token" }
```

### Client → Server

```json
{ "type": "prompt", "message": "Hello", "images": [...] }
{ "type": "abort" }
{ "type": "set_model", "provider": "anthropic", "modelId": "claude-sonnet-4-20250514" }
{ "type": "set_thinking_level", "level": "high" }
{ "type": "cycle_model" }
{ "type": "cycle_thinking_level" }
{ "type": "new_session" }
{ "type": "compact", "customInstructions": "..." }
{ "type": "get_state" }
{ "type": "get_messages" }
{ "type": "get_available_models" }
{ "type": "get_session_stats" }
{ "type": "get_fork_messages" }
{ "type": "fork", "entryId": "..." }
{ "type": "clone" }
{ "type": "switch_session", "sessionPath": "..." }
{ "type": "set_session_name", "name": "..." }
{ "type": "get_commands" }
{ "type": "bash", "command": "ls -la" }
```

### Server → Client

```json
{ "type": "connected" }
{ "type": "message_update", "delta": "Hello", "contentIndex": 0 }
{ "type": "agent_start" }
{ "type": "agent_end", "messages": [...] }
{ "type": "tool_execution_start", "toolCallId": "...", "toolName": "bash" }
{ "type": "tool_execution_end", "toolCallId": "...", "isError": false }
{ "type": "state", "data": { "model": {...}, "thinkingLevel": "medium" } }
{ "type": "models", "data": { "models": [...] } }
{ "type": "error", "message": "..." }
{ "type": "ui_request", "id": "...", "method": "confirm", ... }
```

## Project Structure

```
betty/
├── server.ts              # Node.js backend (HTTPS + WebSocket + RPC wrapper + auth + static files)
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── package.json
├── index.html              # Entry HTML
├── .env                    # Environment variables
├── .certs/                 # Auto-generated self-signed certificates (when HTTPS=true)
├── data/                   # User data store (users.json, created at runtime)
├── dist/                   # Production build output (served by server)
└── src/
    ├── main.ts             # Vue app entry
    ├── App.vue             # Main component (chat UI + modals)
    ├── types.ts            # TypeScript types for WS protocol
    ├── server/
    │   ├── userStore.ts    # JSON-file user store with bcrypt hashing
    │   ├── auth.ts         # JWT token generation/validation
    │   └── permissions.ts  # Role-based access control
    ├── stores/
    │   ├── chat.ts         # Pinia store (WebSocket client, chat state)
    │   └── auth.ts         # Pinia store (authentication state)
    └── components/
        ├── LoginPage.vue          # Authentication login page
        └── UserManagement.vue     # Admin user management panel
```

## Extending

### Adding new WebSocket commands

1. Add the command type to `server.ts` `handlerMap`
2. Add the corresponding type to `src/types.ts`
3. Add the handler in `src/stores/chat.ts` `handleWsMessage`
4. Add UI in `src/App.vue`

### Customizing the theme

Edit CSS variables in `src/App.vue` `:root`:

```css
:root {
  --bg-primary: #0d1117;
  --accent: #58a6ff;
  /* ... */
}
```

## License

MIT
