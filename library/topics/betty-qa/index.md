# Betty QA / Usage Examples

Practical examples for using Betty to run benchmarks, manage models, and configure the system.

## Running a Benchmark from Scratch

### Prerequisites

1. Install dependencies:
   ```bash
   bash install.sh    # Choose option 4 (APT → CUDA → Service)
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   cd src/benchmark/frontend && npm install
   ```

3. Build the frontend:
   ```bash
   npm run build:frontend
   ```

### Step 1: Download a Model

1. Open Betty in your browser (`http://localhost:3456`)
2. Navigate to **Models** tab
3. Search for a model (e.g., "llama 3.1" or "gemma")
4. Click a model to see details and available GGUF files
5. Select a quantization (e.g., `Q4_K_M.gguf`)
6. Click **Download** and wait for completion

### Step 2: Configure

1. Navigate to **Config** tab
2. In the **Run Options** section:
   - Set **Model** to the downloaded GGUF file (auto-populated from model directory)
   - Adjust **Test Parameters** as needed:
     - `context_length`: Start with `32768` (default)
     - `batch_size`: Start with `128` (default)
     - `gpu_layer_offload`: `999` (offload all layers to GPU)
3. Verify **Build Options** if building from source:
   - Ensure `Enable CUDA` and `Enable Flash Attention` are checked
   - Set `Build Cores` to your CPU core count
4. Click **Save Config**

### Step 3: Run the Benchmark

1. Navigate to **Dashboard** tab
2. Click **Start Benchmark**
3. Watch the live progress:
   - Status indicator changes: `Building` → `Testing` → `Idle`
   - Live results table populates after each test run
   - Log viewer shows cmake, build, and llama-server output
4. Benchmark runs multiple test runs automatically, advancing parameters:
   - Run 1: context=32768, batch=128, ubatch=64, cache=4096
   - Run 2: context=65536, batch=256, ubatch=128, cache=5120
   - Run 3: context=131072, batch=512, ubatch=256, cache=6144
   - ...continues until all parameters reach their maximum

### Step 4: Save the Report

1. While the benchmark runs (or after it completes), enter a name in the **Save Report** field
2. Click **Save**
3. The report is saved to `reports/` with full results, per-run configurations, and reproducible commands

### Step 5: View Results

1. Navigate to **Reports** tab
2. Click on a report to see:
   - Summary metrics (total runs, avg gen tok/s, avg prompt tok/s, best gen tok/s)
   - Results table with clickable rows
3. Click any row to see:
   - Test parameters (context, batch, ubatch, cache, GPU layers)
   - Model parameters (temperature, top-p, min-p, top-k)
   - Server parameters (model path, host, port, flash attention, etc.)
   - GPU/split parameters
   - Environment variables
   - CMake build flags
   - **Reproducible build and launch commands** (copy to clipboard)

## Managing Models via HuggingFace

### Search for Models

```
Models tab → Search bar → Enter query → Search
```

Searches HuggingFace via the free API (no authentication needed). Results include:
- Model ID, description, downloads, likes
- Tags (GGUF, pytorch, safetensors, transformers)
- Last modified date

### Filter by GGUF

Check the **GGUF only** checkbox to filter for GGUF-compatible models only.

### Download a Model

1. Click a model in search results
2. Model details modal opens with:
   - Full description and metadata
   - Available GGUF files listed
3. Select a file (auto-selects first GGUF file)
4. Click **Download**
5. Progress bar shows download progress
6. File saved to `hf_downloads/{modelId}/{filename}`

### View Downloaded Models

Switch to the **Downloads** tab to see all downloaded models with file sizes.

### Delete a Downloaded Model

In the **Downloads** tab, click the trash icon next to any model.

## Saving and Loading Configuration Profiles

### Save a Profile

1. Navigate to **Config** tab
2. Expand the **Config Profiles** section
3. Enter a profile name (e.g., "gemma-12b-32k")
4. Click **Save**

Profiles are saved as JSON files in `profiles/` directory.

### Load a Profile

1. In the **Config Profiles** section, find the desired profile
2. Click **Load** next to the profile name
3. Current configuration is replaced with the profile's settings

### Delete a Profile

Click the trash icon next to a profile name.

### Profile Use Cases

- **Save different configurations** for different models (e.g., 8B vs 70B)
- **Share configurations** by copying profile files between machines
- **Compare settings** by loading profiles side by side

## Installing a Systemd Service from a Benchmark Report

Betty can install llama-server as a systemd user service with the exact parameters from any benchmark test run.

### From the UI

1. Navigate to **Reports** tab
2. Select a report and click a test run row
3. In the config modal, scroll to **Reproduce Commands**
4. Click **Install** under the Systemd Service section
5. The service is installed, enabled, and started automatically

### What Gets Installed

- **Service file**: `~/.config/systemd/user/llama.service`
- **Environment file**: `~/.config/systemd/user/llama-benchmark.env`
- Uses the exact build flags, server parameters, and environment variables from the selected test run

### Manage the Service

After installation, manage the service from the command line:

```bash
# Check status
systemctl --user status llama.service

# View logs
journalctl --user -u llama.service -f

# Stop
systemctl --user stop llama.service

# Restart
systemctl --user restart llama.service
```

Or from the UI:
- Config tab → **Stop llama.service** button
- Dashboard → llama.service status indicator

## Troubleshooting Common Issues

### Port Already in Use

**Symptom:** llama-server fails to start, error "couldn't bind"

**Solution 1:** Use the UI
- Config tab → **Kill Port** button

**Solution 2:** Command line
```bash
# Find processes on the port
lsof -i :11434

# Kill them
kill -9 $(lsof -ti :11434)
```

### Build Fails with CUDA Errors

**Symptom:** cmake or make fails with CUDA-related errors

**Checks:**
```bash
# Verify CUDA toolkit
nvcc --version

# Verify CUDA headers
ls /usr/local/cuda-*/include/cuda.h

# Check CUDA path in configs.json
# cuda_configs.cudacxx should point to your nvcc
```

**Fix:** Update `cuda_configs.cudacxx` in configs.json to the correct NVCC path.

### Benchmark Aborts Due to Memory

**Symptom:** Test run shows "Aborted: System memory at X% exceeds threshold"

**Solution:** Lower `max_sys_mem` in configs.json or reduce `test_params.cache_ram_max`.

### Frontend Shows Connection Error

**Symptom:** Dashboard shows "Disconnected" for SSE

**Solution 1:** Rebuild with correct API URL
```bash
npm start
```

**Solution 2:** Manually update the API URL
```bash
bash scripts/update-api-url.sh
npm run build:frontend
```

**Solution 3:** Check the network interface
```bash
# Verify your interface
ip addr show

# Update NET_INTERFACE in .env
echo "NET_INTERFACE=eth0" >> .env
```

### llama-server Crashes During Benchmark

**Symptom:** Benchmark shows error after a test run

**Possible causes:**
1. **Out of memory** — reduce `test_params.context_length` or `cache_ram`
2. **GPU OOM** — reduce `gpu_layer_offload` or use a smaller model
3. **Port conflict** — use **Kill Port** before restarting

**Fix:** Check the log viewer for the specific error message.

### Can't Access Betty from Another Machine

**Symptom:** `http://<machine-ip>:3456` doesn't load

**Checks:**
```bash
# Verify server is bound to all interfaces
# Check API_HOST in .env or api-server.js defaults to 0.0.0.0

# Check firewall
sudo ufw status
sudo ufw allow 3456/tcp

# Verify the frontend .env.production has correct API URL
cat src/benchmark/frontend/.env.production
```

### GPU Not Detected

**Symptom:** llama-server starts but uses CPU only

**Checks:**
```bash
# Verify GPU is visible
nvidia-smi

# Check CUDA environment
echo $LD_LIBRARY_PATH
echo $PATH | grep cuda

# Verify CUDA flags in build options
# Ensure enable_cuda and enable_cuda_fa are enabled
```

### Build Takes Too Long

**Solution:** Increase `build_cores` in configs.json or use ccache:
```json
{
  "build_cores": 14,
  "build_make_params": {
    "enable_ccache": true
  }
}
```

### Skip Build for Faster Starts

If llama.cpp is already built, set `skip_build: true` in configs.json to skip the build phase on each benchmark run.

## Quick Reference

### Common Commands

| Task | Command |
|------|---------|
| Start Betty | `npm start` |
| Build frontend only | `npm run build:frontend` |
| Run benchmark | Dashboard → Start Benchmark |
| Stop benchmark | Dashboard → Stop |
| Kill port | Config → Kill Port |
| Delete build dir | Config → Delete Build |
| Check service status | `systemctl --user status llama-benchmark.service` |
| View service logs | `journalctl --user -u llama-benchmark.service -f` |

### Key Files

| File | Purpose |
|------|---------|
| `configs.json` | All benchmark configuration |
| `results.md` | Generated markdown results |
| `reports/*.json` | Saved benchmark reports |
| `profiles/*.json` | Saved config profiles |
| `hf_downloads/*.gguf` | Downloaded models |
| `~/.config/systemd/user/llama-benchmark.service` | Systemd service |

### API Quick Reference

| Endpoint | Purpose |
|----------|---------|
| `GET /api/status` | Current benchmark status |
| `POST /api/run` | Start benchmark |
| `POST /api/stop` | Stop benchmark |
| `GET /api/configs` | Read configuration |
| `PUT /api/configs` | Save configuration |
| `GET /api/reports` | List reports |
| `POST /api/save-report` | Save current results |
| `GET /api/hf/search?q=llama` | Search HuggingFace models |
| `POST /api/hf/download` | Download a model |

## See Also

- [[betty-project]] — Project overview
- [[betty-architecture]] — System architecture
- [[betty-api-reference]] — Complete API reference
- [[betty-benchmark-engine]] — Benchmark engine internals
- [[betty-configuration]] — Configuration system
- [[betty-installation]] — Installation guide

## Tags

betty, qa, usage, examples, troubleshooting, benchmark, installation, huggingface
