# CMake Build Overview

Top-level CMake options, build presets, and build targets for llama.cpp.

**Tags**: `build`, `cmake`, `configuration`, `compilation`

---

## Build System

llama.cpp uses **CMake** as its primary build system. The Makefile has been deprecated in favor of CMake.

### Basic Build

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release -j$(nproc)
```

### Build Presets

`CMakePresets.json` provides pre-configured build targets:

| Preset | Description |
|--------|-------------|
| `default` | Standard CPU build |
| `cuda` | NVIDIA CUDA GPU support |
| `metal` | Apple Metal GPU support |
| `vulkan` | Vulkan GPU support |
| `opencl` | OpenCL GPU support |
| `clblast` | CLBlast-accelerated OpenCL |
| `hip` | AMD ROCm/HIP GPU support |
| `sycl` | Intel SYCL GPU support |
| `sycl-f16` | Intel SYCL with FP16 |
| `kompute` | Kompute GPU framework |

```bash
cmake --preset cuda
cmake --build --preset cuda -j$(nproc)
```

---

## Top-Level CMake Options

### Build Type

| Flag | Default | Description |
|------|---------|-------------|
| `-DCMAKE_BUILD_TYPE=Release` | `Release` | Build configuration (Debug, Release, RelWithDebInfo, MinSizeRel) |
| `-DGGML_CCACHE=ON` | `OFF` | Use ccache to speed up rebuilds |

### Core Features

| Flag | Default | Description |
|------|---------|-------------|
| `-DGGML_ALL=OFF` | `OFF` | Build all backends (convenience flag) |
| `-DGGML_BACKEND_LOAD=OFF` | `OFF` | Dynamic backend loading |
| `-DGGML_NATIVE=ON` | `ON` | Optimize for host CPU (`-march=native`) |
| `-DGGML_LLAMAFILE=OFF` | `OFF` | llama.cpp-specific optimizations |

### Build Components

| Flag | Default | Description |
|------|---------|-------------|
| `-DLLAMA_BUILD_SERVER=ON` | `ON` | Build the `llama-server` tool |
| `-DLLAMA_BUILD_EXAMPLES=ON` | `ON` | Build example programs |
| `-DLLAMA_BUILD_TESTS=OFF` | `OFF` | Build unit tests |
| `-DLLAMA_BUILD_SERVER_EXTRA=OFF` | `OFF` | Build extra server tools |
| `-DLLAMA_JSON_SCHEMA=OFF` | `OFF` | JSON schema validation |
| `-DLLAMA_KV_OVERRIDE=OFF` | `OFF` | KV config override support |
| `-DLLAMA_LLGUIDANCE=OFF` | `OFF` | LLM-guided grammar support |
| `-DLLAMA_N_THREADS` | — | Override default thread count |
| `-DLLAMA_N_THREADS_POOL` | — | Override default thread pool size |

---

### Deprecated CMake Flags

The following CMake options are **deprecated or removed** in upstream llama.cpp:

| Deprecated Flag | Status | Notes |
|---|---|---|
| `LLAMA_CURL` | **Removed** | Use system libcurl directly |
| `LLAMA_CURL_FALLBACK` | **Removed** | Use system libcurl directly |
| `LLAMA_GRPC` | **Removed** | gRPC support no longer included |
| `LLAMA_LLAMA_CURL` | **Removed** | Use system libcurl directly |
| `LLAMA_CUBLAS` | **Removed** | Use `GGML_CUDA` instead |
| `LLAMA_CUDA` | **Removed** | Use `GGML_CUDA` instead |
| `LLAMA_METAL` | **Removed** | Use `GGML_METAL` instead |
| `LLAMA_METAL_EMBED_LIBRARY` | **Removed** | Use `GGML_METAL_EMBED_LIBRARY` instead |
| `LLAMA_NATIVE` | **Removed** | Use `GGML_NATIVE` instead |
| `LLAMA_RPC` | **Removed** | Use `GGML_RPC` instead |
| `LLAMA_SYCL` | **Removed** | Use `GGML_SYCL` instead |
| `LLAMA_SYCL_F16` | **Removed** | Use `GGML_SYCL_F16` instead |
| `LLAMA_CANN` | **Removed** | Use `GGML_CANN` instead |

---

## Build Targets

| Target | Description |
|--------|-------------|
| `llama-server` | OpenAI-compatible HTTP server |
| `llama-cli` | Command-line chat interface |
| `llama-quantize` | Model quantization tool |
| `llama-perplexity` | Perplexity measurement tool |
| `llama-imatrix` | Import matrix tool |
| `llama-convert` | Model conversion tool |
| `llama-bench` | Benchmarking tool |
| `llama-gritlm` | GritLM evaluation tool |

---

## See Also

- [[llama-cpp/build-options/backend-options\|Backend Options]] — GPU backend configuration
- [[llama-cpp/build-options/ggml-options\|GGML Options]] — Low-level GGML tuning
- [[llama-cpp/build-options/build-flags-reference\|Build Flags Reference]] — Complete flag table
