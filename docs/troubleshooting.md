---
tags: [troubleshooting, debugging, cuda, memory, systemd]
---

# Troubleshooting

Common issues and solutions for Betty.

See also: [[USER-MANUAL]]

## Build Fails

- **Ensure CUDA toolkit is installed** and the NVCC path in [[config]] points to the correct `nvcc` binary
- **Check that CMake is installed** (`cmake --version`)
- **Verify GPU drivers** are up to date
- **Use `--no-build`** to skip the build step if you already have a compiled llama.cpp binary

## No Results Showing

- Check the **SSE** indicator in the Status card — it should be green (Connected)
- Check the browser console for errors
- Verify the server is running and accessible

## Port Already in Use

- Click **Kill Port** on the Config page to free the llama server port
- Or change `llama_port` in the General settings

## Model Not Found

- Ensure `model_directory` in configs points to the correct directory
- Check that the model file exists in that directory
- Use the [[models]] tab to search and download models

## SSE Connection Drops

- The client auto-reconnects after 3 seconds if the connection drops
- Check that the server is still running
- Refresh the page if issues persist

## Systemd Service Issues

- Check service status: `systemctl --user status llama.service`
- View logs: `journalctl --user -u llama.service -f`
- The service can be installed from any saved report's configuration modal

## Memory Issues

- Lower `max_sys_mem` percentage in General settings
- Reduce `cache_ram` in Test Parameters
- Reduce `batch_size` and `u_batch_size`
