# Getting Started

**Tags:** `qa`, `getting-started`, `setup`, `installation`, `tutorial`, `quick-start`

## Prerequisites

- Node.js 18+
- npm
- Pi coding agent installed and configured (`@earendil-works/pi-coding-agent`)

## Installation

```bash
# Install all dependencies (backend + frontend)
npm run install-all

# Or install manually
cd src/backend && npm install
cd ../frontend && npm install
```

## Running in Development

```bash
# Start both backend and frontend concurrently
npm run dev

# Or start separately
npm run backend   # Backend on port 3001
npm run frontend  # Frontend on port 5173 (with proxy to backend)
```

The backend listens on `http://localhost:3001` and the frontend dev server on `http://localhost:5173`. In development mode, Vite proxies `/api` and `/ws` requests to the backend.

## Building for Production

```bash
# Build the frontend
npm run build

# Start the backend (serves the built frontend)
npm start
```

In production, the backend serves the built frontend static files from `src/frontend/dist/` with SPA fallback.

## Default Credentials

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | `super_admin` |

## Quick Test

1. Open `http://localhost:5173` (dev) or `http://localhost:3001` (production)
2. Log in with `admin` / `admin123`
3. You should see the chat interface with Pi ready
4. Send a message like "Hello, what can you do?"
5. Pi responds with streaming text

## Health Check

```bash
curl http://localhost:3001/health
# {"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

## Related

- [[Server]] — Backend entry point
- [[Architecture]] — System overview
