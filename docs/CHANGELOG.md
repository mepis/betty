# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed

- [Changed]: [2026-06-19] Benchmark — increased llama-server health polling timeout from 2 minutes (120 retries) to 5 minutes (300 retries) to allow more time for model loading
- [Changed]: [2026-06-19] Frontend routing — renamed `/config` route to `/settings` (Config.vue → Settings.vue); made Pi Chat the home route (`/`) and moved Dashboard to `/benchmark`

### Added

- [Added]: [2026-06-19] Pi Chat — "New Session" button in the status footer: creates a fresh agent session (disposes current session, resets all state, connects new SSE stream); disabled while streaming to prevent mid-turn disruption
- [Added]: [2026-06-19] Pi Chat — skills autocomplete in slash menu: `GET /api/pi/skills` endpoint lists all discovered skills via `loadSkills()` from the Pi SDK; skills are fetched on session connect and appear in the slash dropdown under a "Skills" section with `/skill:<name>` labels; keyboard navigation (arrow keys, Enter/Tab) works across both commands and skills together
- [Added]: [2026-06-19] Pi Chat — slash command autocomplete in message input: typing `/` at the start of a line shows a dropdown of 23 Pi SDK commands (mirrors TUI `BUILTIN_SLASH_COMMANDS`) with two-column layout (`/command` + description), arrow-key navigation, Enter/Tab to select, Escape/outside-click to dismiss, substring filtering, and auto-dismiss on backspace
- [Added]: [2026-06-19] Pi Chat integration — new `/pi` route with full chat UI (`PiChat.vue`) backed by Pi SDK agent sessions; includes Pinia store (`pi-chat.js`) for SSE event handling, session lifecycle management, prompt/abort/dispose operations, markdown rendering, collapsible thinking blocks, and tool call visualization; backend endpoints in `api-server.js` for session creation (`POST /api/pi/session`), SSE streaming (`GET /api/pi/session/:id/stream`), prompting (`POST /api/pi/session/:id/prompt`), abort (`POST /api/pi/session/:id/abort`), and disposal (`DELETE /api/pi/session/:id`); added `@earendil-works/pi-coding-agent` SDK dependency and `dompurify` for safe markdown rendering

### Fixed

- [Fixed]: [2026-06-19] Pi Chat — `mapAgentEvent()` now correctly reads `event.message?.role` (instead of `event.role`) and `event.assistantMessageEvent?.delta` (instead of `event.text_delta`/`event.thinking_delta`) from Pi SDK events; user messages and assistant text now appear in the chat UI
- [Fixed]: [2026-06-19] Pi Chat — `AuthStorage` and `ModelRegistry` now load from `~/.pi/agent/auth.json` and `~/.pi/agent/models.json` respectively (via `getAgentDir()`), so the configured Ollama model is resolved and tokens are generated
- [Fixed]: [2026-06-19] Pi Chat — CORS configuration fixed: `origin: true` (reflects request origin) with `credentials: false` when wildcard, avoiding the invalid `*` + `credentials: true` anti-pattern
- [Fixed]: [2026-06-19] Pi Chat — removed hardcoded `VITE_API_URL` from `.env.development`; frontend uses relative URLs in dev mode. `.env.production` cleaned up (removed `VITE_PORT`/`VITE_HOST` settings) but retains production API URL
- [Fixed]: [2026-06-19] Pi Chat — assistant messages now render during SSE streaming; added `tick` counter to Pinia store to force computed re-evaluation when `currentAssistant` nested properties (`content`, `thinking`, `toolCalls`) are mutated by SSE events, which Vue's reactivity system previously missed because the object reference didn't change
- [Fixed]: [2026-06-18] `src/benchmark/index.js` — `generateMultiplicativeArray` now guards against degenerate multipliers (≤1), zero start values, and start > max to prevent infinite loops and `RangeError: Invalid array length`

### Added

- [Added]: [2026-06-18] Grid search benchmark mode — replaces sequential parameter stepping with full cartesian product grid search over context length, GPU layer offload, batch size, uBatch size, and cache RAM; includes progress indicator, grid size warnings, and multiplicative step support for context length

- [Added]: [2026-06-18] Default report filename in Dashboard.vue — auto-populates `reportName` with `YYYY-MM-DD_HH-MM-SS_<model>` format on mount, using the configured model name with sanitized characters

### Changed

- [Changed]: [2026-06-18] Renamed `deep-research` skill to `research` — moved from `.pi/skills/deep-research/` to `.pi/skills/research/` with updated name in frontmatter and heading; functionality unchanged
- [Changed]: [2026-06-18] `src/benchmark/index.js` — replaced `Math.min` with explicit `>=` comparison for batch size, uBatchSize, and cacheRam boundary checks to correctly cap at maximum when step would exceed it

### Added

- [Added]: [2026-06-18] GPU Layer Offload controls in Config.vue — three new inputs for `gpu_layer_offload`, `gpu_layer_offload_step`, and `gpu_layer_offload_max` in the Test Parameters section; removed `gpu_layer_offload` from the build params select list

- [Added]: [2026-06-18] Custom CUDA architecture input — new text field in Config.vue to specify CMAKE_CUDA_ARCHITECTURES value (e.g. "86-real;120-real") instead of hardcoding it; value is used in both build script and cmake flags snapshot

### Added

- [Added]: [2026-06-18] Service start button — new "Start llama.service" button in Config.vue controls panel that starts the systemd service; only visible when benchmark is not running and service is inactive; paired with existing stop button

### Fixed

- [Fixed]: [2026-06-18] `scripts/install-service.sh` — service file PATH now derived from the actual npm binary location at install time instead of hardcoding the nvm node path, resolving 'env: node: No such file or directory' failures on machines with different nvm setups

### Added

- [Added]: [2026-06-18] Systemd service logs page — new `/logs` route in benchmark frontend with `Logs.vue` component that fetches and displays `journalctl` output from `llama.service` with auto-refresh (5s), auto-scroll toggle, and manual refresh button; backed by new `GET /api/logs` endpoint in `api-server.js`

- [Added]: [2026-06-18] Systemd service editor — new "Edit Service" button in Config.vue configs panel that opens a modal for editing the installed llama.service (ExecStart command, environment variables, restart policy); shows "No service installed" message if no service exists; saves trigger daemon-reload and restart; backed by `GET /api/service/config` and `POST /api/service/update` endpoints

### Changed

- [Changed]: [2026-06-18] CUDA installation replaced with version-specific scripts — deleted `scripts/init-cuda.sh` (CUDA 13.2); added `scripts/init-cuda13.3.sh` (CUDA 13.3 for newer GPUs) and `scripts/init-cuda12.9.sh` (CUDA 12.9 for older GPUs); updated `install.sh` menu to offer both CUDA versions separately, with 12.9 excluded from "Run all" due to conflicts
- [Changed]: [2026-06-18] `src/benchmark/api-server.js` — removed `export` prefix from environment variable lines in `getLaunchCommand()` (they are now `KEY=VALUE` pairs joined with `&&`); simplified `command` field to use plain `join(" ")` instead of `join(" \\\")`

### Fixed

- [Fixed]: [2026-06-18] `src/benchmark/index.js` and `api-server.js` — tensor split parameter now uses `sps.tensor_split.value` exclusively (removed auto-calculated `tensorSplitValue` fallback); applies to `getRunScript()`, `getServerParamsSnapshot()`, `runTestRun()`, `getLaunchCommand()`, and `extractConfigsPerRun()`
- [Fixed]: [2026-06-18] `scripts/install-service.sh` — `llama-benchmark.service` now uses absolute path to `npm` and sets explicit `PATH` environment variable so systemd can find the nvm-installed node executable (was failing with exit code 203/EXEC)

### Added

- [Added]: [2026-06-18] Git update feature — new `POST /api/git/update` endpoint that pulls latest changes and restarts the llama.service; "Update Available" button in sidebar triggers the update; toast notification banner with success/error feedback
- [Added]: [2026-06-18] `CUDA_SCALE_LAUNCH_QUEUES` now uses a select dropdown with configurable queue options (1x, 4x, 8x) in Config.vue

### Changed

- [Changed]: [2026-06-18] `configs.json` — normalized `enable_cuda_fp16` and `enable_cuda_compression_level` from boolean to string values
- [Changed]: [2026-06-18] Frontend dist rebuilt with new asset hashes (`index-GQWHgjsa.js`, `index-DKrWg_nR.css`)
- [Changed]: [2026-06-18] `package.json` start script — added `npm install` step in frontend build process to ensure dependencies are present before building

### Added

- [Added]: [2026-06-18] Git update checking — backend polls `git rev-parse` every hour to detect upstream updates; new `GET /api/git/update-status` endpoint; frontend sidebar shows "Update Available" warning badge when remote is ahead

### Changed

- [Changed]: [2026-06-18] `.pi/` config consolidated to project root — moved agents (reviewer, scout, worker) and skills (commit-and-push, deep-research, orchestrator, planning, playwright-cli, project-docs, testing-debugging) from `src/benchmark/.pi/` to `.pi/`; removed `src/benchmark/.pi/` and `src/benchmark/docs/CHANGELOG.md`

### Added

- [Added]: [2026-06-18] Rule 13 — Never alter `configs.json` — added AGENTS.md rule treating `configs.json` as immutable configuration

### Changed

- [Changed]: [2026-06-18] configs.json — `GGML_CUDA_P2P` disabled ("on" → "off"); model updated to `unsloth_gemma-4-E2B-it-GGUF/gemma-4-E2B-it-UD-Q6_K_XL.gguf`; `enable_cuda_graphs` normalized to string "1"; `enable_cuda_fp16` enabled; `enable_cuda_compression_level` enabled with level 3

### Fixed

- [Fixed]: [2026-06-18] `frontend/src/stores/benchmark.js` — `saveReport` now sends `{}` when no name provided instead of `{ name: undefined }`, preventing undefined name in saved reports; caller in Dashboard.vue passes `reportName.value` directly

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
