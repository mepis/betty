---
tags: [qa, troubleshooting, debugging, cuda, systemd, memory]
---

# QA: Troubleshooting

Diagnostic procedures and solutions for common Betty issues.

See also: [[troubleshooting]] • [[logs]]

## Example 1: Build Fails — CUDA Not Found

**Symptom:** Build logs show `nvcc not found` or CUDA-related errors.

**Fix:**
```bash
# 1. Verify CUDA installation
nvcc --version

# 2. If not installed, use the installer
chmod +x install.sh
./install.sh
# Choose option 2 (Install CUDA)

# 3. Verify NVCC path in Settings → CUDA Configuration
# Should point to: /usr/local/cuda/bin/nvcc or /usr/local/cuda-<version>/bin/nvcc

# 4. Clean and retry
# Settings → Actions → Delete Build
# Settings → Build → Click Build
```

## Example 2: Out of Memory During Benchmark

**Symptom:** Benchmark crashes or llama-server fails to start with OOM errors.

**Fix:**
1. Settings → Run Options → Test Parameters:
   - Reduce `context_length` (e.g., from 32768 to 16384)
   - Reduce `batch_size` (e.g., from 128 to 64)
   - Reduce `u_batch_size` (e.g., from 64 to 32)
2. Settings → General:
   - Lower `max_sys_mem` (e.g., from 93 to 80)
3. Settings → Environment Exports:
   - Enable `LLAMA_ARG_FIT` to auto-fit the model to available memory

## Example 3: Port Already in Use

**Symptom:** `EADDRINUSE` error or benchmark won't start.

**Fix:**
```bash
# Option 1: Via UI
# Settings → Actions → Kill Port

# Option 2: Via API
curl -X POST http://localhost:3456/api/kill-port

# Option 3: Manual
lsof -ti :11434 | xargs kill -9
```

## Example 4: Systemd Service Won't Start

**Symptom:** Service shows as failed or inactive.

**Fix:**
```bash
# 1. Check service status
systemctl --user status llama.service

# 2. View logs
journalctl --user -u llama.service -n 50 --no-pager

# 3. Common fixes:
#    - Ensure llama.cpp is built
#    - Ensure model file exists at the configured path
#    - Check environment variables in the .env file

# 4. Reload and restart
systemctl --user daemon-reload
systemctl --user restart llama.service

# 5. Or use the UI:
# Settings → Actions → Edit Service → Fix config → Save
```

## Example 5: SSE Connection Drops

**Symptom:** Dashboard shows SSE as disconnected, no live updates.

**Fix:**
1. Check server is running: `curl http://localhost:3456/api/health`
2. Refresh the browser page (triggers SSE reconnection)
3. Check browser console for CORS or network errors
4. If using a reverse proxy, ensure it supports SSE:
   ```nginx
   proxy_buffering off;
   proxy_cache off;
   ```

## Example 6: Model Not Found in Dropdown

**Symptom:** Model dropdown is empty or doesn't show downloaded models.

**Fix:**
1. Verify `model_directory` in Settings → General points to the correct directory
2. Check that `.gguf` files exist: `ls -la ~/.betty/models/`
3. Refresh the model list by changing the model directory field and changing it back
4. For multi-part models, ensure all parts are in the same subdirectory

## Example 7: No Results After Benchmark

**Symptom:** Benchmark completes but results table is empty.

**Fix:**
1. Check the log viewer for errors
2. Verify the model file is valid: try loading it with `llama-cli`
3. Check that benchmark messages are configured (Settings → Benchmark Messages)
4. Try with a smaller context length to rule out memory issues
5. Check system logs: `journalctl --user -u llama.service`

## Diagnostic Commands

```bash
# Server health
curl http://localhost:3456/api/health

# Current status
curl http://localhost:3456/api/status

# System memory
curl http://localhost:3456/api/system-status

# Service status
systemctl --user status llama.service

# GPU memory
nvidia-smi

# CUDA version
nvcc --version

# Check configs
cat src/backend/configs.json | python3 -m json.tool
```
