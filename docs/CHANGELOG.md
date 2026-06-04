# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **pi.dev SDK Research**: Comprehensive analytical report on the pi.dev SDK architecture, API, extensions, and integration patterns (`.agents/deep-research/REPORT.md`)
- **Web Chat App Design**: Complete design document with architecture, WebSocket protocol, phased implementation plan, and validation criteria (`.agents/plans/web-chat-app-design.md`)
- **Implementation Plan**: Detailed 4-phase implementation plan covering scaffolding, SDK integration, frontend, and polish (`.agents/plans/web chat app implementation plan/`)
- **Merge Request Skill**: New `.pi/skills/merge-request/` skill for generating MR descriptions
- **Project Template**: `templates/project_template.md` for scaffolding new projects

### Changed

- **Project Direction**: Shifted from old web chat app implementation to comprehensive design-first approach with detailed architecture documents and phased implementation plan

### Removed

- **Stale Agent Artifacts**: Removed 516 obsolete files from deep-research, playwright-cli, and testing agent runs (logs, page captures, screenshots, agent reports)
- **Old Web Chat App**: Removed `src/web/` (frontend Vue SPA, Express backend, configs) — superseded by new design document and implementation plan
- **Old Testing Agent**: Removed `.agents/testing/` artifacts (snapshots, test reports, state files, verification results)
- **Old Extensions**: Removed `.pi/extensions/optimize-compaction.ts` and `src/llama/llama.cpp`

### Fixed

- **WebSocket Reconnection**: RPC client now handles connection drops with exponential backoff and automatic reconnection
