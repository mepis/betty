# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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

### Added

- [Added]: [2026-06-10] Config profiles system — save, load, and delete benchmark configuration profiles via UI in Config.vue and API endpoints (`/api/profiles`, `/api/profile`, `/api/profile/:name`, `/api/profile/:name/load`), with profiles stored as JSON files in `profiles/` directory
- [Added]: [2026-06-10] Clone repository feature — modal UI in benchmark frontend with SSE-based progress streaming, supporting URL, branch, and target directory inputs; backed by `POST /api/clone` endpoint that spawns git clone with shallow depth and real-time log output
