---
tags: [logs, systemd, journalctl, troubleshooting, monitoring]
---

# Logs

The Logs tab displays systemd journal logs from the `llama.service` user service.

See also: [[index]] • [[troubleshooting]] • [[config]]

## Overview

The Logs page provides real-time access to systemd journal entries for the llama.cpp service. This is useful for debugging service startup issues, monitoring llama-server behavior, and reviewing error messages.

## Interface

### Toolbar

| Control | Description |
|---------|-------------|
| **Refresh** | Manually fetch latest logs |
| **Auto-scroll** | Toggle automatic scrolling to newest entries |
| **Auto-refresh indicator** | Shows "Auto-refreshing every 5s" |

### Log Display

- Monospace font for readability
- Full journal output with timestamps and service identifiers
- Scrollable container for browsing historical entries
- Error states displayed with icon and message

## How It Works

The Logs page fetches data from the `/api/logs` endpoint, which runs:

```bash
journalctl --user -r -u llama.service -n 1000 --no-pager
```

This retrieves the last 1000 reverse-ordered journal entries for the `llama.service` user service.

## Auto-Refresh

Logs are automatically refreshed every 5 seconds. The refresh interval is fixed and cannot be configured from the UI.

## Prerequisites

The Logs tab requires:

1. A systemd user service named `llama.service` is installed
2. The service has been started at least once (to generate journal entries)
3. The server process has permission to run `journalctl`

## Common Log Patterns

| Pattern | Meaning |
|---------|---------|
| `llama_loader: loading model` | Model file is being loaded into memory |
| `llama_kv_cache_init` | KV cache initialization |
| `ggml_cuda_buffer_alloc` | GPU memory allocation |
| `ERROR` / `failed` | Service or model error — see [[troubleshooting]] |

## Related Commands

Run these from the terminal for more control:

```bash
# Real-time log following
journalctl --user -u llama.service -f

# Service status
systemctl --user status llama.service

# Full log history
journalctl --user -u llama.service

# Logs since boot
journalctl --user -u llama.service -b
```

## Cross-References

- [[config]] — Install and manage systemd services
- [[troubleshooting]] — Common issues and solutions
- [[architecture]] — Systemd integration overview
