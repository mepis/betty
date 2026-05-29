# Backend Options

GPU accelerators and backend configuration for llama.cpp.

**Tags**: `build`, `cmake`, `gpu`, `cuda`, `rocm`, `vulkan`, `metal`, `sycl`, `opencl`

---

## GPU Backend Options

### NVIDIA CUDA

| Flag                                  | Default | Description                           |
| ------------------------------------- | ------- | ------------------------------------- |
| `-DGGML_CUDA=ON`                      | `OFF`   | Enable CUDA backend                   |
| `-DGGML_CUDA_FORCE_MMQ=OFF`           | `OFF`   | Force MMQ (Matrix Multiply Quantized) |
| `-DGGML_CUDA_FORCE_CUBLAS=OFF`        | `OFF`   | Force cuBLAS backend                  |
| `-DGGML_CUDA_PEER_MAX_BATCH_SIZE`     | —       | Max batch size for peer access        |
| `-DGGML_CUDA_NO_PEER_COPY=OFF`        | `OFF`   | Disable peer-to-peer copy             |
| `-DGGML_CUDA_NO_VMM=OFF`              | `OFF`   | Disable virtual memory management     |
| `-DGGML_CUDA_FA=OFF`                  | `OFF`   | Enable FlashAttention                 |
| `-DGGML_CUDA_FA_ALL_QUANTS=OFF`       | `OFF`   | Flash attention for all quantizations |
| `-DGGML_CUDA_GRAPHS=OFF`              | `OFF`   | Use CUDA graphs for batching          |
| `-DGGML_CUDA_NCCL=OFF`                | `OFF`   | Enable NCCL for multi-GPU             |
| `-DGGML_CUDA_COMPRESSION_MODE`        | —       | Compression mode for KV cache         |

### AMD ROCm / HIP

| Flag                        | Default | Description               |
| --------------------------- | ------- | ------------------------- |
| `-DGGML_HIP=ON`             | `OFF`   | Enable HIP/ROCm backend   |
| `-DGGML_HIP_BLAS_LIB`       | —       | Path to HIP BLAS library  |
| `-DGGML_HIP_PATH`           | —       | Path to HIP installation  |
| `-DGGML_HIP_GRAPHS=OFF`     | `OFF`   | Use HIP graphs for batching |
| `-DGGML_HIP_RCCL=OFF`       | `OFF`   | Enable RCCL for multi-GPU |
| `-DGGML_HIP_NO_VMM=OFF`     | `OFF`   | Disable virtual memory management |
| `-DGGML_HIP_ROCWMMA_FATTN=OFF` | `OFF` | Use ROCm WMMA for FlashAttention |
| `-DGGML_HIP_MMQ_MFMA=OFF`   | `OFF`   | Use MFMA for MMQ          |
| `-DGGML_HIP_EXPORT_METRICS=OFF` | `OFF` | Export HIP metrics        |

### Intel SYCL

| Flag                                | Default  | Description                       |
| ----------------------------------- | -------- | --------------------------------- |
| `-DGGML_SYCL=ON`                    | `OFF`    | Enable SYCL backend               |
| `-DGGML_SYCL_F16=OFF`               | `OFF`    | Enable FP16 for SYCL              |
| `-DGGML_SYCL_GRAPH=OFF`             | `OFF`    | Enable SYCL graphs                |
| `-DGGML_SYCL_HOST_MEM_FALLBACK=OFF` | `OFF`    | Host memory fallback              |
| `-DGGML_SYCL_SUPPORT_LEVEL_ZERO=OFF`| `OFF`    | Enable Level Zero support         |
| `-DGGML_SYCL_DNN=OFF`               | `OFF`    | Enable SYCL DNN                   |
| `-DGGML_SYCL_TARGET`                | —        | SYCL target                       |
| `-DGGML_SYCL_DEVICE_ARCH`           | —        | SYCL device architecture          |

### Vulkan

| Flag                                    | Default | Description                     |
| --------------------------------------- | ------- | ------------------------------- |
| `-DGGML_VULKAN=ON`                      | `OFF`   | Enable Vulkan backend           |
| `-DGGML_VULKAN_CHECK_RESULTS=OFF`       | `OFF`   | Enable Vulkan validation checks |
| `-DGGML_VULKAN_DEBUG=OFF`               | `OFF`   | Enable Vulkan debug output      |
| `-DGGML_VULKAN_MEMORY_DEBUG=OFF`        | `OFF`   | Enable Vulkan memory debug      |
| `-DGGML_VULKAN_SHADER_DEBUG_INFO=OFF`   | `OFF`   | Enable shader debug info        |
| `-DGGML_VULKAN_VALIDATE=OFF`            | `OFF`   | Enable Vulkan validation layers |
| `-DGGML_VULKAN_RUN_TESTS=OFF`           | `OFF`   | Run Vulkan tests                |
| `-DGGML_VULKAN_SHADERS_GEN_TOOLCHAIN`   | —       | Shader generation toolchain     |

### Apple Metal

| Flag                              | Default | Description                      |
| --------------------------------- | ------- | -------------------------------- |
| `-DGGML_METAL=ON`                 | `OFF`   | Enable Metal backend (macOS/iOS) |
| `-DGGML_METAL_NDEBUG=OFF`         | `OFF`   | Disable Metal debug              |
| `-DGGML_METAL_SHADER_DEBUG=OFF`   | `OFF`   | Enable Metal shader debug        |
| `-DGGML_METAL_EMBED_LIBRARY=ON`   | `ON`    | Embed Metal library              |
| `-DGGML_METAL_MACOSX_VERSION_MIN` | —       | Minimum macOS version            |
| `-DGGML_METAL_STD`                | —       | Metal standard version           |

### OpenCL

| Flag                                | Default | Description                     |
| ----------------------------------- | ------- | ------------------------------- |
| `-DGGML_OPENCL=ON`                  | `OFF`   | Enable OpenCL backend           |
| `-DGGML_OPENCL_PROFILING=OFF`       | `OFF`   | Enable OpenCL profiling         |
| `-DGGML_OPENCL_EMBED_KERNELS=ON`    | `ON`    | Embed OpenCL kernels            |
| `-DGGML_OPENCL_USE_ADRENO_KERNELS=OFF` | `OFF` | Use Adreno-specific kernels     |
| `-DGGML_OPENCL_TARGET_VERSION`      | —       | OpenCL target version           |

### Other Backends

| Flag                       | Default | Description                         |
| -------------------------- | ------- | ----------------------------------- |
| `-DGGML_BLAS=OFF`          | `OFF`   | Enable BLAS backend                 |
| `-DGGML_BLAS_VENDOR`       | —       | BLAS vendor (Apple, OpenBLAS, etc.) |
| `-DGGML_RPC=OFF`           | `OFF`   | Enable RPC backend                  |
| `-DGGML_RPC_SERVER=OFF`    | `OFF`   | Build RPC server                    |
| `-DGGML_ACCELERATE=OFF`    | `OFF`   | Use Apple Accelerate framework      |
| `-DGGML_HSA=OFF`           | `OFF`   | Enable HSA backend                  |

---

## Backend Priority

When multiple backends are enabled, llama.cpp selects the best one at runtime based on:

1. GPU availability and memory
2. Layer offload settings (`--n-gpu-layers`)
3. Tensor split configuration (`--tensor-split`)

---

## See Also

- [[llama-cpp/build-options/cmake-overview\|CMake Overview]] — General CMake configuration
- [[llama-cpp/build-options/ggml-options\|GGML Options]] — Low-level GGML tuning
- [[llama-cpp/server-flags/gpu-and-backends\|GPU & Backends]] — Runtime GPU flags
