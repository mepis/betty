---
tags: [feature, monitoring, system, cpu, gpu, memory, user]
---

# System Monitoring

Betty provides real-time system monitoring, tracking memory, CPU, and GPU utilization. Data is polled every 5 seconds and displayed in the dashboard.

## Overview

Three resource categories are monitored:

| Resource | Source | Metrics |
|----------|--------|---------|
| Memory | `/proc/meminfo` | Total, used, available (GB), percentage |
| CPU | `/proc/stat` | Overall usage %, per-core usage % |
| GPU | `nvidia-smi` | Utilization %, memory used/total, temperature |

## Monitoring Data Flow

````mermaid
sequenceDiagram
    participant UI as Dashboard (Vue)
    participant API as /api/system-status
    participant MEM as /proc/meminfo
    participant CPU as /proc/stat
    participant GPU as nvidia-smi

    Note over UI,API: Poll every 5 seconds
    UI->>API: GET /api/system-status
    API->>MEM: Read memory stats
    MEM-->>API: MemTotal, MemAvailable, ...
    API->>CPU: Read CPU stats (x2, 500ms apart)
    CPU-->>API: cpu, cpu0, cpu1, ...
    API->>GPU: nvidia-smi query
    GPU-->>API: index, name, util, mem, temp
    API-->>UI: { totalGB, usedGB, cpuUsage, cpuCores, gpuStats }
    UI->>UI: Update MemoryBar, SystemStats
````

## Memory Monitoring

Reads `/proc/meminfo` to extract:

| Metric | Calculation |
|--------|-------------|
| `totalGB` | `MemTotal` / 1024² |
| `availableGB` | `MemAvailable` / 1024² |
| `usedGB` | `totalGB - availableGB` |
| `percentUsed` | `(usedGB / totalGB) * 100` |

Note: `usedGB` is calculated as `total - available`, where `available` already accounts for buffers and reclaimable cache. This gives the actual application-used memory.

## CPU Monitoring

Reads `/proc/stat` twice with a 500ms interval to calculate deltas:

### Overall CPU Usage

```
usage% = ((totalDelta - idleDelta) / totalDelta) * 100
```

Where `total` = user + nice + system + idle + iowait + irq + softirq + steal, and `idle` = idle + iowait.

### Per-Core Usage

The same delta calculation is applied to each `cpuN` line, producing per-core utilization percentages.

## GPU Monitoring

Runs `nvidia-smi` to query GPU statistics:

```bash
nvidia-smi --query-gpu=index,name,utilization.gpu,memory.used,memory.total,temperature.gpu \
  --format=csv,noheader,nounits
```

Returns per-GPU:

| Metric | Description |
|--------|-------------|
| `index` | GPU index (0, 1, ...) |
| `name` | GPU model name |
| `utilization` | GPU compute utilization (%) |
| `memoryUsedMB` | VRAM used (MB) |
| `memoryTotalMB` | Total VRAM (MB) |
| `memoryUsedPercent` | VRAM usage (%) |
| `temperature` | GPU temperature (°C) |

If `nvidia-smi` is not available, `gpuStats` is an empty array.

## API

### System Status

```
GET /api/system-status
```

Returns:

```json
{
  "success": true,
  "data": {
    "totalGB": 63.0,
    "usedGB": 45.2,
    "availableGB": 17.8,
    "percentUsed": 71.7,
    "cpuUsage": 35,
    "cpuCores": [
      { "name": "cpu0", "usage": 42 },
      { "name": "cpu1", "usage": 28 },
      ...
    ],
    "gpuStats": [
      {
        "index": 0,
        "name": "NVIDIA GeForce RTX 4090",
        "utilization": 85,
        "memoryUsedMB": 14336,
        "memoryTotalMB": 24576,
        "temperature": 72,
        "memoryUsedPercent": 58
      }
    ]
  }
}
```

## Polling

The frontend polls `/api/system-status` every **5 seconds** via the benchmark store's `fetchSystemStatus` action. The polling starts when the SysInfo view is mounted and stops when unmounted.

## Use Cases

- **Capacity planning** — monitor RAM usage before starting large benchmarks
- **GPU utilization** — verify GPU is being used during benchmarks
- **CPU load** — identify CPU bottlenecks during token generation
- **Thermal monitoring** — track GPU temperature during extended runs

## Related

- [[dashboard]] — System stats displayed on the dashboard
- [[features/benchmark-engine]] — Memory threshold checks during benchmark runs
- [[troubleshooting]] — Diagnosing resource-related issues
