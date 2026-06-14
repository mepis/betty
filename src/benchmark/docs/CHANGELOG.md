# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Removed

- [Removed]: [2026-06-14] Revert modularization of benchmark engine — consolidate `benchmark-engine.js` module back into `index.js` and `api-server.js`; restores subprocess-based execution, stdout/stderr parsing, and inline build/clone logic in the API server

### Added

- [Added]: [2026-06-13] System memory monitoring in Dashboard Status panel — new `GET /api/system-status` endpoint reads `/proc/meminfo` and returns total/used/available GB and usage percentage; frontend displays a color-coded progress bar (green/yellow/red) that polls every 5 seconds

### Fixed

- [Fixed]: [2026-06-13] Missing closing `</div>` tag in Dashboard.vue template that caused Vue render errors

### Added

- [Added]: [2026-06-13] `.gitignore` for benchmark frontend to exclude local `.env` files while keeping `.env.example`

- [Added]: [2026-06-13] Structured benchmark message streaming — `BENCHMARK_JSON:` prefixed JSON lines emitted from `index.js` during benchmark runs, carrying `message-start`, `message-complete`, and `test-run-complete` events with full prompt/response text, token counts, and timing
- [Added]: [2026-06-13] `GET /api/messages` endpoint — REST endpoint returning all collected benchmark messages (test prompts and LLM responses) grouped by test run ID
- [Added]: [2026-06-13] Benchmark messages viewer in Dashboard — right-column panel displaying structured test run messages with prompt/response pairs, token counts, timing, and per-message badges
- [Added]: [2026-06-13] SSE event listeners for `message-start`, `message-complete`, and `test-run-complete` in the Pinia store; `fetchMessages()` and `clearMessages()` store actions

### Changed

- [Changed]: [2026-06-13] `api-server.js` — added `benchmarkMessages` and `currentTestRunMessages` arrays; `parseBenchmarkJSON()` function to extract structured JSON from benchmark stdout; reset message arrays on new benchmark start
- [Changed]: [2026-06-13] `index.js` — emit `BENCHMARK_JSON:` structured messages at message-start, message-complete, and test-run-complete points, with proper escaping for embedded quotes and newlines
- [Changed]: [2026-06-13] Dashboard layout — reorganized from stacked single-column to two-column grid (results/logs on left, messages on right); combined metrics into single card with run count; added collapsible log viewer with maximize/minimize toggle and line numbers
- [Changed]: [2026-06-13] Benchmark frontend dist — rebuilt with updated asset hashes (`index-oSA0TkQC.js`, `index-FnvWUHyx.css`)

### Fixed

- [Fixed]: [2026-06-13] Duplicate `.env.production` file renamed to `.env.productions` (typo) — both files are now tracked

### Added

- [Added]: [2026-06-11] Standalone benchmark API server — restored `api-server.js` (Express server with SSE streaming, REST API, config CRUD, results retrieval, report management, build endpoint, clone endpoint, and kill-port endpoint)
- [Added]: [2026-06-11] Standalone benchmark Vue 3 frontend — restored `frontend/` as a Vue 3 SPA with Vite 6, Pinia, Vue Router 4, and Tailwind CSS 4; Dashboard, Config, and Reports views with real-time SSE streaming
- [Added]: [2026-06-11] Benchmark npm package — new `package.json` with Express, axios, cors, dotenv, and express-rate-limit dependencies; scripts for `dev`, `dev:frontend`, `build:frontend`, and `start`

### Changed

- [Changed]: [2026-06-11] `.gitignore` — added `src/benchmark/frontend/dist/` to exclude future frontend build artifacts; current dist files are committed as initial seed

### Removed

- [Removed]: [2026-06-11] Reverted removal of standalone benchmark frontend — undoes the earlier decision to remove `frontend/` and `api-server.js`; the benchmark is now available as both a standalone tool and through the main Betty web interface

### Changed

- [Changed]: [2026-06-09] Default the configuration editor to visual mode instead of JSON mode
- [Fixed]: [2026-06-09] Initialize visual config state from store on mount for proper two-way binding

### Added

- [Added]: [2026-06-09] Comprehensive Build Settings section in Config.vue with toggle controls for basic build options (ccache, LTO), CUDA options (Flash Attention, CUDA Graphs, NCCL, peer copy, custom arch, FP16, etc.), build parameter inputs (peer batch size, max scheduled copies, compression level), quantization & precision toggles, and CUDA configuration fields (CUDA version, NVCC path)
- [Added]: [2026-06-09] `normalizeBuildParams` function to convert flat build/CUDA params into visual-enabled format with enabled/value structure
- [Added]: [2026-06-09] `flattenBuildParams` function to convert visual-enabled params back to flat format before saving
- [Added]: [2026-06-09] `toggleBuildParam`, `updateBuildParamValue`, `toggleCudaConfig`, and `updateCudaConfigValue` helper functions for visual config interaction

### Added

- [Added]: [2026-06-10] Configurable benchmark messages via `benchmark_messages` in configs.json, DEFAULT_CONFIGS, and UI in Config.vue for editing messages used to fill context during benchmarking
- [Added]: [2026-06-10] Auto-save report functionality (`saveReport`) that persists benchmark results to JSON after each test run completes, with automatic report naming based on date and model

### Changed

- [Changed]: [2026-06-10] Benchmark messages in index.js now read from configs instead of being hardcoded, with fallback to defaults

### Added

- [Added]: [2026-06-10] `--build-only` CLI flag to build llama.cpp using `configs.json` settings and exit without running benchmark tests
- [Added]: [2026-06-10] Build llama.cpp button in Config.vue with real-time SSE progress bar and build log viewer; backed by `POST /api/build` endpoint

### Added

- [Added]: [2026-06-10] Config profiles system — save, load, and delete benchmark configuration profiles via UI in Config.vue and API endpoints (`/api/profiles`, `/api/profile`, `/api/profile/:name`, `/api/profile/:name/load`), with profiles stored as JSON files in `profiles/` directory
- [Added]: [2026-06-10] Clone repository feature — modal UI in benchmark frontend with SSE-based progress streaming, supporting URL, branch, and target directory inputs; backed by `POST /api/clone` endpoint that spawns git clone with shallow depth and real-time log output
