# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- [Changed]: [2026-06-18] configs.json — updated CUDA version from 13.2 to 13.3 (`cuda_version` and `cudacxx` path); enabled `enable_cuda_graphs`; disabled `enable_cuda_per_max_batch_size`, `enable_cuda_peer_copy`, and `enable_cuda_scheduled_max_copies`

- [Added]: [2026-06-18] Current launch command display — new `GET /api/launch-command` endpoint and collapsible launch command section in Dashboard sidebar; store auto-refreshes the command on every SSE status update

- [Added]: [2026-06-18] CPU usage monitoring — `GET /api/system-status` now reads `/proc/stat` with a 500ms delta to compute overall CPU percentage and per-core usage breakdown; frontend Dashboard.vue displays a System card with memory and CPU progress bars, plus a per-core details modal

- [Added]: [2026-06-18] Tooltip component — new reusable `Tooltip.vue` component with floating tooltip that appears on hover/focus, positioned below trigger element, mounted to a fixed root container

- [Added]: [2026-06-18] Delete llama.cpp repository — new `DELETE /api/build/llama/delete` endpoint and corresponding "Delete Llama" button in Config.vue with confirmation dialog; removes the entire cloned llama.cpp directory recursively

- [Added]: [2026-06-18] Build parameter tooltips — added descriptive tooltips to "Skip Build" ("Skips rebuilding llama.cpp between each test run") and "Enable ccache" ("Improves llama.cpp rebuilding speed") labels in Config.vue Build Options sections

- [Added]: [2026-06-18] Build Execution section in Config.vue — new controls for Build Cores (number) and Skip Build (toggle) in the Build Options tab

- [Added]: [2026-06-18] LLAMA_ARG_FIT toggle in Config.vue — dedicated toggle control with conditional LLAMA_ARG_FIT_TARGET and LLAMA_ARG_FIT_CTX number inputs that only appear when FIT is enabled

### Changed

- [Changed]: [2026-06-18] Dashboard controls reorganized — start/stop buttons and save report moved from sidebar to the Live Results table header for a more compact layout; nav label changed from "Dashboard" to "Run Tests"

- [Changed]: [2026-06-18] `LLAMA_ARG_FIT` refactored from string ("on"/"off") to boolean (true/false) across api-server.js, index.js, configs.json, and Config.vue; `LLAMA_ARG_FIT_TARGET` and `LLAMA_ARG_FIT_CTX` are now conditionally included only when FIT is enabled

- [Changed]: [2026-06-18] Config.vue tab layout — tabs are now fixed (do not scroll) while content area scrolls independently; `hover:bg-bg-tertiary` replaced with `hover:bg-bg-card-hover` throughout

- [Changed]: [2026-06-18] Config.vue Test Parameters section — restructured from `config-section` component to individual labeled inputs with section dividers and `min-w-[180px]` label alignment

- [Changed]: [2026-06-18] Config.vue — moved `gpu_layer_offload` from Test Parameters to Model Settings; removed `build_cores` and `skip_build` from Model Settings (moved to Build Execution); service stop button changed to `btn-warning`

- [Changed]: [2026-06-18] ConfigSection.vue — native `<select>` replaced with custom dropdown component featuring transition animations, active state highlighting, and proper click-outside dismissal

- [Changed]: [2026-06-18] Dashboard.vue — grid reorganized from 3-column to 4-column layout with new System card; added per-core CPU breakdown modal

- [Changed]: [2026-06-18] configs.json — `LLAMA_ARG_FIT` changed from "on" to `true`; `cuda_compression_level` changed from `true` to "1"; `enable_ggml_native` changed from `true` to "1"; added `gpu_layer_offload: 999`

- [Added]: [2026-06-18] Docs page in benchmark frontend — new Docs.vue view with sidebar navigation, Markdown rendering via `marked`, and support for internal `[[filename]]` cross-references; added `GET /api/docs` and `GET /api/docs/:filename` endpoints in api-server.js to list and serve docs from the docs directory; added Docs route and nav item

- [Added]: [2026-06-18] Complete documentation overhaul — removed old chat-interface docs (architecture.md, backend docs, frontend docs, llama.cpp CLI docs, frontend-improvements-report.md); added new benchmark-focused docs: USER-MANUAL.md, dashboard.md, config.md, models.md, reports.md, configuration-reference.md, api-reference.md, troubleshooting.md
- [Added]: [2026-06-18] 8 new library topic pages for Betty project documentation: betty-project/, betty-architecture/, betty-api-reference/, betty-benchmark-engine/, betty-frontend/, betty-configuration/, betty-installation/, betty-qa/
- [Added]: [2026-06-18] 6 new library tag pages: betty.md, configuration.md, express.md, installation.md, sse.md, vue.js.md
- [Added]: [2026-06-14] Systemd service installation from benchmark reports — new `POST /api/service/install` endpoint that creates a user-level systemd service from a report's launch command, with auto-restart on failure; UI button in Reports.vue modal with success/error feedback and copy-to-clipboard for status/stop commands

### Added

- [Added]: [2026-06-14] Collapsible message panels in Dashboard — click-to-toggle expand/collapse for each test run message, with animated chevron indicator, reducing visual clutter when reviewing many messages

### Added

- [Added]: [2026-06-14] AGENTS.md rule — always close the API server (`api-server.js`) when done to prevent port conflicts and resource waste

### Changed

- [Changed]: [2026-06-18] README.md — repositioned Betty from "web-based chat interface for pi coding agent" to "web-based benchmarking tool for llama.cpp"; updated features, quick start, and documentation links
- [Changed]: [2026-06-18] docs/index.md — replaced old documentation index with new benchmark-focused index pointing to updated docs
- [Changed]: [2026-06-18] library/INDEX.md — added "Project Documentation" section with 8 Betty topic entries
- [Changed]: [2026-06-18] library/tags/benchmark.md, huggingface.md, llama.cpp.md — added Betty project documentation references, reorganized into "Project Documentation" and "Research Topics" sections
- [Changed]: [2026-06-18] Benchmark frontend Config.vue — fixed service stop button visibility logic (removed `store.serviceActive &&` condition), changed stop button style from danger to ghost
- [Changed]: [2026-06-18] Benchmark frontend dist — rebuilt with new asset hashes (`index-CPhsgIe-.js`, `index-JlmzCPAq.css`)
- [Changed]: [2026-06-14] `frontend/src/views/Dashboard.vue` — added collapsible message panels with toggle/expand state management, clickable message headers with animated chevron, and `v-show` conditional rendering for message content
- [Changed]: [2026-06-14] `frontend/src/stores/benchmark.js` — added SSE connection readiness check in `startBenchmark()` (waits for SSE before starting benchmark, with 5s timeout); added `_connectingSSE` flag to prevent duplicate SSE connections and properly reset it on open/close/error events
- [Changed]: [2026-06-14] `api-server.js` — set `benchmarkStatus = "testing"` when `Test Run #` is detected in log output, ensuring status is properly reported during test execution
- [Changed]: [2026-06-14] Benchmark frontend dist — rebuilt with updated asset hashes (`index-Dxj_HuZ8.js`, `index-sJZeiiaB.css`) after collapsible message panel improvements
- [Changed]: [2026-06-14] Benchmark frontend dist — rebuilt with updated asset hashes (`index-CHrFtl5B.js`, `index-2gyIUBI_.css`) after SSE connection improvements

### Changed

- [Changed]: [2026-06-14] `api-server.js` — added `res.flush()` calls throughout all SSE endpoints (`/api/stream`, `/api/build`, `/api/clone`) to ensure real-time event delivery; added `Transfer-Encoding`, `Cache-Control`, `Connection`, and `Retry-After` to CORS exposed headers

### Fixed

- [Fixed]: [2026-06-14] `frontend/src/stores/benchmark.js` — removed `withCredentials: true` from EventSource constructor to prevent CORS issues with SSE connections
- [Fixed]: [2026-06-14] `VITE_API_URL` in `.env.production`, `scripts/update-api-url.sh`, and production dist — added missing port `:3456` to API URL so the frontend connects to the correct server address
- [Fixed]: [2026-06-14] `scripts/update-api-url.sh` — added fallback IP detection when the configured network interface is unavailable; now falls back to the first non-loopback IPv4 address

### Added

- [Added]: [2026-06-14] Tabbed visual editor in Config.vue — split configuration options into "Build Options" and "Other Options" tabs for better organization and usability
- [Added]: [2026-06-14] Pi agent project configuration — `.pi/` directory with skills (commit-and-push, deep-research, planning, playwright-cli, project-docs, testing-debugging, orchestrator), agents (reviewer, worker, scout), settings, and AGENTS.md

### Changed

- [Changed]: [2026-06-14] Benchmark frontend dist — rebuilt with updated asset hashes (`index-BOj5lmc8.js`, `index-2gyIUBI_.css`) after Config.vue tab interface changes

### Removed

- [Removed]: [2026-06-14] Revert modularization of benchmark engine — consolidate `benchmark-engine.js` module back into `index.js` and `api-server.js`; restores subprocess-based execution, stdout/stderr parsing, and inline build/clone logic in the API server
- [Removed]: [2026-06-14] Flat visual editor layout in Config.vue — replaced with tabbed interface separating build-specific options from general/environment/model configurations

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

- [Removed]: [2026-06-18] Old documentation — deleted docs/CHANGELOG.md (merged into src/benchmark/docs/CHANGELOG.md), architecture.md, backend/ directory (9 files), llama.cpp_docs/ directory (20 files), frontend-improvements-report.md, old docs/index.md
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
