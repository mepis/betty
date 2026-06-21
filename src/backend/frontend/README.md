# Betty Benchmark Frontend

A minimalist, modern Vue 3 frontend for the llama.cpp benchmark API server.

## Tech Stack

- **Vue 3** — Composition API with `<script setup>`
- **Vite 6** — Fast build tool and dev server
- **Pinia** — State management
- **Vue Router 4** — Client-side routing
- **Tailwind CSS 4** — Utility-first styling
- **Axios** — HTTP client

## Project Structure

```
frontend/
├── index.html              # Entry HTML
├── vite.config.js          # Vite configuration
├── package.json
├── src/
│   ├── main.js             # App bootstrap
│   ├── App.vue             # Root component (layout + sidebar)
│   ├── router/
│   │   └── index.js        # Route definitions
│   ├── stores/
│   │   └── benchmark.js    # Pinia store (SSE, API calls)
│   ├── styles/
│   │   └── main.css        # Tailwind + custom theme
│   └── views/
│       ├── Dashboard.vue   # Main dashboard with controls & live results
│       ├── Config.vue      # Configuration editor (JSON + visual)
│       └── Reports.vue     # Report browser & viewer
└── public/
    └── vite.svg            # Favicon
```

## Features

- **Dashboard** — Real-time benchmark status, live metrics, results table, and log viewer
- **Config Editor** — Toggle between JSON and visual editing modes
- **Reports** — Browse, view, and delete saved benchmark reports
- **Live SSE** — Server-Sent Events for real-time log streaming and status updates
- **Dark Theme** — Minimal dark UI with accent colors

## Development

```bash
cd frontend
npm install
npm run dev
```

The dev server proxies API requests to `localhost:3456`.
To access from a remote machine, set `VITE_API_URL` to point to the API server:

```bash
VITE_API_URL=http://remote-host:3456 npm run dev
```

The Vite dev server binds to `0.0.0.0` by default, accessible via `http://<host-ip>:5173`.

## Production

```bash
cd frontend
npm run build
```

The built files go to `frontend/dist/`. The API server serves these statically.

## Running

```bash
# From the benchmark root
npm start          # Build frontend + start server
npm run dev        # Start server only (needs pre-built frontend)
```

Server runs on port `3456` (configurable via `API_PORT` env var).
