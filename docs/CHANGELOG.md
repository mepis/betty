# Changelog

## [Unreleased]

### Removed

- [Removed]: [2026-06-09] Unnecessary columns from live results table — removed `Ctx Len`, `Batch`, and `GPU Layers` columns from the Dashboard live results table; these fields were always showing `—` since they are not included in the parsed `liveResults` data from `api-server.js`

### Changed

- [Changed]: [2026-06-08] Benchmark frontend API URL — updated `VITE_API_URL` in `.env.development` from `100.105.3.99` to `100.88.77.33` to point to the new API server; added `env.production` template with the previous server address

### Added

- [Added]: [2026-06-08] Speculative decoding params — new `spec_params` section in `configs.json` with `spec_type` (default `draft-mtp`) and `spec_draft_n_max` (default `3`); toggle switches and inline inputs in Config.vue visual editor; `--spec-type` and `--spec-draft-n-max` flags added to llama-server run script in `index.js`
- [Added]: [2026-06-08] Visual GPU selection editor — new toggle switch and add/remove UI in Config.vue visual editor for enabling/disabling GPU selection and managing GPU index array
- [Added]: [2026-06-08] Visual split params editor — new toggle switches and inline value inputs in Config.vue visual editor for layer_split, tensor_split, and primary_gpu split parameters

### Changed

- [Changed]: [2026-06-08] Benchmark config — disabled split_params (layer_split, tensor_split, primary_gpu); reduced build_cores from 20 to 14; downgraded CUDA from 13.3 to 13.2
- [Changed]: [2026-06-08] Frontend assets — rebuilt Vue frontend with new asset hashes
- [Changed]: [2026-06-08] SSE reliability — added `Retry-After` header to SSE endpoint; improved reconnection logic in both Vue store and vanilla JS frontend with status polling fallback when SSE drops; added 5s status polling interval as backup during long benchmarks
- [Changed]: [2026-06-08] Benchmark results table — replaced token count columns with `contextLength` and `batchSize` columns in Dashboard and Reports views for more relevant benchmark metrics

### Added

- [Added]: [2026-06-08] GPU selection config — new `gpu_selection` section in `configs.json` with `enabled`/`gpus` array (e.g., `[0, 1, 2]`); auto-generates `primaryGpu` (first GPU) and `tensorSplitValue` (equal split across GPUs) at startup; added GPU column to benchmark results table
- [Added]: [2026-06-08] `CUDACXX` path config — new `cuda_configs.cudacxx` field in `configs.json` (`/usr/local/cuda-13.3/bin/nvcc`); used by `buildEnv()`, `tryStartServer()`, and `getServerParamsSnapshot()` for consistent CUDA compiler path across build and runtime

### Removed

- [Removed]: [2026-06-08] Standalone benchmark web UI — deleted `src/benchmark/public/` (index.html, css/style.css, js/app.js) as the benchmark is now only accessed through the main Betty frontend's benchmark view

### Added

- [Added]: [2026-06-08] Standalone benchmark Vue 3 web frontend — new single-page application built with Vue 3, Pinia, Vue Router, and Tailwind CSS 4; features real-time SSE streaming for live benchmark progress, JSON and visual configuration editors, report management, and a responsive dark-themed UI
- [Added]: [2026-06-08] Model directory listing API — new `GET /api/models?directory=<path>` endpoint that scans a directory for model files (`.gguf`, `.bin`, `.safetensors`) and returns a sorted list; used by the visual config editor to populate the model dropdown
- [Added]: [2026-06-08] Configurable CORS origins — `CORS_ORIGIN` environment variable supports comma-separated origins or `*` for all; CORS preflight now explicitly allows `PUT`, `DELETE`, and `OPTIONS` methods with `Content-Type` and `Authorization` headers
- [Added]: [2026-06-08] Remote access support — `API_HOST` environment variable (default `0.0.0.0`) allows the API server to bind to all network interfaces for remote machine access
- [Added]: [2026-06-08] SPA fallback route — API server now serves `index.html` for all non-API routes to support Vue Router history mode
- [Added]: [2026-06-08] `ConfigSection` component — reusable form section component supporting `text`, `number`, `boolean`, and `select` input types with proper `v-model` two-way binding
- [Added]: [2026-06-08] Environment variable example — `.env.example` documenting all configurable API server options

- [Added]: [2026-06-07] System memory safety threshold — `max_sys_mem` config option (93%) that aborts a test run before starting if system memory usage exceeds the threshold, preventing OOM crashes; aborted runs are recorded in results with the abort reason
- [Added]: [2026-06-07] Per-message memory tracking — `getMem()` is called after each chat message and stored in the result; average memory used (GB) is calculated and reported per test run
- [Added]: [2026-06-07] Memory column in benchmark results — per-message results table includes memory used/total/%; test run averages table includes average memory used (GB); aborted runs are marked with their abort reason in both tables
- [Added]: [2026-06-07] Results file wipe on startup — existing `results.md` is wiped at the start of each benchmark run to avoid stale data

### Changed

- [Changed]: [2026-06-08] GPU split parameters — `tensor_split` and `primary_gpu` values in `split_params` are now auto-generated from `gpu_selection.gpus` at startup instead of read directly from config; tensor split is calculated as equal fractions (e.g., 3 GPUs → `33,33,33`)
- [Changed]: [2026-06-08] Benchmark config — enabled `skip_build` (set to `false`) to rebuild llama.cpp on each run
- [Changed]: [2026-06-08] API server — replaced generic `cors()` with explicit CORS configuration supporting configurable `CORS_ORIGIN` env var; added `API_HOST` env var for remote access binding; switched static file serving from `public/` to `frontend/dist/`; added SPA fallback route for Vue Router history mode; improved startup logging with host/port/directory info
- [Changed]: [2026-06-08] Benchmark package scripts — added `dev:frontend` for Vue dev server with API proxy, `build:frontend` for production build, and updated `start` to build frontend before launching server; changed `API_PORT` to parse as integer
- [Changed]: [2026-06-07] Benchmark main loop — now captures the return value from `runTestRun()` and skips the `areAllVariablesAtMax()` check when a run was aborted (configs not advanced on abort)
- [Changed]: [2026-06-07] Benchmark memory timer removed — the periodic memory logging interval was removed as it is no longer needed (memory is now tracked per-message)

### Fixed

- [Fixed]: [2026-06-07] Benchmark main loop — removed dangling `clearInterval(memTimerId)` call after removing the memory timer interval

### Changed

- [Changed]: [2026-06-07] Benchmark test parameters — moved `context_length`, `gpu_layer_offload`, `batch_size`, `u_batch_size`, and `cache_ram` (plus their step/max values) from hardcoded constants in `index.js` to a new `test_params` section in `configs.json` for centralized configuration
- [Changed]: [2026-06-07] Benchmark iteration bounds — `updateConfigs()` now caps all test variables at their configured maximums via `Math.min()` instead of unbounded increments; added `areAllVariablesAtMax()` to detect when all variables have reached their limits
- [Changed]: [2026-06-07] Benchmark result reporting — `writeResultsToMarkdown()` now runs after each test iteration for incremental reporting, not just at the end of the benchmark

### Fixed

- [Fixed]: [2026-06-07] Benchmark variable typo — renamed `cacheRamSMax` to `cacheRamMax` for consistency with other max variable names

### Added

- [Added]: [2026-06-07] Skip build option — added `skip_build` config flag and `--no-build` CLI argument to skip llama.cpp compilation; `startLlamaServer()` now uses `spawn()` with `shell: true` instead of manual command parsing; added `buildParams` cache variable to reduce repeated `configs.build_make_params` access; changed `llama_host` to 100.105.3.99

- [Added]: [2026-06-07] Image attachment support — drag & drop or click 📷 to attach up to 10 images (max 10MB each), with automatic compression (1920px max, JPEG 80% quality), inline thumbnails in chat, and base64 data URL transmission to the agent
- [Added]: [2026-06-07] Betty web frontend — a browser-based chat interface for the pi coding agent with real-time streaming, thinking block display, tool call visibility, code block rendering with copy buttons, dark theme, responsive design, auto-reconnect, session management, and model/thinking level controls
- [Added]: [2026-06-07] Right-aligned user message bubbles in chat — user messages now appear on the right with reversed header layout and adjusted bubble corner radii for a familiar chat UI
- [Added]: [2026-06-07] Command palette in chat input — type `/` to open a searchable command list with keyboard navigation, 6 built-in shortcuts (help, shortcuts, clear, compact, export, new), and live filtering against backend-provided commands

### Removed

- [Removed]: [2026-06-07] Deleted local `.pi/agents/` and `.pi/skills/` files (reviewer.md, scout.md, worker.md, and all skill definitions and references)

### Added

- [Added]: [2026-06-07] Workspace selector — sidebar 📁 button opens a directory browser modal to select which project directory the agent works in, with `WORKSPACE` environment variable for default, agent restart on change, and file icons for common project files

### Refactored

- [Changed]: [2026-06-07] Restructured project from flat layout to `src/` directory — moved `server.js` to `src/backend/server.js`, `public/index.html` to `src/frontend/public/index.html`, and `templates/project_template.md` to `src/frontend/templates/project_template.md`; updated backend path references and package.json scripts accordingly

### Added

- [Added]: [2026-06-07] llama.cpp benchmark tool (`src/benchmark/`) — automated benchmark runner that starts llama-server, sends 4 context-filling messages per test run via the `/completion` endpoint, measures total time in ms, prompt tokens/sec, and generation tokens/sec per message, logs server parameters and environment variables, writes results to `results.md` as markdown tables, and loops through config iterations (doubling context, incrementing batch/ubatch/cache sizes)
- [Added]: [2026-06-07] Benchmark config file (`src/benchmark/configs.json`) — configurable model path, CUDA build flags, model inference params (temp, top-p, top-k), multi-GPU tensor split, and llama-server runtime options
- [Added]: [2026-06-07] `axios` and `dotenv` dependencies for HTTP requests and environment variable loading in the benchmark tool

### Fixed

- [Fixed]: [2026-06-07] llama.cpp build — cmake now runs in the correct directory (`llama.cpp/`) with proper `cwd` and `env` options instead of relying on shell `export` commands that don't persist between `exec()` calls; added binary existence verification after build
- [Fixed]: [2026-06-07] llama-server spawn `ENOENT` — removed dead `export VAR=val` prefix from command string; added `cwd` to `spawn()` pointing to the binary directory; env vars now passed via spawn's `env` option
- [Fixed]: [2026-06-07] Build error messages were swallowed — `runCommand` rejected with `{ error, stderr }` but catch blocks accessed `error.message` (undefined on plain objects); now properly extracts and displays both error message and stderr
- [Fixed]: [2026-06-07] `isCloned()` — now uses `fs.statSync` to verify `llama.cpp` is a directory, not just a name in the listing

### Added

- [Added]: [2026-06-07] Verbose error display — `runBuild`, `init`, and `main` now show formatted error blocks with separator lines, stderr output, and helpful context (working directory, build cores, build directory contents)
- [Added]: [2026-06-07] 10-error limit — benchmark stops after 10 test run failures; error count displayed as `error N/10` in console output
- [Added]: [2026-06-07] `npm run benchmark` script in `package.json` to run the benchmark tool
- [Added]: [2026-06-07] Server parameters in `configs.json` — `server_params` section with `enabled`/`value` pattern for all llama-server flags (flash_attn, reasoning, profiling, presence_penalty, reasoning_budget, reasoning_budget_message, rope_scaling, jinja, parallel, n_predict, n_keep, stream, cache_prompt, cont_batching)
- [Added]: [2026-06-07] Split parameters in `configs.json` — `split_params` section with `enabled`/`value` pattern for layer_split, tensor_split, and primary_gpu

### Changed

- [Changed]: [2026-06-07] Benchmark config — disabled layer_split, tensor_split, primary_gpu, n_predict, and n_keep split params; added gpu_layers split param (value: 999); updated CUDA version from 13.3 to 13.2
- [Changed]: [2026-06-07] Benchmark build script — refactored `getBuildScript()` to use an array of flags instead of string concatenation, with improved logging of cmake flags and full command; fixed `CUDACXX` env var to only be set when present in process.env
- [Changed]: [2026-06-07] Benchmark server params — added `gpuLayers` to server params snapshot and test run configuration

### Added

- [Added]: [2026-06-07] Chat-based benchmark — switched from `/completion` to `/chat/completions` endpoint; benchmark now sends multi-turn chat requests with accumulated conversation history, extracts assistant response text, and reports `totalMessagesInContext` per message

### Changed

- [Changed]: [2026-06-07] Server lifecycle — `startLlamaServer()` now retries up to 5 times on port binding failures; `stopLlamaServer()` tries graceful `/shutdown` endpoint first then falls back to SIGTERM/SIGKILL; added `waitForPortFree()` to verify port is fully free (no TIME_WAIT)
- [Changed]: [2026-06-07] Pre-flight cleanup — added `ensureNoLlamaServer()` to detect and kill leftover llama-server processes before starting a new benchmark run; called in both `main()` and `runTestRun()`
- [Changed]: [2026-06-07] Signal handling — added SIGTERM, SIGINT, and uncaughtException handlers that gracefully stop llama-server and exit
- [Changed]: [2026-06-07] Server start logic — extracted `tryStartServer()` helper with early-death detection (3s timeout) and health polling; `startLlamaServer()` is now async with retry loop
- [Changed]: [2026-06-07] Test variable bounds — added `contextLengthMax`, `gpuLayerOffMax`, `batchSizeMax`, `uBatchSizeMax`, `cacheRamSMax` constants for future bound enforcement
- [Changed]: [2026-06-07] Results table — added "Messages in Context" column to per-message results markdown output
- [Changed]: [2026-06-07] Formatting — applied consistent line-break formatting to long if-statements and console.log calls in `getRunScript()` and `getServerParamsSnapshot()`

### Added

- [Added]: [2026-06-07] Benchmark API server (`src/benchmark/api-server.js`) — standalone Express server providing REST API and SSE streaming for the benchmark tool; supports real-time live metrics via Server-Sent Events, config CRUD, results retrieval, and report management (save/list/view/delete)
- [Added]: [2026-06-07] Benchmark REST API endpoints — `GET/PUT /api/configs` for config management, `GET /api/status` for live status, `POST /api/run` and `POST /api/stop` for benchmark lifecycle, `GET /api/results` for results data, `GET/POST/DELETE /api/report*` for report CRUD, `POST /api/save-report` to save current results as a named report, `GET /api/health` for health checks
- [Added]: [2026-06-07] SSE stream endpoint (`GET /api/stream`) — persistent SSE connection with heartbeat (15s interval), broadcasts benchmark stdout/stderr, status transitions, parsed live metrics, and exit/error events to all connected clients
- [Added]: [2026-06-07] BenchmarkManager class in main server (`src/backend/server.js`) — event-driven benchmark orchestrator with `start()`, `stop()`, `loadConfig()`, and `getResults()` methods; emits `stdout`, `stderr`, `status`, `results`, `exit`, and `error` events; parses benchmark log output for live metrics (tokens/sec, total tokens, timing, memory)
- [Added]: [2026-06-07] WebSocket benchmark commands — new WebSocket message types `benchmark_start`, `benchmark_stop`, `benchmark_get_config`, and `benchmark_get_results` handled in the main server's WebSocket handler
- [Added]: [2026-06-07] Benchmark frontend UI (`src/frontend/public/js/benchmark.js`, `src/frontend/public/css/benchmark.css`) — multi-page dashboard app with 5 views (Dashboard, Configs, Run, Results, Reports); live SSE-driven metrics display, config editor with typed fields and toggle switches, real-time log viewer, report viewer with download/delete, and responsive layout
- [Added]: [2026-06-07] App tab switching — added "Views" section in sidebar with Chat (💬) and Benchmark (⚡) tabs; `switchTab()` toggles between chat view and benchmark view, initializing the benchmark app on first visit
- [Added]: [2026-06-07] Collapsible sidebar — sidebar now supports collapse/expand state with CSS transitions; collapsed state hides sidebar content; mobile overlay for sidebar when open
- [Added]: [2026-06-07] Benchmark config schema (`src/frontend/public/js/benchmark.js`) — declarative config schema mapping JSON paths to UI field definitions (text, number, toggle types) with nested path support (e.g., `build_make_params.enable_cuda`)
- [Added]: [2026-06-07] Benchmark config categories — configs organized into 6 categories: Server, Build Parameters, Model Parameters, Server Parameters, Split Parameters, and Test Parameters, each with appropriate field types and hints

### Changed

- [Changed]: [2026-06-07] Frontend modal system replaced — replaced custom modal dialogs (select, confirm, input, editor) with native browser `prompt()`, `confirm()`, and `alert()` calls; replaced `showModal()`/`hideModal()` with `toast()` notifications for non-critical messages
- [Changed]: [2026-06-07] Dialog functions migrated — `showSelectDialog()`, `showConfirmDialog()`, `showInputDialog()`, `showEditorDialog()`, `showModal()`, `hideModal()`, `closeModal()` all removed; callers updated to use native dialogs or toast notifications
- [Changed]: [2026-06-07] Workspace selector — replaced directory browser modal with native `prompt()` for entering workspace path; `showWorkspaceModal()` now calls `prompt()` with current workspace as default
- [Changed]: [2026-06-07] Command palette display — `showCommands()` now shows available commands in a toast notification instead of a modal list
- [Changed]: [2026-06-07] Compact session — replaced custom modal with `prompt()` dialog for optional custom compaction instructions
- [Changed]: [2026-06-07] Fork session — replaced command list modal with `prompt()` showing available entry IDs for selecting fork point
- [Changed]: [2026-06-07] Help and shortcuts — replaced modal dialogs with toast notifications displaying help text and keyboard shortcuts
- [Changed]: [2026-06-07] Extension UI handlers — `select`, `confirm`, `input`, and `editor` extension UI methods now use native `prompt()` and `confirm()` instead of custom modals
- [Changed]: [2026-06-07] Benchmark config (`src/benchmark/configs.json`) — updated model from `gemma-4-E2B_q4_0-it.gguf` to `Qwen3.6-35B-A3B-Q8_0.gguf`; changed `llama_host` from `100.105.3.99` to `100.88.77.33`; enabled layer_split, tensor_split, and primary_gpu split params; increased `build_cores` from 16 to 20; updated CUDA version from 13.2 to 13.3; disabled CUDA compression; disabled jinja template; enabled gpu_layers (999); changed `cuda_max_scheduled_copies` from 16 to 14
- [Changed]: [2026-06-07] CSS variables — added new design tokens (`--bg-card`, `--border-light`, `--accent-blue/cyan/green/orange/red`, `--sidebar-width`, `--radius`, `--radius-sm`, `--btn-primary-bg/hover`, `--btn-secondary-bg/hover`, `--btn-danger-bg/hover`) for consistent theming across chat and benchmark views
