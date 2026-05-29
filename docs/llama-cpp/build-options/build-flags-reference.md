# Build Flags Reference

Complete table of every `-D...` CMake flag for llama.cpp.

**Tags**: `build`, `cmake`, `reference`, `complete-list`

---

## All Build Flags

### General Build

| Flag | Default | Description |
|------|---------|-------------|
| `-DCMAKE_BUILD_TYPE` | `Release` | Build type (Debug, Release, RelWithDebInfo, MinSizeRel) |
| `-DGGML_CCACHE` | `OFF` | Use ccache for faster rebuilds |
| `-DGGML_NATIVE` | `ON` | Optimize for host CPU (`-march=native`) |
| `-DGGML_LLAMAFILE` | `OFF` | llama.cpp-specific optimizations |
| `-DGGML_SANITIZE_THREAD` | `OFF` | Enable ThreadSanitizer |
| `-DGGML_SANITIZE_ADDRESS` | `OFF` | Enable AddressSanitizer |
| `-DGGML_FATAL_HANDLER` | `ON` | Install fatal signal handler |
| `-DGGML_GPROF` | `OFF` | Enable gprof profiling |
| `-DGGML_ALL` | `OFF` | Build all backends |
| `-DGGML_BACKEND_LOAD` | `OFF` | Dynamic backend loading |

### CPU Vectorization

| Flag | Default | Description |
|------|---------|-------------|
| `-DGGML_AVX` | `ON` | Enable AVX |
| `-DGGML_AVX2` | `ON` | Enable AVX2 |
| `-DGGML_AVX512` | `OFF` | Enable AVX-512 |
| `-DGGML_AVX512_VBMI` | `OFF` | Enable AVX-512 VBMI |
| `-DGGML_AVX512_VNNI` | `OFF` | Enable AVX-512 VNNI |
| `-DGGML_FMA` | `ON` | Enable FMA |
| `-DGGML_F16C` | `ON` | Enable FP16 conversion |
| `-DGGML_LASX` | `OFF` | Enable LoongArch LASX |
| `-DGGML_LSX` | `OFF` | Enable LoongArch LSX |
| `-DGGML_RVV` | `OFF` | Enable RISC-V Vector |
| `-DGGML_ZVE` | `OFF` | Enable RISC-V ZVE |
| `-DGGML_SVE` | `OFF` | Enable ARM SVE |
| `-DGGML_SVE_BITS` | — | ARM SVE vector bits |
| `-DGGML_AMX` | `OFF` | Enable Intel AMX |
| `-DGGML_AMX_BF16` | `OFF` | Enable AMX BF16 |
| `-DGGML_AMX_INT8` | `OFF` | Enable AMX INT8 |
| `-DGGML_AMX_TILE` | `OFF` | Enable AMX tile |
| `-DGGML_OPENMP` | `OFF` | Enable OpenMP |

### CUDA

| Flag | Default | Description |
|------|---------|-------------|
| `-DGGML_CUDA` | `OFF` | Enable CUDA backend |
| `-DGGML_CUDA_FORCE_MMQ` | `OFF` | Force MMQ (Matrix Multiply Quantized) |
| `-DGGML_CUDA_FORCE_CUBLAS` | `OFF` | Force cuBLAS backend |
| `-DGGML_CUDA_PEER_MAX_BATCH_SIZE` | `128` | Max batch size for peer access |
| `-DGGML_CUDA_NO_PEER_COPY` | `OFF` | Disable peer-to-peer copy |
| `-DGGML_CUDA_NO_VMM` | `OFF` | Disable virtual memory management |
| `-DGGML_CUDA_FA` | `OFF` | Enable FlashAttention |
| `-DGGML_CUDA_FA_ALL_QUANTS` | `OFF` | Flash attention for all quantizations |
| `-DGGML_CUDA_GRAPHS` | `OFF` | Use CUDA graphs for batching |
| `-DGGML_CUDA_NCCL` | `OFF` | Enable NCCL for multi-GPU |
| `-DGGML_CUDA_COMPRESSION_MODE` | — | Compression mode for KV cache |

### HIP / ROCm

| Flag | Default | Description |
|------|---------|-------------|
| `-DGGML_HIP` | `OFF` | Enable HIP/ROCm backend |
| `-DGGML_HIP_BLAS_LIB` | — | Path to HIP BLAS library |
| `-DGGML_HIP_PATH` | — | Path to HIP installation |
| `-DGGML_HIP_GRAPHS` | `OFF` | Use HIP graphs for batching |
| `-DGGML_HIP_RCCL` | `OFF` | Enable RCCL for multi-GPU |
| `-DGGML_HIP_NO_VMM` | `OFF` | Disable virtual memory management |
| `-DGGML_HIP_ROCWMMA_FATTN` | `OFF` | Use ROCm WMMA for FlashAttention |
| `-DGGML_HIP_MMQ_MFMA` | `OFF` | Use MFMA for MMQ |
| `-DGGML_HIP_EXPORT_METRICS` | `OFF` | Export HIP metrics |

### SYCL

| Flag | Default | Description |
|------|---------|-------------|
| `-DGGML_SYCL` | `OFF` | Enable SYCL backend |
| `-DGGML_SYCL_F16` | `OFF` | Enable FP16 for SYCL |
| `-DGGML_SYCL_GRAPH` | `OFF` | Enable SYCL graphs |
| `-DGGML_SYCL_HOST_MEM_FALLBACK` | `OFF` | Host memory fallback |
| `-DGGML_SYCL_SUPPORT_LEVEL_ZERO` | `OFF` | Enable Level Zero support |
| `-DGGML_SYCL_DNN` | `OFF` | Enable SYCL DNN |
| `-DGGML_SYCL_TARGET` | — | SYCL target |
| `-DGGML_SYCL_DEVICE_ARCH` | — | SYCL device architecture |

### Vulkan

| Flag | Default | Description |
|------|---------|-------------|
| `-DGGML_VULKAN` | `OFF` | Enable Vulkan backend |
| `-DGGML_VULKAN_CHECK_RESULTS` | `OFF` | Enable Vulkan validation checks |
| `-DGGML_VULKAN_DEBUG` | `OFF` | Enable Vulkan debug output |
| `-DGGML_VULKAN_MEMORY_DEBUG` | `OFF` | Enable Vulkan memory debug |
| `-DGGML_VULKAN_SHADER_DEBUG_INFO` | `OFF` | Enable shader debug info |
| `-DGGML_VULKAN_VALIDATE` | `OFF` | Enable Vulkan validation layers |
| `-DGGML_VULKAN_RUN_TESTS` | `OFF` | Run Vulkan tests |
| `-DGGML_VULKAN_SHADERS_GEN_TOOLCHAIN` | — | Shader generation toolchain |

### Metal

| Flag | Default | Description |
|------|---------|-------------|
| `-DGGML_METAL` | `OFF` | Enable Metal backend (macOS/iOS) |
| `-DGGML_METAL_NDEBUG` | `OFF` | Disable Metal debug |
| `-DGGML_METAL_SHADER_DEBUG` | `OFF` | Enable Metal shader debug |
| `-DGGML_METAL_EMBED_LIBRARY` | `ON` | Embed Metal library |
| `-DGGML_METAL_MACOSX_VERSION_MIN` | — | Minimum macOS version |
| `-DGGML_METAL_STD` | — | Metal standard version |

### OpenCL

| Flag | Default | Description |
|------|---------|-------------|
| `-DGGML_OPENCL` | `OFF` | Enable OpenCL backend |
| `-DGGML_OPENCL_PROFILING` | `OFF` | Enable OpenCL profiling |
| `-DGGML_OPENCL_EMBED_KERNELS` | `ON` | Embed OpenCL kernels |
| `-DGGML_OPENCL_USE_ADRENO_KERNELS` | `OFF` | Use Adreno-specific kernels |
| `-DGGML_OPENCL_TARGET_VERSION` | — | OpenCL target version |

### Other Backends

| Flag | Default | Description |
|------|---------|-------------|
| `-DGGML_BLAS` | `OFF` | Enable BLAS backend |
| `-DGGML_BLAS_VENDOR` | — | BLAS vendor (Apple, OpenBLAS, MKL, etc.) |
| `-DGGML_RPC` | `OFF` | Enable RPC backend |
| `-DGGML_RPC_SERVER` | `OFF` | Build RPC server |
| `-DGGML_ACCELERATE` | `OFF` | Use Apple Accelerate framework |
| `-DGGML_HSA` | `OFF` | Enable HSA backend |

### llama.cpp Components

| Flag | Default | Description |
|------|---------|-------------|
| `-DLLAMA_BUILD_SERVER` | `ON` | Build llama-server |
| `-DLLAMA_BUILD_EXAMPLES` | `ON` | Build examples |
| `-DLLAMA_BUILD_TESTS` | `OFF` | Build tests |
| `-DLLAMA_BUILD_SERVER_EXTRA` | `OFF` | Build extra server tools |
| `-DLLAMA_JSON_SCHEMA` | `OFF` | JSON schema validation |
| `-DLLAMA_KV_OVERRIDE` | `OFF` | KV config override |
| `-DLLAMA_LLGUIDANCE` | `OFF` | LLM-guided grammar |
| `-DLLAMA_N_THREADS` | — | Override default thread count |
| `-DLLAMA_N_THREADS_POOL` | — | Override default thread pool size |

### Deprecated Flags

The following flags are **deprecated or removed** in upstream llama.cpp:

| Deprecated Flag | Replacement | Notes |
|---|---|---|
| `LLAMA_CURL` | (none) | Use system libcurl directly |
| `LLAMA_CURL_FALLBACK` | (none) | Use system libcurl directly |
| `LLAMA_GRPC` | (none) | gRPC support removed |
| `LLAMA_LLAMA_CURL` | (none) | Use system libcurl directly |
| `LLAMA_CUBLAS` | `GGML_CUDA` | Use GGML-level CUDA flag |
| `LLAMA_CUDA` | `GGML_CUDA` | Use GGML-level CUDA flag |
| `LLAMA_METAL` | `GGML_METAL` | Use GGML-level Metal flag |
| `LLAMA_METAL_EMBED_LIBRARY` | `GGML_METAL_EMBED_LIBRARY` | Use GGML-level flag |
| `LLAMA_NATIVE` | `GGML_NATIVE` | Use GGML-level flag |
| `LLAMA_RPC` | `GGML_RPC` | Use GGML-level flag |
| `LLAMA_SYCL` | `GGML_SYCL` | Use GGML-level flag |
| `LLAMA_SYCL_F16` | `GGML_SYCL_F16` | Use GGML-level flag |
| `LLAMA_CANN` | `GGML_CANN` | Use GGML-level flag |

---

## See Also

- [[llama-cpp/build-options/cmake-overview\|CMake Overview]] — General CMake configuration
- [[llama-cpp/build-options/backend-options\|Backend Options]] — GPU backend configuration
- [[llama-cpp/build-options/ggml-options\|GGML Options]] — Low-level GGML tuning
