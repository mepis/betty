---
tags: [index, navigation, overview]
---

# Betty Documentation

Welcome to the Betty documentation — a web-based benchmarking tool for [llama.cpp](https://github.com/ggerganov/llama.cpp).

See also: [[tags]]

## Getting Started

| Page | Description |
|------|-------------|
| [[USER-MANUAL]] | Getting started — overview, installation, configuration, and quick start |
| [[architecture]] | System design deep-dive — components, data flows, and diagrams |
| [[qa/getting-started]] | Quick start guide with practical examples |

## Feature Documentation

| Page | Description |
|------|-------------|
| [[dashboard]] | Dashboard tab — status, metrics, controls, live results, and logs |
| [[config]] | Config tab — build options, run parameters, profiles, and GPU settings |
| [[models]] | Models tab — search, browse, and download GGUF models from HuggingFace |
| [[reports]] | Reports tab — save, view, and manage benchmark reports |
| [[pi-chat]] | Pi Chat tab — AI agent chat with tool execution and streaming |
| [[logs]] | Logs tab — systemd journal logs from llama.service |

## Features

| Page | Description |
|------|-------------|
| [[features/benchmark-engine]] | Grid search benchmark runner |
| [[features/huggingface-integration]] | HF model search and download |
| [[features/systemd-service]] | Systemd service management |
| [[features/profiles]] | Config profiles |
| [[features/service-profiles]] | Service profiles |
| [[features/chat-templates]] | Chat template management |
| [[features/mmproj-models]] | Multimodal projector models |
| [[features/pi-chat]] | AI agent chat integration |
| [[features/library]] | Research library |
| [[features/system-monitoring]] | System status (CPU/GPU/Memory) |
| [[features/library-import-export]] | Library import/export |

## Backend Modules

| Page | Description |
|------|-------------|
| [[backend/api-server]] | Express API server and all endpoints |
| [[backend/benchmark-runner]] | Benchmark engine (grid search) |
| [[backend/authentication]] | JWT authentication system |
| [[backend/database]] | Three-tier database (MySQL/SQLite/JSON) |
| [[backend/data-layer]] | Data access layer |
| [[backend/sse-streaming]] | Server-sent events |

## Frontend Modules

| Page | Description |
|------|-------------|
| [[frontend/overview]] | Vue.js SPA overview |
| [[frontend/benchmark-store]] | Pinia benchmark store |
| [[frontend/auth-store]] | Pinia auth store |
| [[frontend/pi-chat-store]] | Pinia pi-chat store |
| [[frontend/views]] | All Vue views |
| [[frontend/components]] | Shared components |

## Concepts

| Page | Description |
|------|-------------|
| [[concepts/data-flow]] | Request/response flow |
| [[concepts/config-schema]] | Configuration schema deep-dive |
| [[concepts/grid-search]] | Grid search algorithm |
| [[concepts/auth-flow]] | Authentication flow |

## Reference

| Page | Description |
|------|-------------|
| [[configuration-reference]] | Full `configs.json` schema reference and benchmark flow |
| [[api-reference]] | Complete API endpoint reference for all backend routes |
| [[llama-cpp-parameters]] | All llama.cpp build, CLI, and server parameters |

## Practical Examples (QA)

| Page | Description |
|------|-------------|
| [[qa/getting-started]] | Quick start guide |
| [[qa/benchmark-workflow]] | Full benchmark workflow |
| [[qa/model-management]] | Model search/download/delete |
| [[qa/service-management]] | Systemd service setup |
| [[qa/profile-workflow]] | Profile save/load/delete |
| [[qa/report-workflow]] | Report save/view/export |
| [[qa/api-usage]] | API usage with curl |
| [[qa-installation]] | Installation examples |
| [[qa-benchmark-run]] | Benchmark run examples |
| [[qa-model-download]] | Model download examples |
| [[qa-troubleshooting]] | Troubleshooting examples |

## Research

| Page | Description |
|------|-------------|
| [[research/llama-cpp-x86-instruction-sets]] | x86 instruction set support in llama.cpp |

## Support

| Page | Description |
|------|-------------|
| [[troubleshooting]] | Common issues and solutions |
| [[CHANGELOG]] | Version history |
