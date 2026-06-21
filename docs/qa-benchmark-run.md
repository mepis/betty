---
tags: [qa, benchmark, workflow, reports, profiles]
---

# QA: Benchmark Run

End-to-end examples for running benchmarks, saving reports, and managing configurations.

See also: [[dashboard]] • [[config]] • [[reports]]

## Example 1: Basic Benchmark Run

1. **Download a model**
   - Go to Models tab
   - Search for "llama 3 gguf"
   - Click a result, select a `.gguf` file
   - Click Download

2. **Configure benchmark**
   - Go to Settings tab
   - Under Run Options → General, set:
     - Model: select your downloaded model
     - Max System Memory: `93`
     - Llama Port: `11434`
   - Under Test Parameters, set:
     - Context Length: `32768`
     - Batch Size: `128`
   - Click **Save Config**

3. **Run benchmark**
   - Go to Dashboard tab
   - Click **Start Benchmark**
   - Watch the results table fill in real-time
   - Check the log viewer for progress

4. **Save results**
   - Enter a report name (e.g., `llama3-8b-test`)
   - Click **Save**

## Example 2: Multi-Run Benchmark with Profiles

1. **Create a baseline profile**
   - Settings tab → Configure your baseline settings
   - Profile Panel → Enter name "baseline" → Click **Save**

2. **Run baseline**
   - Dashboard → **Start Benchmark**
   - Wait for completion
   - Save report as `baseline-run`

3. **Create an optimized profile**
   - Settings tab → Adjust settings (e.g., increase batch size, enable flash attention)
   - Profile Panel → Enter name "optimized" → Click **Save**

4. **Run optimized**
   - Load "optimized" profile
   - Dashboard → **Start Benchmark**
   - Save report as `optimized-run`

5. **Compare results**
   - Reports tab → Click each report
   - Compare Avg Gen Tok/s and other metrics

## Example 3: API-Driven Benchmark

```bash
# 1. Update config via API
curl -X PUT http://localhost:3456/api/configs \
  -H "Content-Type: application/json" \
  -d '{
    "model": "~/.betty/models/my-model/model.gguf",
    "llama_port": 11434,
    "test_params": {
      "context_length": 32768,
      "batch_size": 128
    }
  }'

# 2. Start benchmark
curl -X POST http://localhost:3456/api/run \
  -H "Content-Type: application/json" \
  -d '{}'

# 3. Check status
curl http://localhost:3456/api/status

# 4. Save report
curl -X POST http://localhost:3456/api/save-report \
  -H "Content-Type: application/json" \
  -d '{"name": "api-benchmark"}'

# 5. View report
curl http://localhost:3456/api/report/api-benchmark
```

## Example 4: Install as Systemd Service

1. **Run a benchmark and save a report** (see Example 1)

2. **Install the best run as a service**
   - Reports tab → Click your report
   - Click the row with the best Gen Tok/s
   - In the config modal, scroll to "Systemd Service"
   - Click **Install**

3. **Manage the service**
   ```bash
   # Check status
   systemctl --user status llama.service

   # View logs
   journalctl --user -u llama.service -f

   # Restart
   systemctl --user restart llama.service
   ```

## Example 5: Kill Port and Restart

When a llama-server process is stuck:

1. Go to Settings tab → Actions panel
2. Click **Kill Port** — kills any process on the configured llama port
3. Go to Dashboard → Click **Start Benchmark** to restart

Or via API:
```bash
curl -X POST http://localhost:3456/api/kill-port
```

## Example 6: Context Length Sweep

Configure test parameters to sweep context lengths:

| Parameter | Value | Effect |
|-----------|-------|--------|
| `context_length` | `8192` | Starting context |
| `context_length_multiplier` | `2` | Double each run |
| `context_length_max` | `131072` | Stop at 128K |

This produces runs at: 8K → 16K → 32K → 64K → 128K context lengths.
