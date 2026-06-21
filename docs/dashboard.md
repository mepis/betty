---
tags: [dashboard, benchmark, metrics, results, sse, monitoring]
---

# Dashboard

The Dashboard is the main control panel. It shows benchmark status, live results, and system metrics.

See also: [[index]] • [[USER-MANUAL]] • [[reports]] • [[architecture]]

## Status Card

Shows the current state of the benchmark process:

| Field | Description |
|-------|-------------|
| **Status** | `idle`, `building`, `testing`, `error`, or `stopped` |
| **Test Run** | Current test run ID number |
| **Process** | Whether the benchmark process is alive |
| **SSE** | Whether the real-time connection is active |
| **Memory** | System memory usage with a progress bar |

## Metrics Card

Displays aggregate statistics across all completed runs:

| Metric | Description |
|--------|-------------|
| **Avg Gen Tokens/s** | Average tokens generated per second across all runs |
| **Avg Prompt Tokens/s** | Average prompt processing tokens per second |
| **Total Runs** | Number of completed benchmark runs |

## Controls Card

| Button | Description |
|--------|-------------|
| **Start Benchmark** | Begin a new benchmark run (or restart after stop/error) |
| **Stop** | Halt the running benchmark |
| **Environment** | Toggle an environment variable input (JSON format) |
| **Save Report** | Save current results with a name |

## Live Results Table

Each row represents one test run with:

| Column | Description |
|--------|-------------|
| **#** | Test run ID |
| **Prompt Tok/s** | Prompt processing speed |
| **Gen Tok/s** | Token generation speed |
| **Total Tokens** | Generated tokens / Prompt tokens |
| **Total Time** | Total duration of the run |
| **Mem (GB)** | Average memory used / Total available |

Click **Details** on any row to view the prompt messages and LLM responses for that run.

## Log Viewer

Scrolling log output from the benchmark process:

- **Clear** — Reset the log buffer
- **Maximize** — Expand logs to fill more screen space
- Auto-scrolls to the latest line as new logs arrive
