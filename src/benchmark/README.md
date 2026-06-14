# Betty Benchmark

llama.cpp benchmark tool — integrated into the Betty web frontend.

## Architecture

The benchmark uses a **modular engine design**:

- **`benchmark-engine.js`** — Reusable benchmark engine module. Contains all test logic
  (HTTP calls to llama-server, parameter advancement, build orchestration, results
  writing). Can be imported by both the CLI and the API server.
- **`index.js`** — Thin CLI wrapper (~95 lines). Loads configs, creates a `BenchmarkEngine`
  instance, and runs the benchmark loop. Supports `--no-build` and `--build-only` flags.
- **`api-server.js`** — Express API server. Imports `BenchmarkEngine` directly and calls
  its methods (no child process subprocess). Tests execute via HTTP calls to llama-server
  through the engine module.

**Before refactoring**: `index.js` was a ~800-line monolith that spawned `llama-server`
and ran all tests. `api-server.js` spawned `index.js` as a subprocess and parsed its
stdout with fragile regex to extract results.

**After refactoring**: Tests use structured HTTP calls through the engine module. The
API server calls engine methods directly — no subprocess, no regex parsing, no guessed
results.

## Running the Benchmark

The benchmark is accessed through the Betty web interface. Start the server and navigate to the Benchmark tab.

```bash
# Start the Betty server (includes benchmark UI and API)
npm start

# Or in dev mode
npm run dev
```

Then open `http://localhost:3000` and switch to the **Benchmark** tab.

## CLI Usage

```bash
# Build llama.cpp only (no benchmark tests)
node index.js --build-only

# Skip build entirely (use pre-built binary, run benchmark)
node index.js --no-build

# Full benchmark run (default)
node index.js
```

The `--build-only` flag clones/pulls the llama.cpp repo and runs the full cmake build
customized via `configs.json` (`build_make_params`, `cuda_configs`, etc.), then exits
without running any benchmark tests. Useful for rebuilding after upstream changes.

## API Endpoints

The benchmark is served by the main Betty backend at `http://localhost:3000`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/status` | Current benchmark status |
| `GET` | `/api/stream` | SSE stream for live logs & results |
| `POST` | `/api/run` | Start benchmark (direct engine call) |
| `POST` | `/api/stop` | Stop benchmark (sets isRunning flag) |
| `GET` | `/api/configs` | Get current configs |
| `PUT` | `/api/configs` | Update configs |
| `GET` | `/api/results` | Get raw results markdown |
| `POST` | `/api/save-report` | Save current results as report |
| `GET` | `/api/reports` | List all reports |
| `GET` | `/api/report/:name` | Get a specific report |
| `DELETE` | `/api/report/:name` | Delete a report |
| `POST` | `/api/build` | Build llama.cpp (direct engine call) |
| `GET` | `/api/models` | List models in a directory |
| `POST` | `/api/kill-port` | Kill processes on llama_port |
| `GET` | `/api/system-status` | System memory status |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/profiles` | List config profiles |
| `GET` | `/api/profile/:name` | Get a specific profile |
| `POST` | `/api/profile` | Save a config profile |
| `DELETE` | `/api/profile/:name` | Delete a profile |
| `POST` | `/api/profile/:name/load` | Load a profile into configs |

## Project Structure

```
betty/
├── src/
│   ├── backend/
│   │   └── server.js              # Main server (serves frontend + benchmark API)
│   ├── frontend/
│   │   └── public/
│   │       ├── index.html         # Main app (chat + benchmark tab)
│   │       ├── css/benchmark.css  # Benchmark UI styles
│   │       └── js/benchmark.js    # Benchmark UI logic
│   └── benchmark/
│       ├── benchmark-engine.js    # Core benchmark engine (reusable module)
│       ├── index.js               # CLI entrypoint (thin wrapper)
│       ├── api-server.js          # Express API server (direct engine calls)
│       ├── configs.json           # Benchmark configuration
│       ├── results.md             # Raw results (auto-generated)
│       ├── reports/               # Saved reports (JSON)
│       ├── profiles/              # Saved config profiles (JSON)
│       └── test-engine.mjs        # Unit tests for the engine
└── package.json
```
