# Betty Benchmark

llama.cpp benchmark tool — integrated into the Betty web frontend.

## Running the Benchmark

The benchmark is accessed through the Betty web interface. Start the server and navigate to the Benchmark tab.

```bash
# Start the Betty server (includes benchmark UI and API)
npm start

# Or in dev mode
npm run dev
```

Then open `http://localhost:3000` and switch to the **Benchmark** tab.

## Build llama.cpp Only

```bash
# Build llama.cpp using configs.json settings, then exit (no benchmark run)
node index.js --build-only

# Skip build entirely (use pre-built binary)
node index.js --no-build
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
│       ├── index.js               # Benchmark runner (spawns llama-server)
│       ├── configs.json           # Benchmark configuration
│       ├── results.md             # Raw results (auto-generated)
│       └── reports/               # Saved reports (JSON)
└── package.json
```
