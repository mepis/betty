# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Removed

- [Removed]: [2026-06-28] `src/frontend/src/views/PiChat.vue` — removed tool call rendering from the chat window; tool calls still execute (SSE events are still processed in the store) but are no longer displayed in the UI

### Changed

- [Changed]: [2026-06-28] Version bumped to 1.0.90

- [Changed]: [2026-06-28] Version bumped to 1.0.89
- [Changed]: [2026-06-28] `src/backend/api-server.js` — `/api/service/install` now fetches reports from the database via `getReport()` instead of reading JSON files from disk, making it consistent with the MySQL data layer migration

### Fixed

- [Fixed]: [2026-06-28] `src/frontend/src/stores/pi-chat.js` — tool calls now display correctly in the chat window; the processing indicator stays visible during tool execution; restructured SSE event handling so `currentAssistant` is only finalized after all tool calls complete (`pi-agent-end`) instead of at `pi-message-end` which fires before tool execution events

- [Fixed]: [2026-06-28] `src/backend/db/data-layer.js` — removed redundant `JSON.parse()` calls in `getConfigs()` and `getReport()` since `db.jsonGet()` already parses JSON columns via `parseJsonColumns()`; replaced with type-safe guards (`typeof === 'object'`, `Array.isArray()`) to prevent crashes from double-parsing already-deserialized values

### Added

- [Added]: [2026-06-28] Comprehensive documentation expansion — 33 new documentation pages across `docs/backend/` (api-server, authentication, benchmark-runner, database, data-layer, sse-streaming), `docs/concepts/` (auth-flow, config-schema, data-flow, grid-search), `docs/features/` (benchmark-engine, chat-templates, huggingface-integration, library, library-import-export, mmproj-models, pi-chat, profiles, service-profiles, systemd-service, system-monitoring), `docs/frontend/` (overview, benchmark-store, auth-store, pi-chat-store, views, components), and `docs/qa/` (getting-started, benchmark-workflow, model-management, service-management, profile-workflow, report-workflow, api-usage)
- [Added]: [2026-06-28] `docs/architecture.md` — comprehensive rewrite with enhanced Mermaid diagrams (system overview, component architecture, data flow, benchmark lifecycle), component responsibilities tables, and detailed database schema documentation
- [Added]: [2026-06-28] `docs/index.md` — reorganized documentation index with new sections: Features, Backend Modules, Frontend Modules, Concepts, Practical Examples (QA), Research

### Changed

- [Changed]: [2026-06-28] Version bumped to 1.0.88
- [Changed]: [2026-06-28] Version bumped to 1.0.87
- [Changed]: [2026-06-28] `docs/tags.md` — updated tag cross-reference index with entries for all 33 new documentation pages; added new tag categories and expanded existing tags
- [Changed]: [2026-06-28] `docs/llama-cpp-parameters.md` — added frontmatter tags (reference, llama-cpp, parameters, build, cuda, developer)

### Fixed

- [Fixed]: [2026-06-28] `src/backend/api-server.js` — added `streamingBehavior: "steer"` to the prompt endpoint's `session.prompt()` call so that messages sent while the agent is processing steer the conversation instead of throwing "Agent is already processing" error
- [Fixed]: [2026-06-28] `src/backend/db/data-layer.js` — `getReport()` now maps snake_case DB columns back to camelCase and parses JSON fields (`live_results` → `liveResults`, `md_content` → `mdContent`, `saved_at` → `savedAt`, `configs_per_run` → `configsPerRun`, `configs` → `configs`), fixing the issue where reports appeared empty/broken when opened from the Reports tab in the Admin page after the MySQL data layer was added
- [Fixed]: [2026-06-28] `src/backend/api-server.js` — removed incorrect `entry.resume()` call in `extractWithProgress()` `onentry` callback; the `tar` module handles entry consumption internally and calling `resume()` drains the entry data before the extraction pipeline can pipe it to the output file, resulting in 0-byte files during library import

- [Fixed]: [2026-06-28] `src/backend/api-server.js` — library import now uses `fs.createReadStream` piped into `tarT` instead of passing the file path directly, enabling streaming reads for large tar.gz archives and reducing memory usage during import

- [Fixed]: [2026-06-27] `src/backend/api-server.js` — fixed GPU stats query to calculate `memoryUsedPercent` from `memory.used` and `memory.total` instead of querying the non-existent `memory.used_percent` field in nvidia-smi

- [Fixed]: [2026-06-27] `src/backend/api-server.js` — added explicit authentication check for `/library/export` and `/library/import` endpoints, ensuring they always require auth regardless of exempt list configuration

- [Fixed]: [2026-06-27] `src/backend/api-server.js` — moved `/api/library/:topicSlug` and `/api/library/tag/:tagname` routes after `/api/library/export` and `/api/library/import` so Express matches literal routes before the parameterized catch-all, preventing "export" and "import" from being treated as topic slugs

### Added

- [Added]: [2026-06-28] `src/frontend/src/views/PiChat.vue` — added a processing indicator banner (spinning icon + "Agent is processing..." text) above the input area when the agent is running, with smooth enter/leave transitions

- [Added]: [2026-06-27] GPU monitoring — `/api/system-status` now returns `gpuStats` array with per-GPU core utilization, VRAM usage, and temperature; displayed in SystemStats component and Dashboard

- [Added]: [2026-06-27] `src/frontend/src/views/Settings.vue` — `handleSaveServiceProfile()` now auto-fills the profile name from the service description if the user hasn't provided one, deriving a sensible default by stripping the "Llama.cpp Benchmark Service -" prefix

### Changed

- [Changed]: [2026-06-28] Version bumped to 1.0.85
- [Changed]: [2026-06-28] Version bumped to 1.0.83
- [Changed]: [2026-06-27] `src/frontend/src/components/SystemStats.vue` — switched per-core CPU breakdown layout from vertical stack (`space-y-2`) to 5-column grid (`grid grid-cols-5 gap-3`) for more compact and readable display
- [Changed]: [2026-06-27] Version bumped to 1.0.82
- [Changed]: [2026-06-27] Version bumped to 1.0.81
- [Changed]: [2026-06-27] Version bumped to 1.0.79
- [Changed]: [2026-06-27] Version bumped to 1.0.78
- [Changed]: [2026-06-27] Version bumped to 1.0.77
- [Changed]: [2026-06-27] `src/frontend/src/views/Dashboard.vue` — widened the report name input field from `w-36` to `w-64` so longer report names are visible

### Fixed

- [Fixed]: [2026-06-27] `src/backend/db/data-layer.js` — `getServiceProfile()` now returns `profile.data` instead of the raw `profile` wrapper from `db.jsonGet()`, fixing cases where callers received the full response object instead of the profile data
- [Fixed]: [2026-06-27] `src/backend/api-server.js` — fixed infinite recursion in `saveReport()` which called itself instead of `saveReportData()`, blocking the event loop and crashing benchmarks after the first test run
- [Fixed]: [2026-06-27] `src/backend/api-server.js` — added `uncaughtException` and `unhandledRejection` handlers to prevent server crashes from unhandled errors
- [Fixed]: [2026-06-27] `src/backend/api-server.js` — wrapped `saveReport()` call in `flushSummary()` with `.catch()` to prevent unhandled rejections from blocking log parsing
- [Fixed]: [2026-06-27] `src/backend/api-server.js` — added `processAlive` to `test-run-complete` SSE broadcast for consistency with other events
- [Fixed]: [2026-06-27] `src/backend/index.js` — added null guards to `getMem()` for `/proc/meminfo` parsing to prevent crashes on unexpected format
- [Fixed]: [2026-06-27] `src/backend/index.js` — wrapped `writeResultsToMarkdown()` in try-catch so file write failures don't crash the benchmark
- [Fixed]: [2026-06-27] `src/backend/index.js` — added `unhandledRejection` handler to prevent unhandled promise rejections from crashing the process
- [Fixed]: [2026-06-27] `src/frontend/src/stores/benchmark.js` — SSE `status` handler now preserves existing `liveResults` when server sends empty array during active benchmark, preventing stale status events from clearing results
- [Fixed]: [2026-06-27] `src/backend/api-server.js` — added `flushSummary()` call before emitting `test-run-complete` message and after parsing benchmark JSON lines, ensuring pending summaries are flushed before state transitions
- [Fixed]: [2026-06-27] `src/backend/api-server.js` — added `processAlive` field to all SSE responses (stream, run completion, error, log parsing) so the frontend can accurately track whether the benchmark process is still running
- [Fixed]: [2026-06-27] `src/frontend/src/stores/benchmark.js` — `processAlive` now reflects server-provided value (`data.processAlive`) instead of being hardcoded to `true` on every SSE event, allowing the frontend to correctly detect process termination
- [Fixed]: [2026-06-27] `src/frontend/src/main.js` — 401 redirect now uses `router.push()` instead of `window.location.href`, preserving SPA navigation instead of triggering a full page reload on token expiry
- [Fixed]: [2026-06-26] `src/backend/api-server.js` — changed `tar` import from default (`import tar from "tar"`) to named imports (`import { create as tarCreate, t as tarT, x as tarX } from "tar"`), and updated call sites (`tarCreate`, `tarT`, `tarX`) for library export/import to match

### Changed

- [Changed]: [2026-06-27] Version bumped to 1.0.76
- [Changed]: [2026-06-27] Version bumped to 1.0.75

### Changed

- [Changed]: [2026-06-27] Version bumped to 1.0.74

### Changed

- [Changed]: [2026-06-26] Version bumped to 1.0.73

### Added

- [Added]: [2026-06-26] Library export/import — new "Library" tab in Admin page allows exporting the entire library as a downloadable tar.gz archive and importing a tar.gz archive back into the library directory

### Changed

- [Changed]: [2026-06-26] Version bumped to 1.0.72

### Fixed

- [Fixed]: [2026-06-26] `saveConfigs()` in `data-layer.js` — removed early `return` after successful DB save so the JSON file is always written; wrapped JSON save in its own try-catch so `index.js --build-only` can reliably read configs from the JSON file regardless of DB state

### Fixed

- [Fixed]: [2026-06-26] `handleBuild()` in Settings.vue — current build configuration is now flattened and saved via `store.saveConfigs()` before triggering the llama.cpp build, ensuring the config snapshot matches what was on screen when Build was clicked

### Changed

- [Changed]: [2026-06-26] Version bumped to 1.0.70

### Added

- [Added]: [2026-06-26] Benchmark progress logging — per-run start/end timestamps, elapsed time per test run, and estimated remaining time displayed in the benchmark loop output
- [Added]: [2026-06-26] Pi Chat — `/new` slash command handled locally in `sendMessage()`, calling `handleNewSession()` to reset the frontend context without sending the command to the agent

### Changed

- [Changed]: [2026-06-26] Version bumped to 1.0.69
- [Changed]: [2026-06-26] `src/backend/index.js` — increased llama-server health check timeout from 5 minutes (300 retries) to 15 minutes (900 retries) to accommodate large models that need more time to load
- [Changed]: [2026-06-26] `src/backend/index.js` — replaced carriage-return progress indicator with newline-based progress output including estimated remaining time calculation
- [Changed]: [2026-06-26] Version bumped to 1.0.68

### Added

- [Added]: [2026-06-26] User management UI — new `Users.vue` view with full CRUD operations (create, read, update, delete users); includes user list table with role badges, creation date, edit/delete actions per row; create and edit modals with form validation; toast notifications for success/error feedback; self-deletion prevention (cannot delete own account)
- [Added]: [2026-06-26] Auth store admin methods — `fetchUsers()`, `updateUser()`, `deleteUser()`, `createUser()` added to `auth.js`; all methods use Bearer token authorization, manage loading/error state, and return structured responses from the API
- [Added]: [2026-06-26] "Users" tab in Admin panel — added to `Admin.vue` tab list with async component import for `Users.vue`

### Changed

- [Changed]: [2026-06-26] Version bumped to 1.0.67
- [Changed]: [2026-06-26] `scripts/update.sh` — simplified update flow: removed explicit `systemctl --user stop`, now runs `npm install` in both root and frontend directories followed by a single `systemctl --user restart betty.service`

### Fixed

- [Fixed]: [2026-06-26] `stopLlamaServer()` — wrapped `serverProcess.kill("SIGTERM")` in try-catch to handle race condition where the process exits between the liveness check and the kill call; also set `serverProcess = null` in the SIGKILL fallback path to prevent stale references

### Removed

- [Removed]: [2026-06-26] `memTimer` constant and associated `clearInterval(memTimerId)` call in `main()` — unused timer that was set but never served a purpose

- [Fixed]: [2026-06-25] ConfigSection — model options are now objects (`{ path, size, mtime }`) and the dropdown correctly extracts the `path` property for display, selection comparison, and stored value
- [Fixed]: [2026-06-25] Benchmark store — SSE endpoints (`/api/build` and `/api/hf/download`) now pass the auth token as a query parameter instead of an `Authorization` header, fixing authentication reliability with SSE fetch connections
- [Fixed]: [2026-06-25] Models page — mmproj (multimodal projector) model files are now filtered out from the main models list using a `filteredModels` computed property, preventing them from appearing alongside regular model files in the grouped file browser

### Changed

- [Changed]: [2026-06-25] Version bumped to 1.0.65
- [Changed]: [2026-06-25] `scripts/update.sh` — update process now stops the service, installs npm dependencies in both root and `src/frontend/` directories, then restarts; replaces the previous approach of just stashing, pulling, and restarting without installing dependencies

### Added

- [Added]: [2026-06-25] Database backend — MySQL (MariaDB) primary with SQLite fallback and JSON file last-resort fallback; unified `db.js` abstraction layer with `init()`, `query()`, `get()`, `all()`, `run()`, `jsonGet()`, `jsonAll()`, `jsonRun()`, `close()` methods; three-tier fallback: MySQL → SQLite (`~/.betty/betty.db`) → JSON files (`~/.betty/*.json`); new `db/schema.sql` with tables for users, configs, reports, profiles, service_profiles, chat_templates, settings, and migrations; new `db/data-layer.js` providing high-level functions for all data operations; new `db/json-store.js` implementing the same interface as `db.js` for JSON file fallback; new `db/migrate.js` CLI tool for bidirectional migration between SQLite, MySQL, and JSON files
- [Added]: [2026-06-25] Database configuration via environment variables — `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SQLITE_PATH`, `DB_POOL_SIZE` documented in `.env.example`
- [Added]: [2026-06-25] JWT secret persistence — JWT secret now stored in database `settings` table with file fallback for backward compatibility
- [Added]: [2026-06-25] Chat templates — downloaded templates now stored in database alongside filesystem files for persistence

### Changed

- [Changed]: [2026-06-25] All data storage migrated from JSON files to database layer — users, configs, reports, profiles, service profiles, chat templates, and settings now stored in database (MySQL primary, SQLite fallback, JSON last resort); API endpoints unchanged — same HTTP contracts
- [Changed]: [2026-06-25] `user-store.js` — replaced all `fs.readFileSync/writeFileSync` with `db.*` calls; user data now stored in `users` table
- [Changed]: [2026-06-25] `api-server.js` — all config, report, profile, service profile, and chat template operations now use `db/data-layer.js` functions; JWT secret initialization moved to async `initJwtSecret()` function; auth initialization moved to async `initAuth()` function
- [Changed]: [2026-06-25] `auth/routes.js` — all user-store functions are now async; login, register, password change, and user management endpoints updated
- [Changed]: [2026-06-25] SQL schema uses `REPLACE INTO` for upserts instead of MySQL-specific `ON DUPLICATE KEY UPDATE` for cross-database compatibility

### Fixed

- [Fixed]: [2026-06-25] Schema application — fixed `applySchemaSync` to use `db.exec()` with full schema for SQLite instead of splitting by semicolons (which incorrectly filtered out all statements due to comment lines)
- [Fixed]: [2026-06-25] Column name mapping — database uses snake_case column names (`password_hash`, `created_at`, `updated_at`) with SQL aliases (`AS passwordHash`, `AS createdAt`, `AS updatedAt`) for compatibility with existing code expecting camelCase

### Removed

- [Removed]: [2026-06-25] Direct JSON file reads/writes for structured data — all config, user, report, profile, and service profile data now goes through the database abstraction layer

### Dependencies

- [Added]: [2026-06-25] `mysql2` (^3.9.0) — MySQL/MariaDB driver with promise support
- [Added]: [2026-06-25] `better-sqlite3` (^11.0.0) — fast synchronous SQLite3 driver

- [Added]: [2026-06-25] Logs page — tabbed interface for switching between `llama.service` and `betty.service` logs; new `GET /api/logs/betty` backend endpoint fetching `betty.service` journalctl logs (last 1000 lines); each tab has independent loading/error state, refresh button, and auto-scroll toggle; both services auto-refresh every 5 seconds

### Changed

- [Changed]: [2026-06-25] Logs page — refactored from single log source to tabbed multi-service view; each service tab maintains independent state (loading, error, auto-scroll, refresh); backend comment for `/api/logs` updated to clarify it serves `llama.service`

### Fixed

- [Fixed]: [2026-06-25] Admin page — removed rounded corners from tabs and removed background color from tab bar container
- [Fixed]: [2026-06-25] Library page — `LIBRARY_DIR` now uses `process.env.BETTY_LIBRARY_DIR` environment variable with `~/.betty/library` as fallback, allowing the library path to be configured per-host when the server runs under a different user or the library is stored in a non-standard location
- [Fixed]: [2026-06-25] Library page — fixed `extractLibraryTags()` to parse `**Tags:** tag1, tag2, tag3` format used in library topic index files; previously all topics showed empty tags

### Changed

- [Changed]: [2026-06-25] Settings.vue — converted the Update button in the Actions panel to a text-only link with `text-sm text-text-muted hover:text-accent cursor-pointer` styling, matching the other Actions panel buttons; removed icon SVG and button classes
- [Changed]: [2026-06-25] Settings.vue — added `block` class to all Actions panel buttons (Kill Port, Start/Stop Service, Edit Service, Update, Delete Build, Delete Llama) to ensure each button renders on its own line

### Fixed

- [Fixed]: [2026-06-25] Settings.vue — chat template and mmproj model dropdown selectors in the Run Options tab now open independently; replaced single shared `openDropdown` ref with separate `openChatTemplateDropdown` and `openMmprojDropdown` refs so clicking one dropdown no longer toggles both

### Changed

- [Changed]: [2026-06-25] Settings.vue — converted Actions panel buttons (Kill Port, Start/Stop Service, Edit Service, Update, Delete Build, Delete Llama) to text-only links with `text-sm text-text-muted hover:text-accent cursor-pointer` styling; removed icon SVGs and button classes; expanded Config Profiles and Service Profiles panels by default

- [Changed]: [2026-06-25] Settings.vue — refined admin settings grid layout from `auto_1fr_1fr` to `1fr_3fr_3fr` for more balanced column proportions and better use of horizontal space

### Added

- [Added]: [2026-06-25] MMPROJ (multimodal projector) support — `--mmproj` flag in Settings Run Options with toggle and dropdown to select mmproj model files from `~/.betty/models/`; `--mmproj` flag passed to llama.cpp in launch command; new `MMPROJ Models` admin tab with download form (URL + optional filename) and mmproj model file list with delete capability; new backend endpoints: `GET /api/mmproj-models`, `POST /api/mmproj/download` (SSE progress), `DELETE /api/mmproj/:filename`; new store actions `fetchMmprojModels()`, `downloadMmproj()`, `deleteMmproj()` in `benchmark.js`; `mmproj` config added to `DEFAULT_CONFIGS.server_params`
- [Added]: [2026-06-25] Models search download — optional custom filename field in the HuggingFace model download modal, allowing users to specify a custom output filename when downloading models
- [Added]: [2026-06-25] Models Downloads tab — replaced HuggingFace download history with local models browser showing files from `~/.betty/models/`; models displayed grouped by directory with file sizes, type icons (🤖 .gguf, 📄 .bin, 🛡️ .safetensors), and delete buttons; new `DELETE /api/model/:path` backend endpoint with path traversal protection; `findModelFiles()` now returns `{ path, size, mtime }` objects instead of plain strings; store action `deleteLocalModel()` added to `benchmark.js`

### Changed

- [Changed]: [2026-06-25] `downloadHfModel()` store action now accepts an optional 4th parameter `customFilename` for specifying a custom output filename on download

### Changed

- [Added]: [2026-06-25] Research Library — re-added Library view (`Library.vue`) with sidebar topic navigation, tag-based filtering, topics table with summary/preview, and detail view showing index + full report; auto-refresh every 60s with manual refresh button; new backend endpoints: `GET /api/library` (list topics), `GET /api/library/:topicSlug` (topic detail with index/report/state), `GET /api/library/tags` (list tags), `GET /api/library/tag/:tagname` (filter by tag); `/api/library` added to auth exemptions

### Fixed

- [Fixed]: [2026-06-25] Settings.vue — fixed left column in admin settings grid to use auto width instead of equal third, preventing unnecessary horizontal stretching via `lg:grid-cols-[auto_1fr_1fr]`

### Changed

- [Changed]: [2026-06-25] Settings.vue — moved "Build llama.cpp" card from left column to right column for improved layout organization

### Fixed

- [Fixed]: [2026-06-25] Grid search combination generation refactored in `index.js` — batch size and uBatch size are now handled separately from static params (contextLength, gpuLayerOffload, cacheRam) via new `generateBatchPermutations()` function, avoiding wasteful full cartesian product generation followed by filtering; batch permutations are generated with the `batchSize >= uBatchSize` constraint built-in, and detailed batch permutation output added to grid search configuration display
- [Fixed]: [2026-06-25] Grid search now filters out invalid combinations where `batchSize < uBatchSize` in `index.js`; both `getLaunchCommand()` and `extractConfigsPerRun()` in `api-server.js` clamp `batchSize` to `Math.max(batchSize, uBatchSize)` so llama.cpp never receives an invalid ubatch > batch configuration

### Added

- [Added]: [2026-06-25] Chat template file selection in Settings — dropdown to select a Jinja chat template file (`~/.betty/chat_templates/*.json`) when Jinja mode is enabled; `--chat-template-file` flag passed to llama.cpp in both launch command (`api-server.js`) and run script (`index.js`); chat templates fetched on Settings mount; helper functions `joinChatTemplatePath()` and `getTemplateName()` for path management

- [Added]: [2026-06-25] Chat Templates management — download, list, and delete chat template files stored in `~/.betty/chat_templates/`; new `GET /api/chat-templates`, `POST /api/chat-templates/download` (SSE progress), and `DELETE /api/chat-templates/:filename` endpoints in `api-server.js`; new `ChatTemplates.vue` view with download form, progress bar, saved templates list, and toast notifications; new store actions `fetchChatTemplates()`, `downloadChatTemplate()`, `deleteChatTemplate()` in `benchmark.js`; "Chat Templates" tab added to Admin page; `~/.betty/chat_templates` directory created on install
- [Added]: [2026-06-25] Server Params section in Settings — new config section exposing `jinja` (Jinja Template Mode) boolean toggle; `server_params` object auto-initialized in `normalizeBuildParams()` to prevent undefined errors
- [Added]: [2026-06-25] Install script directories — `scripts/install-service.sh` now creates `~/.betty/library`, `~/.betty/users`, and `~/.betty/chat_templates` directories on install; fixed duplicate "profiles directory" echo (was printing twice, now correctly prints "reports directory")

### Added

- [Added]: [2026-06-25] Service Profile View — "View" button in the Service Profiles list opens a read-only modal displaying the saved profile's description, ExecStart command, environment variables, restart policy, and restart delay; new `fetchServiceProfile(name)` method in benchmark store

### Changed

- [Changed]: [2026-06-25] Service Edit Modal — widened modal to `80vw` and increased ExecStart textarea height for better editing experience

### Changed

- [Changed]: [2026-06-25] Admin Settings tab — expanded grid from 2 to 3 columns; moved Config Profiles and Service Profiles panels into the new middle column

### Added

- [Added]: [2026-06-25] Service Config Profiles — save, list, load, and delete named snapshots of the current `llama.service` systemd configuration (ExecStart, env vars, restart settings); stored in `~/.betty/service-profiles/`; new panel in Admin Settings alongside Config Profiles

- [Added]: [2026-06-24] Rule 15 — "Consult the research library" — added to `.pi/AGENTS.md`; instructs agents to check `~/.betty/library/INDEX.md` for archived research before starting new work

### Changed

- [Changed]: [2026-06-24] `playwright-cli` skill — all `playwright-cli open` commands now default to `--headed` mode across SKILL.md, all reference docs, and the web-search.sh script; added prominent callout at top of SKILL.md emphasizing headed mode

### Removed

- [Removed]: [2026-06-24] `playwright-cli` web-search.md — removed note stating "DuckDuckGo and Google block headless browsers with CAPTCHAs" (no longer relevant with headed mode as default)

### Changed

- [Changed]: [2026-06-24] Research library moved from `library/` (repo-local) to `~/.betty/library/` (user home directory); updated all references in `.pi/AGENTS.md`, `.pi/skills/planning/SKILL.md`, `.pi/skills/project-docs/SKILL.md`, `.pi/skills/research/SKILL.md`, and `docs/architecture.md`

### Added

- [Added]: [2026-06-24] User account settings page with self-service password change (`GET /account`)
- [Added]: [2026-06-24] `PUT /api/auth/password` endpoint — authenticated users can change their own password with current password verification, minimum 8-char validation, and bcrypt rehashing
- [Added]: [2026-06-24] User authentication and authorization with role-based access control (RBAC)
- [Added]: [2026-06-24] `src/backend/auth/user-store.js` — File-based user storage with CRUD operations; stores users in `~/.betty/users.json`
- [Added]: [2026-06-24] `src/backend/auth/middleware.js` — JWT authentication middleware (`authenticate`, `authorize`, `optionalAuth`) supporting Bearer tokens and SSE query param tokens
- [Added]: [2026-06-24] `src/backend/auth/routes.js` — Auth API endpoints: `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`, `GET/PUT/DELETE /api/auth/users/:username`
- [Added]: [2026-06-24] `src/frontend/src/stores/auth.js` — Pinia auth store with login, register, logout, session restoration, and axios 401 interceptor
- [Added]: [2026-06-24] `src/frontend/src/views/Login.vue` — Login/register page with form validation and role selection
- [Added]: [2026-06-24] `src/frontend/src/router/index.js` — Route guards for authentication and role-based access; redirects unauthenticated users to login
- [Added]: [2026-06-24] `src/frontend/src/App.vue` — User info display in header, conditional sidebar navigation based on role, logout button
- [Added]: [2026-06-24] Three roles: `admin` (full access), `operator` (run benchmarks, manage reports/profiles), `viewer` (read-only)
- [Added]: [2026-06-24] First-user auto-promotion: the first registered user becomes admin automatically
- [Added]: [2026-06-24] Default admin user created on first startup (username: `admin`, password: `admin` with warning)
- [Added]: [2026-06-24] `BETTY_AUTH_ENABLED` env var to enable/disable authentication (default: true)
- [Added]: [2026-06-24] `JWT_SECRET` auto-generation and persistence in `~/.betty/jwt-secret`
- [Added]: [2026-06-24] SSE connections include JWT token via query parameter for authentication
- [Added]: [2026-06-24] `src/backend/api-server.js` — new `DELETE /api/hf/download/active/:modelId` endpoint to cancel in-progress HuggingFace model downloads; new `GET /api/hf/active-downloads` endpoint to list active downloads with progress
- [Added]: [2026-06-24] `src/backend/api-server.js` — AbortController-based download cancellation for HuggingFace model downloads, with cleanup of partial files and stream destruction
- [Added]: [2026-06-24] `src/frontend/src/stores/benchmark.js` — `hfActiveDownloads` state, `fetchActiveDownloads()`, and `cancelActiveDownload()` methods
- [Added]: [2026-06-24] `src/frontend/src/views/Models.vue` — "In Progress" section in Downloads tab showing active downloads with real-time progress bars and cancel buttons; auto-polling every 2s for download progress updates

### Fixed

- [Fixed]: [2026-06-24] `src/backend/api-server.js` — HuggingFace download cancellation now properly stops the fetch request, destroys streams, and cleans up partial files instead of leaving orphaned downloads

- [Added]: [2026-06-24] `src/frontend/src/views/Admin.vue` — new Admin page with tabbed interface providing unified access to Benchmark, Models, Settings, Reports, Logs, and Sys Info views

### Changed

- [Changed]: [2026-06-24] `src/backend/api-server.js` — added role-based access control to all API routes; admin-only routes (build, service, git update, kill-port), operator+ routes (run, stop, configs PUT, profiles, reports), and viewer+ routes (status, configs GET, profiles GET, reports GET, models, HF, docs, logs, system-status, pi chat SSE)
- [Changed]: [2026-06-24] `src/frontend/src/stores/benchmark.js` — SSE connections now include JWT token via query parameter for authentication
- [Changed]: [2026-06-24] `src/frontend/src/stores/pi-chat.js` — SSE connections now include JWT token via query parameter for authentication
- [Changed]: [2026-06-24] `src/frontend/src/main.js` — added axios 401 interceptor for automatic redirect to login on token expiration; added auth session restoration on app startup
- [Changed]: [2026-06-24] `package.json` — added `bcrypt` and `jsonwebtoken` dependencies
- [Changed]: [2026-06-24] `.env.example` — added authentication configuration variables (`BETTY_AUTH_ENABLED`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_PASSWORD`)
- [Changed]: [2026-06-24] `src/frontend/src/App.vue` — sidebar navigation consolidated from 7 items (Chat, Benchmark, Models, Settings, Reports, Docs, Logs) to 3 items (Chat, Docs, Admin); replaced individual nav items with single Admin entry; removed Sys Info sidebar button and header conditional logic
- [Changed]: [2026-06-24] `src/frontend/src/router/index.js` — added `/admin` route for the new Admin page
- [Changed]: [2026-06-24] `src/frontend/src/views/PiChat.vue` — removed inline memory usage bar and related helper functions (`formatMemoryGB`, `memoryBarColor`)
- [Changed]: [2026-06-24] `package-lock.json` — version bumped from `1.0.32` to `1.0.34`

### Removed

- [Removed]: [2026-06-24] `library/` — entire research library directory deleted from repo; library is now hosted externally at `~/.betty/library/`
- [Removed]: [2026-06-24] `.pi/skills/project-rules/SKILL.md` — deleted; project rules are now defined in `.pi/AGENTS.md` and `.pi/APPEND_SYSTEM.md`
- [Removed]: [2026-06-24] `src/frontend/src/components/SysInfoModal.vue` — deleted; sys info functionality now accessible via Admin page tabs
- [Removed]: [2026-06-24] `src/frontend/src/stores/benchmark.js` — removed `showSysInfo` state (no longer needed without modal)
- [Removed]: [2026-06-24] `src/frontend/src/views/Dashboard.vue` — removed embedded SysInfoModal component reference

- [Changed]: [2026-06-24] `.pi/AGENTS.md` — consolidated project documentation lookup guide from `.pi/APPEND_SYSTEM.md` into AGENTS.md as a new "Project Documentation Lookup" section; added "Modifying Pi" section and Rule 14 ("Favor this repo first"); updated Additional Documentation section to reference `src/docs/`
- [Changed]: [2026-06-24] `.pi/skills/project-rules/SKILL.md` — simplified description from verbose multi-line text to concise "Always read this skill before responding."

### Added

- [Added]: [2026-06-24] `.pi/extensions/agents-md.ts` — Pi extension that injects `.pi/AGENTS.md` content into the agent system prompt via the `before_agent_start` hook, replacing the previous APPEND_SYSTEM.md approach

### Removed

- [Removed]: [2026-06-24] `.pi/APPEND_SYSTEM.md` — deleted; its documentation lookup content was consolidated into `.pi/AGENTS.md`
- [Removed]: [2026-06-24] `.pi/plan-pi-chat.md` — deleted; Pi Chat integration plan is no longer needed (feature implemented)

- [Added]: [2026-06-23] `src/frontend/src/components/MemoryBar.vue` — reusable memory usage bar component with color-coded progress (green <70%, yellow 70-90%, red >90%)
- [Added]: [2026-06-23] `src/frontend/src/views/Dashboard.vue` — real-time memory usage bar in status panel; polls `systemMemory` from benchmark store every 5 seconds with color-coded progress bar
- [Added]: [2026-06-23] `src/frontend/src/views/PiChat.vue` — real-time memory usage bar in status footer; polls `systemMemory` from benchmark store every 3 seconds with color-coded progress bar (green <70%, yellow 70-90%, red >90%)

### Changed

- [Changed]: [2026-06-23] `src/frontend/src/views/PiChat.vue` — thinking blocks now open by default for the latest assistant message and collapsed for older ones; tool call `<details>` elements now have two-way sync between native `open` state and Vue `tool.expanded` state so toggling persists correctly

- [Changed]: [2026-06-23] `src/frontend/src/views/Dashboard.vue` — Controls panel moved from inline card to modal; new "Controls" button added next to Live Logs header; grid reduced from 4 to 2 columns (Status, Metrics); system memory/CPU polling removed from Dashboard and moved to Sys Info modal (1.5s refresh vs 5s)
- [Changed]: [2026-06-23] `src/frontend/src/views/Docs.vue`, `Logs.vue`, `Models.vue`, `Reports.vue`, `Settings.vue`, `Dashboard.vue` — added `m-2` padding wrapper for consistent page margin across all views
- [Changed]: [2026-06-23] `src/frontend/src/views/PiChat.vue` — input area and status footer background changed from `bg-bg-secondary` with borders to `bg-bg-primary` without borders; input flex alignment changed from `items-end` to `items-center`; footer padding adjusted for proper spacing
- [Changed]: [2026-06-23] `src/frontend/src/App.vue` — header border removed; header padding increased from `py-3` to `py-5`; header title conditionally shows "Sys Info" when modal is open
- [Changed]: [2026-06-23] `src/frontend/src/router/index.js` — removed route descriptions from Models, Logs, and PiChat meta; removed Library route entirely
- [Changed]: [2026-06-23] `src/frontend/src/views/Dashboard.vue` — `showLaunchCommand` default changed from `false` to `true` (launch command visible by default)
- [Changed]: [2026-06-23] `src/frontend/src/views/Dashboard.vue` — CPU modal per-core bar height reduced from `h-5` to `h-4`
- [Changed]: [2026-06-23] Version bump — `package.json` / `package-lock.json` bumped from `1.0.30` to `1.0.31`

### Added

- [Added]: [2026-06-23] `src/frontend/src/components/SystemStats.vue` — reusable component displaying system memory and CPU stats with progress bars and per-core breakdown
- [Added]: [2026-06-23] `src/frontend/src/components/SysInfoModal.vue` — modal component that displays system stats overlay; triggered by new "Sys Info" sidebar button; polls system status every 1.5s while open
- [Added]: [2026-06-23] `src/frontend/src/views/SysInfo.vue` — dedicated Sys Info view for standalone access via `/sys-info` route; polls system status every 5s
- [Added]: [2026-06-23] "Sys Info" button added to sidebar in `src/frontend/src/App.vue` with icon; opens a modal showing real-time system memory and CPU stats
- [Added]: [2026-06-23] `src/frontend/src/stores/benchmark.js` — new `showSysInfo` state for modal visibility control
- [Added]: [2026-06-23] `src/frontend/src/router/index.js` — new `/sys-info` route registered
- [Added]: [2026-06-23] `src/frontend/src/views/Dashboard.vue` — new Controls modal with environment variables editor and launch command viewer, accessible via "Controls" button next to Live Logs header

### Removed

- [Removed]: [2026-06-23] `src/frontend/src/views/Library.vue` — removed Library view for browsing research topics
- [Removed]: [2026-06-23] `src/frontend/src/App.vue` — Library navigation item removed from sidebar
- [Removed]: [2026-06-23] `src/frontend/src/router/index.js` — `/library` route removed
- [Removed]: [2026-06-23] `src/backend/api-server.js` — `GET /api/library` and `GET /api/library/topic/:slug` endpoints removed along with all library parsing helpers (`slugToTitle`, `extractFrontmatter`, `parseTags`, `parseDate`, `parseStatus`, `parseSummary`)

- [Added]: [2026-06-23] `src/frontend/src/views/Library.vue` — new Library view to browse and read research topics from the library, with sidebar navigation, topic detail, report, state, and entry views; dynamic index table showing all topics with date, status, tags, and summary preview; auto-refresh every 60s with manual refresh button
- [Added]: [2026-06-23] `src/frontend/src/views/Docs.vue` — dynamic index table showing all docs with title, description, and tags; auto-refresh every 60s with manual refresh button; matches Library view pattern
- [Added]: [2026-06-23] `src/backend/api-server.js` — `GET /api/docs` now extracts frontmatter tags and description from each doc; new `GET /api/library` endpoint lists all library topics with extracted metadata (title, date, tags, status, summary); new `GET /api/library/topic/:slug` endpoint returns full topic content (index.md, report.md, state.md, and entries/)
- [Added]: [2026-06-23] Library navigation item added to sidebar in `src/frontend/src/App.vue` and route registered in `src/frontend/src/router/index.js`

- [Added]: [2026-06-22] `library/topics/llama-cpp-parameters-reference/` — comprehensive analytical report covering all ~200+ llama.cpp parameters across 12 research categories: build config, CPU instruction sets, GPU backends, CLI parameters, sampling, speculative decoding, server deployment, environment variables, deprecated parameters, and presets
- [Added]: [2026-06-22] `docs/llama-cpp-parameters.md` — comprehensive reference documentation for all llama.cpp build options, CLI parameters, server-specific parameters, environment variables, deprecated parameters, and presets (495 parameter entries across 6 sections)

- [Added]: [2026-06-21] `src/backend/api-server.js` — new `GET /api/models-dir` endpoint returns the configured `MODELS_DIR` path so the frontend can discover the default models directory without prior knowledge
- [Added]: [2026-06-21] `src/frontend/src/stores/benchmark.js` — new `modelsDir` state and `fetchModelsDir()` action to retrieve and cache the default models directory from the backend; `fetchModels()` now falls back to `modelsDir` when no directory is explicitly provided

### Changed

- [Changed]: [2026-06-21] `src/frontend/src/App.vue` — sidebar navigation label changed from "Pi" to "Chat" for consistency with the updated page title
- [Changed]: [2026-06-21] `src/frontend/src/views/PiChat.vue` — header title and empty-state heading changed from "Pi Chat" to "Chat" for a cleaner label
- [Changed]: [2026-06-21] `src/frontend/src/router/index.js` — route meta title changed from "Pi Chat" to "Chat"
- [Changed]: [2026-06-21] `src/backend/api-server.js` — `GET /api/models` no longer requires the `directory` query parameter; defaults to `MODELS_DIR` when omitted
- [Changed]: [2026-06-21] `src/frontend/src/views/Settings.vue` — model directory fallback chain updated: uses `store.configs.model_directory` first, then `store.modelsDir`, ensuring models load correctly on initial page load before any profile is loaded

### Fixed

- [Fixed]: [2026-06-21] `src/frontend/src/stores/pi-chat.js` — `restoreSession()` is now async: after loading from localStorage it waits for SSE `onopen` (up to 3s); if SSE fails (stale/pruned session or timeout), it clears stale state and automatically creates a new session as a fallback
- [Fixed]: [2026-06-21] `src/frontend/src/stores/pi-chat.js` — added `clearStaleSession()` action to disconnect SSE, clear localStorage, and reset all session-related state when the restored session is no longer valid
- [Fixed]: [2026-06-21] `src/frontend/src/views/PiChat.vue` — simplified `onMounted` to a single `await store.restoreSession()` call since the store now handles the stale-session fallback internally

### Changed (earlier)

- [Changed]: [2026-06-21] `src/backend/api-server.js` — `PROFILES_DIR` changed from project-local `src/backend/profiles/` to user-level `~/.betty/profiles/`; profile storage now lives alongside reports and model downloads

- [Changed]: [2026-06-21] `src/backend/api-server.js` — `REPORTS_DIR` changed from project-local `reports/` to user-level `~/.betty`; reports are now saved, listed, and loaded from `~/.betty` instead of the backend directory
- [Changed]: [2026-06-21] `scripts/install-service.sh` — creates `~/.betty`, `~/.betty/profiles`, and `~/.llm_models` directories on install if they do not exist
- [Changed]: [2026-06-21] `src/backend/api-server.js` — model directory changed from project-relative `hf_downloads/` to user-level `~/.llm_models/`; added `LLM_MODELS_DIR` constant, aliased as `HF_DOWNLOAD_DIR`; `DEFAULT_CONFIGS.model_directory` now defaults to `"~/.llm_models"`
- [Changed]: [2026-06-21] `src/backend/api-server.js` — `resolveConfigPath()` now expands `~/` prefix to `os.homedir()` for tilde-prefixed paths
- [Changed]: [2026-06-21] `src/backend/index.js` — `resolveConfigPath()` now expands `~/` prefix to `os.homedir()` for tilde-prefixed paths
- [Changed]: [2026-06-21] `scripts/install-service.sh` — creates `~/.llm_models` directory on install if it does not exist
- [Changed]: [2026-06-21] Version bump — `package.json` bumped from `1.0.13` to `1.0.14`

### Added

- [Added]: [2026-06-21] `src/backend/scripts/update-api-url.sh` — automatically creates `src/frontend/.env.production` if missing: first copies from `.env.example` if available, otherwise generates the file with all required default values (`VITE_PORT`, `VITE_HOST`, `VITE_API_URL`)

### Changed

- [Changed]: [2026-06-21] Version bump — `package.json` / `package-lock.json` bumped from `1.0.11` to `1.0.12`

### Changed

- [Changed]: [2026-06-21] `src/backend/scripts/update-api-url.sh` — removed `USE_EXPLICIT_API_URL` conditional: script now always detects the machine's IP and sets `VITE_API_URL` explicitly; falls back to a warning (leaving the URL as-is) if IP detection fails instead of silently using relative URLs
- [Changed]: [2026-06-21] Version bump — `package.json` bumped from `1.0.10` to `1.0.11`

### Changed

- [Changed]: [2026-06-21] `src/backend/api-server.js` — frontend static file serving is now conditional: checks if the build directory exists before mounting `express.static()`, logging a warning if missing so the API server still works without the frontend
- [Changed]: [2026-06-21] `src/backend/api-server.js` — SSE `sendToClient()` now catches write errors, removes the disconnected client from `streamingClients`, and logs the error instead of silently failing
- [Changed]: [2026-06-21] `src/backend/api-server.js` — all systemd service endpoints now check for Linux platform and `systemctl` availability, returning a 501 error on unsupported platforms instead of crashing
- [Changed]: [2026-06-21] `src/backend/scripts/update-api-url.sh` — complete cross-platform rewrite: supports Linux (`ip`), macOS/BSD (`ifconfig`), and WSL; uses relative URLs (empty `VITE_API_URL`) by default; sets explicit IP only when `USE_EXPLICIT_API_URL=1` is set in `.env`
- [Changed]: [2026-06-21] `src/frontend/.env.example` — `VITE_API_URL` now defaults to empty (relative URLs) instead of a hardcoded IP
- [Changed]: [2026-06-21] Version bump — `package-lock.json` bumped from `1.0.9` to `1.0.10`
- [Changed]: [2026-06-21] Frontend directory relocated from `src/backend/frontend/` to `src/frontend/` — frontend is now a sibling of `src/backend/` rather than nested inside it; all path references updated in `package.json` scripts, `src/backend/api-server.js` (FRONTEND_DIR), `src/backend/scripts/update-api-url.sh` (PROJECT_ROOT/ENV_FILE), and `src/frontend/vite.config.js` (simplified path resolution using `process.cwd()`)
- [Changed]: [2026-06-21] `src/frontend/vite.config.js` — removed unused imports (`fileURLToPath`, `URL`, `dirname`), replaced `__dirname`-based path resolution with `process.cwd()`-based paths for cleaner, more portable configuration
- [Changed]: [2026-06-21] Version bump — `package.json` bumped from `1.0.9` to `1.0.10`
- [Changed]: [2026-06-21] `.pi/APPEND_SYSTEM.md` — expanded from a single-line instruction to a comprehensive project documentation lookup guide with categorized file listing, usage guidelines, and instructions about modifying pi via extensions, skills, and APPEND_SYSTEM.md
- [Changed]: [2026-06-21] Version bump — `package.json` / `package-lock.json` bumped from `1.0.8` to `1.0.9`

### Added

- [Added]: [2026-06-21] `.env.example` — root-level environment example documenting `API_PORT`, `API_HOST`, `NET_INTERFACE`, `USE_EXPLICIT_API_URL`, and `CORS_ORIGIN` configuration options

### Removed

- [Removed]: [2026-06-21] `.pi/skills/project-docs-lookup/` — deleted the standalone skill; its documentation lookup content is now consolidated into `.pi/APPEND_SYSTEM.md` which is always loaded

### Changed

- [Changed]: [2026-06-21] Renamed `src/benchmark/` to `src/backend/` — full directory rename across entire project; all path references updated in package.json, .gitignore, docs, library topics, scripts, api-server.js, and plan-pi-chat.md; frontend now lives at `src/backend/frontend/` instead of `src/benchmark/frontend/`

### Removed

- [Removed]: [2026-06-21] `.env.example` — removed root-level environment example file (settings now managed via `src/backend/frontend/.env.production` and runtime detection)

### Added

- [Added]: [2026-06-21] `src/backend/` — new backend directory containing the integrated benchmark server: `index.js` (benchmark runner spawning llama-server with grid search, health polling, and structured JSON output), `api-server.js` (Express API server with SSE streaming, REST endpoints for configs/profiles/reports/models/service control, Pi SDK agent session integration, HuggingFace model search/download, git update checking, and systemd service management), `scripts/update-api-url.sh` (auto-detects machine IP and updates frontend API URL)
- [Added]: [2026-06-21] `src/frontend/` — new frontend directory containing the Vue 3 SPA: Vite 6 build with Tailwind CSS 4, Pinia state management, Vue Router 4; views include Dashboard (benchmark run controls, live results table, system monitoring), Settings (visual config editor with tabs, build options, config profiles, actions panel), Reports (saved benchmark reports with sortable results table and launch command viewer), Models (HuggingFace model search/download with progress), Pi Chat (agent chat UI with Pi SDK sessions, SSE streaming, thinking blocks, tool calls, slash commands, skills autocomplete), Docs (markdown documentation viewer with cross-references), Logs (systemd service log viewer with auto-refresh); Pinia stores for benchmark state and Pi chat session management with localStorage persistence; reusable components (Tooltip, ConfigSection)
- [Added]: [2026-06-21] `.gitignore` — added exclusion rules for `src/backend/` generated files (llama.cpp, hf_downloads, node_modules, reports, results.md, .env, profiles) and `src/frontend/` generated files (node_modules, dist, env.*)
- [Added]: [2026-06-21] Pi Chat session persistence — the Pi chat window (homepage) now persists the session ID and message history to `localStorage`. On page reload or navigation back, the session and all previous messages are restored automatically. The SSE connection is reconnected to the existing server session. Clicking "New Session" clears the persisted data and starts fresh.
- [Added]: [2026-06-21] `.pi/APPEND_SYSTEM.md` — added system prompt append file directing the agent to consult `docs/` for comprehensive project documentation

### Fixed

- [Fixed]: [2026-06-21] Pi Chat — made chat window responsive on small viewports: root container now uses `min-h-0` for proper flex collapsing, input area and status footer marked `flex-shrink-0` so the New Session button and controls never bleed off the bottom, status footer wraps gracefully with `flex-wrap gap-2` on narrow screens
- [Fixed]: [2026-06-21] Pi Chat — added text wrapping to all markdown prose elements in `PiChat.vue`: `.pi-prose` container now uses `overflow-wrap: break-word` and `word-break: break-word` to prevent long words, URLs, and code from bleeding off screen; inline code, paragraphs, tables, and table cells all wrap; user and error message bubbles also wrapped with `break-words` class

### Added

- [Added]: [2026-06-21] Documentation overhaul — added frontmatter tags to all existing docs (USER-MANUAL.md, api-reference.md, config.md, configuration-reference.md, dashboard.md, models.md, reports.md, troubleshooting.md); restructured docs/index.md into Getting Started, Feature Documentation, Reference, Practical Examples, and Support sections; added new docs: architecture.md (system design with Mermaid diagrams), logs.md, pi-chat.md, tags.md (tags index); added QA example docs: qa-installation.md, qa-benchmark-run.md, qa-model-download.md, qa-troubleshooting.md; added library/tags.md for library topic cross-reference; fixed wiki link format across all docs (removed pipe labels, e.g., `[[Dashboard|Dashboard]]` → `[[dashboard]]`)
- [Added]: [2026-06-21] project-docs-lookup skill — new `.pi/skills/project-docs-lookup/` skill for looking up project documentation in docs/ and other sources when answering questions
- [Added]: [2026-06-21] AGENTS.md — added "Additional Documentation" section directing agents to consult `docs/` for comprehensive project documentation

### Changed

- [Changed]: [2026-06-21] docs/index.md — reorganized documentation index into categorized sections (Getting Started, Feature Documentation, Reference, Practical Examples, Support) with links to all existing and new pages

### Added

- [Added]: [2026-06-21] Project rules skill — new `project-rules` skill in `.pi/skills/project-rules/` containing all AGENTS.md rules for per-session auto-loading by the agent

### Changed

- [Changed]: [2026-06-21] Benchmark frontend — updated `VITE_API_URL` in `.env.production` from `100.88.77.33:3456` to `192.168.2.156:3456`

### Fixed

- [Fixed]: [2026-06-20] `package.json` — fixed JSON syntax error: removed stray quote character from `""version"` key (was `""version": "1.0.7"`, now `"version": "1.0.7"`)
- [Changed]: [2026-06-20] Version bump — `package.json` / `package-lock.json` bumped from `1.0.7` to `1.0.8`

### Fixed

- [Fixed]: [2026-06-20] Benchmark frontend — restructured `App.vue` layout to use proper flex column hierarchy (`flex flex-col min-h-0` on `<main>` and page content `<div>`), enabling child views to use `h-full` instead of hardcoded `calc(100vh - X)` height values; `PiChat.vue` updated to use `h-full`
- [Fixed]: [2026-06-20] Benchmark frontend — removed `p-6` padding class from the main page content container in `App.vue` to eliminate redundant default padding on the page body

### Changed

- [Changed]: [2026-06-20] Settings.vue Actions Panel — unified all action button styles from semantic colors (`btn-warning`, `btn-success`, `btn-primary`, `btn-error`) to `btn-ghost` for visual consistency

### Added

- [Added]: [2026-06-20] Reports page — clickable column headers in the Results Summary table enable sorting by #, Prompt/s, Gen/s, Time, and Mem (GB). Active sort column is highlighted with a direction indicator (↑/↓)
- [Added]: [2026-06-20] Benchmark frontend — version footer in the sidebar displays the app version (read from root `package.json` via Vite's `__APP_VERSION__` define); visible when sidebar is open

### Removed

- [Removed]: [2026-06-20] Benchmark frontend — removed version footer from the sidebar in `App.vue` (reverses the earlier addition of `v{{ __APP_VERSION__ }}` display)
- [Changed]: [2026-06-20] Version bump — `package.json` / `package-lock.json` bumped from `1.0.4` to `1.0.5`

### Changed

- [Changed]: [2026-06-20] `scripts/update.sh` — added `git stash` before `git pull` to prevent uncommitted local changes from blocking the update workflow

### Removed

- [Removed]: [2026-06-20] `src/backend/configs.json` — removed from git tracking and added both file and folder paths to `.gitignore` to prevent accidental commits of local benchmark configuration

### Changed

- [Changed]: [2026-06-19] Settings.vue — moved Config Profiles panel from the left column to the right column; added `space-y-4` class to the right column wrapper so both columns have consistent vertical spacing between cards
- [Changed]: [2026-06-19] Settings.vue — moved action buttons (Kill Port, Start/Stop Service, Edit Service, Delete Build, Delete Llama) from the Editor card footer into a dedicated collapsible "Actions Panel" card in the left column; adds `showActionsPanel` ref for collapse/expand toggle; buttons now display vertically with full-width layout and status messages contained within the panel

### Fixed

- [Fixed]: [2026-06-19] Pi Chat — `expandPromptTemplates` is now `true` in the prompt endpoint so slash commands (e.g., `/skill:research`) are properly expanded before being sent to the agent
- [Fixed]: [2026-06-19] Settings.vue — wrapped left and right grid columns in proper `<div>` wrappers so the `lg:grid-cols-2` two-column layout renders correctly; left column includes Profile Panel and Build card with `space-y-4` spacing, right column contains the Editor card

### Changed

- [Changed]: [2026-06-19] Benchmark — increased llama-server health polling timeout from 2 minutes (120 retries) to 5 minutes (300 retries) to allow more time for model loading
- [Changed]: [2026-06-19] Frontend routing — renamed `/config` route to `/settings` (Config.vue → Settings.vue); made Pi Chat the home route (`/`) and moved Dashboard to `/benchmark`

### Added

- [Added]: [2026-06-19] Settings — "Update" button in the Actions Panel: pulls latest git changes and restarts `betty.service`; includes confirmation dialog, loading state, and success/error feedback
- [Added]: [2026-06-19] Backend — `POST /api/update` endpoint that executes `scripts/update.sh` and returns output or error details
- [Changed]: [2026-06-19] `scripts/update.sh` — replaced `stop` + `start` with `systemctl --user restart betty.service` for atomic service restart
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
- [Fixed]: [2026-06-18] `src/backend/index.js` — `generateMultiplicativeArray` now guards against degenerate multipliers (≤1), zero start values, and start > max to prevent infinite loops and `RangeError: Invalid array length`

### Added

- [Added]: [2026-06-18] Grid search benchmark mode — replaces sequential parameter stepping with full cartesian product grid search over context length, GPU layer offload, batch size, uBatch size, and cache RAM; includes progress indicator, grid size warnings, and multiplicative step support for context length

- [Added]: [2026-06-18] Default report filename in Dashboard.vue — auto-populates `reportName` with `YYYY-MM-DD_HH-MM-SS_<model>` format on mount, using the configured model name with sanitized characters

### Changed

- [Changed]: [2026-06-18] Renamed `deep-research` skill to `research` — moved from `.pi/skills/deep-research/` to `.pi/skills/research/` with updated name in frontmatter and heading; functionality unchanged
- [Changed]: [2026-06-18] `src/backend/index.js` — replaced `Math.min` with explicit `>=` comparison for batch size, uBatchSize, and cacheRam boundary checks to correctly cap at maximum when step would exceed it

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
- [Changed]: [2026-06-18] `src/backend/api-server.js` — removed `export` prefix from environment variable lines in `getLaunchCommand()` (they are now `KEY=VALUE` pairs joined with `&&`); simplified `command` field to use plain `join(" ")` instead of `join(" \\\")`

### Fixed

- [Fixed]: [2026-06-18] `src/backend/index.js` and `api-server.js` — tensor split parameter now uses `sps.tensor_split.value` exclusively (removed auto-calculated `tensorSplitValue` fallback); applies to `getRunScript()`, `getServerParamsSnapshot()`, `runTestRun()`, `getLaunchCommand()`, and `extractConfigsPerRun()`
- [Fixed]: [2026-06-18] `scripts/install-service.sh` — `betty.service` now uses absolute path to `npm` and sets explicit `PATH` environment variable so systemd can find the nvm-installed node executable (was failing with exit code 203/EXEC)

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

- [Changed]: [2026-06-18] `.pi/` config consolidated to project root — moved agents (reviewer, scout, worker) and skills (commit-and-push, deep-research, orchestrator, planning, playwright-cli, project-docs, testing-debugging) from `src/backend/.pi/` to `.pi/`; removed `src/backend/.pi/` and `src/backend/docs/CHANGELOG.md`

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

- [Changed]: [2026-06-11] `.gitignore` — added `src/backend/frontend/dist/` to exclude future frontend build artifacts; current dist files are committed as initial seed

### Removed

- [Removed]: [2026-06-18] Old documentation — deleted docs/CHANGELOG.md (merged into src/backend/docs/CHANGELOG.md), architecture.md, backend/ directory (9 files), llama.cpp_docs/ directory (20 files), frontend-improvements-report.md, old docs/index.md
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
