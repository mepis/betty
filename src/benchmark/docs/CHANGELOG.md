# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
