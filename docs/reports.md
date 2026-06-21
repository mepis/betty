---
tags: [reports, results, systemd, save]
---

# Reports

The Reports tab lets you save and review benchmark results.

See also: [[USER-MANUAL]]

## Saving a Report

1. Run a benchmark on the [[dashboard]]
2. When results are available, enter a name in the report input field
3. Click **Save** (or press Enter)

## Viewing Reports

Reports are listed on the left. Click any report to view:

### Summary Metrics

- Total number of runs
- Average generation speed
- Average prompt speed
- Best generation speed

### Results Table

Click any row to open the **Configuration Modal**, which shows:

| Section | Contents |
|---------|----------|
| **Test Parameters** | Context length, batch size, ubatch size, cache RAM, GPU layers |
| **Model Parameters** | Temperature, top P, min P, top K |
| **Server Parameters** | Model path, host, port, flash attention, reasoning, rope scaling, etc. |
| **Split & GPU Parameters** | GPU selection, layer split, tensor split, primary GPU |
| **Environment Variables** | All environment variables used |
| **CMake Build Flags** | All build-time cmake flags |
| **Reproduce Commands** | Full build (cmake + make) and launch (llama-server) commands with copy buttons |

### Install as Systemd Service

From the configuration modal, you can install a specific test run's launch command as a systemd user service (`llama.service`). This includes:
- Automatic start/stop commands
- Status and stop command snippets to copy
- Overwrites any previous service installation

### Raw Results

Toggle **Raw Results** to view the full markdown output of the benchmark results.

## Deleting Reports

Click the **trash icon** next to any report name to delete it.
