# Searching for and Downloading Models from Huggingface for llama.cpp

**Research date:** 2026-06-17
**Status:** Complete (3-phase research)
**Tags:** huggingface, gguf, llama.cpp, model-download, quantization, hf_transfer, model-management

## Overview

This research covers the complete ecosystem for discovering, evaluating, and downloading GGUF-format language models from Hugging Face for use with llama.cpp. Hugging Face hosts over 183,000 GGUF-compatible models as of 2026, making it the largest repository of GGUF files. llama.cpp provides three distinct download pathways: its built-in `-hf` flag for one-command download-and-run, the Hugging Face CLI (`huggingface-cli`) for flexible programmatic downloads, and `hf_transfer` for high-speed large-file transfers. The research also covers the model provider ecosystem (bartowski, unsloth, ggml-org), llama.cpp's model management system (router mode, presets), and third-party discovery tools.

## Key Findings

1. **Three download mechanisms serve different use cases:** llama.cpp's `-hf` flag is simplest (install + one command), `huggingface-cli` offers maximum flexibility (selective files, resume, custom dirs), and `hf_transfer` delivers >1GB/s speeds for large GGUF files.

2. **The GGUF provider ecosystem has consolidated:** bartowski (50+ architectures, highest quality), unsloth (Unsloth-distilled GGUFs with better quality/size tradeoffs), and ggml-org (official llama.cpp collection) dominate the landscape. TheBloke, while a pioneer, has been largely superseded.

3. **llama.cpp's model management system (Dec 2025) brings Ollama-style multi-model capabilities:** Router mode with INI preset files enables dynamic model loading, unloading, and switching without server restarts. The March 2026 cache migration to `~/.cache/huggingface/hub/` resolved interoperability issues with other Hugging Face tools.

4. **Hugging Face's built-in GGUF filter is the primary discovery tool:** `hf.co/models?library=gguf` lists 183,000+ models with sorting by trending, downloads, or recency. Third-party tools like Local AI Zone supplement with direct download links.

5. **Ollama now natively supports Hugging Face GGUF URLs:** Since Oct 2024 (improved in v0.30, Jun 2026), users can run any GGUF model directly via `ollama run hf.co/user/model:quant`.

## Sub-Topics Covered

- GGUF format and HuggingFace integration with llama.cpp's built-in `-hf` download
- Downloading models: huggingface-cli, hf_transfer, and llama.cpp built-in download
- Model discovery and the GGUF provider ecosystem
- llama.cpp model management system (router mode, presets)
- Model evaluation and selection criteria
- Programmatic access and automation

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

- [Optimized llama-server Settings for Qwen3.6-35B-A3B](../optimized-llama-server-settings-qwen36-35b/) — GGUF quantization performance for a specific model
- [llama.cpp CUDA Flags Performance Impact](../llama-cuda-flags-performance/) — CUDA compilation flags for llama.cpp
- [llama.cpp gRPC Server](../llama-cpp-grpc-server/) — gRPC-based inference servers on llama.cpp
- [OpenAI Compatible APIs](../openai-compatible-apis/) — OpenAI-compatible API implementations including llama.cpp
