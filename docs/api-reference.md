---
tags: [api, express, endpoints, reference, sse]
---

# API Reference

All API endpoints are relative to the server base URL (default `http://localhost:3456`).

See also: [[USER-MANUAL]]

## Status & Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/status` | Get current benchmark status |
| `GET` | `/api/stream` | SSE stream for live logs & results |
| `POST` | `/api/run` | Start benchmark (body: `{ env: {...} }`) |
| `POST` | `/api/stop` | Stop running benchmark |
| `POST` | `/api/kill-port` | Kill process on llama server port |
| `GET` | `/api/system-status` | Get system memory info |

## Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/configs` | Get current configs |
| `PUT` | `/api/configs` | Update configs (body: config object) |
| `GET` | `/api/models?directory=...` | List models in a directory |

## Build

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/build` | Build llama.cpp (SSE stream) |
| `POST` | `/api/clone` | Clone/pull llama.cpp repo |
| `DELETE` | `/api/build/delete` | Delete the build directory |

## Profiles

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/profiles` | List all profiles |
| `POST` | `/api/profile` | Save a profile (body: `{ name, data }`) |
| `POST` | `/api/profile/:name/load` | Load a profile |
| `DELETE` | `/api/profile/:name` | Delete a profile |

## Results & Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/results` | Get raw results markdown |
| `POST` | `/api/save-report` | Save results (body: `{ name }`) |
| `GET` | `/api/reports` | List all reports |
| `GET` | `/api/report/:name` | Get a specific report |
| `DELETE` | `/api/report/:name` | Delete a report |
| `GET` | `/api/report/:name/configs/:testRunId` | Get config for a specific test run |
| `GET` | `/api/report/:name/commands/:testRunId` | Get build/launch commands for a run |

## Systemd Service

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/service/status` | Check if llama.service is active |
| `POST` | `/api/service/start` | Start llama.service |
| `POST` | `/api/service/stop` | Stop llama.service |
| `POST` | `/api/service/install` | Install as service (body: `{ reportName, testRunId }`) |

## HuggingFace

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/hf/search?q=...&limit=20&filter=gguf` | Search HuggingFace models |
| `GET` | `/api/hf/model/:id` | Get model details |
| `GET` | `/api/hf/model/:id/files` | Get model files |
| `POST` | `/api/hf/download` | Download a model file (body: `{ modelId, filename }`) |
| `GET` | `/api/hf/downloads` | List downloaded models |
| `GET` | `/api/hf/download/:modelId` | Get download status for a model |
| `DELETE` | `/api/hf/download/:modelId` | Delete a downloaded model |
