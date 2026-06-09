# Betty Benchmark

llama.cpp benchmark tool with a modern Vue 3 web frontend.

## Quick Start

```bash
# Build frontend and start server (remote-accessible by default)
npm start

# Or just start the server (requires pre-built frontend)
npm run dev

# Frontend development mode (separate dev server with API proxy)
npm run dev:frontend
```

Server runs on port **3456** (configurable via `API_PORT`).

## Remote Access

The server binds to `0.0.0.0` by default, making it accessible from remote machines.

### API Server (production)

```bash
# Default: accessible from any IP on port 3456
API_PORT=3456 npm start

# Custom port
API_PORT=8080 npm start

# Custom host
API_HOST=192.168.1.100 npm start
```

Access from remote: `http://<server-ip>:3456`

### Frontend Dev Server

```bash
# Bind to all interfaces (default)
VITE_HOST=0.0.0.0 npm run dev:frontend

# Point to remote API server
VITE_API_URL=http://remote-host:3456 npm run dev:frontend
```

Access from remote: `http://<server-ip>:5173`

## Environment Variables

### API Server (`.env` or environment)

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | `3456` | Port to listen on |
| `API_HOST` | `0.0.0.0` | Host to bind to (`0.0.0.0` = all interfaces) |
| `CORS_ORIGIN` | `*` | Allowed CORS origins (comma-separated or `*`) |

### Frontend (`.env` or environment)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_PORT` | `5173` | Vite dev server port |
| `VITE_HOST` | `0.0.0.0` | Vite dev server host |
| `VITE_API_URL` | `http://localhost:3456` | API server URL (for dev proxy or separate frontend) |

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Remote     │     │  API Server      │     │  Benchmark  │
│  Browser    │────▶│  (Express)       │────▶│  Process    │
│             │     │                  │     │  (Node.js)  │
│  Frontend   │     │  ┌────────────┐  │     │             │
│  (SPA)      │     │  │ Static     │  │     │  llama.cpp  │
│             │     │  │ Files      │  │     │  Server     │
│  SSE Logs   │◀────│  └────────────┘  │     │             │
│  & Results  │     │  ┌────────────┐  │     │             │
│             │     │  │ REST API   │  │     │             │
└─────────────┘     └──────────────────┘     └─────────────┘
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/status` | Current benchmark status |
| `GET` | `/api/stream` | SSE stream for live logs & results |
| `POST` | `/api/run` | Start benchmark |
| `POST` | `/api/stop` | Stop benchmark |
| `GET` | `/api/configs` | Get current configs |
| `PUT` | `/api/configs` | Update configs |
| `GET` | `/api/results` | Get raw results markdown |
| `POST` | `/api/save-report` | Save current results as report |
| `GET` | `/api/reports` | List all reports |
| `GET` | `/api/report/:name` | Get a specific report |
| `DELETE` | `/api/report/:name` | Delete a report |

## Project Structure

```
benchmark/
├── api-server.js          # Express API server + static file serving
├── index.js               # Benchmark runner
├── configs.json           # Benchmark configuration
├── results.md             # Raw results (auto-generated)
├── reports/               # Saved reports (JSON)
├── frontend/              # Vue 3 frontend source
│   ├── src/
│   │   ├── App.vue        # Layout + sidebar
│   │   ├── stores/        # Pinia state management
│   │   ├── views/         # Page components
│   │   └── router/        # Vue Router config
│   └── dist/              # Built frontend (served by API server)
└── package.json
```
