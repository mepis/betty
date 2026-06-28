# Documentation Creation Plan

## Project: Betty (llama.cpp Benchmark Tool)

### Existing docs to update:
- docs/index.md - update with new pages
- docs/tags.md - update with all new tags
- docs/architecture.md - enhance with Mermaid diagrams
- docs/api-reference.md - expand with all endpoints
- docs/USER-MANUAL.md - keep as is
- docs/config.md - keep as is
- docs/configuration-reference.md - keep as is
- docs/dashboard.md - keep as is
- docs/models.md - enhance
- docs/reports.md - keep as is
- docs/pi-chat.md - keep as is
- docs/logs.md - keep as is
- docs/troubleshooting.md - keep as is
- docs/qa-*.md - keep and add more
- docs/llama-cpp-parameters.md - keep as is

### New pages to create:

#### docs/features/ (feature documentation)
1. features/benchmark-engine.md - Grid search benchmark runner
2. features/huggingface-integration.md - HF model search/download
3. features/systemd-service.md - Systemd service management
4. features/profiles.md - Config profiles
5. features/service-profiles.md - Service profiles
6. features/chat-templates.md - Chat template management
7. features/mmproj-models.md - Multimodal projector models
8. features/pi-chat.md - AI agent chat integration
9. features/library.md - Research library
10. features/system-monitoring.md - System status (CPU/GPU/Memory)
11. features/library-import-export.md - Library import/export

#### docs/backend/ (backend modules)
12. backend/api-server.md - Express API server
13. backend/benchmark-runner.md - index.js benchmark engine
14. backend/authentication.md - JWT auth system
15. backend/database.md - Three-tier DB (MySQL/SQLite/JSON)
16. backend/data-layer.md - Data access layer
17. backend/sse-streaming.md - Server-sent events

#### docs/frontend/ (frontend modules)
18. frontend/overview.md - Vue.js SPA overview
19. frontend/benchmark-store.md - Pinia benchmark store
20. frontend/auth-store.md - Pinia auth store
21. frontend/pi-chat-store.md - Pinia pi-chat store
22. frontend/views.md - All Vue views
23. frontend/components.md - Shared components

#### docs/qa/ (QA pages)
24. qa/getting-started.md - Quick start guide
25. qa/benchmark-workflow.md - Full benchmark workflow
26. qa/model-management.md - Model search/download/delete
27. qa/service-management.md - Systemd service setup
28. qa/profile-workflow.md - Save/load/delete profiles
29. qa/report-workflow.md - Save/view/export reports
30. qa/api-usage.md - API usage examples with curl

#### docs/concepts/ (architecture/concepts)
31. concepts/data-flow.md - Request/response flow
32. concepts/config-schema.md - Configuration schema deep-dive
33. concepts/grid-search.md - Grid search algorithm
34. concepts/auth-flow.md - Authentication flow

### Library docs (~/.betty/library/):
35. library/index.md - Library overview
36. library/quick-reference.md - Quick command reference
37. library/troubleshooting-cheatsheet.md - Common issues

### Updated index pages:
38. docs/index.md - Complete index with all pages
39. docs/tags.md - Complete tag index

### Architecture deep-dive:
40. docs/architecture.md - Enhanced with Mermaid diagrams
