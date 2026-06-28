---
tags: [reference, llama-cpp, parameters, build, cuda, developer]
---

# llama.cpp Parameters Reference

Comprehensive reference for all llama.cpp build options, CLI parameters, server-specific parameters, environment variables, deprecated parameters, and presets.

## Table of Contents

1. [Build Configuration (CMake Options)](#1-build-configuration-cmake-options)
2. [Common CLI Parameters](#2-common-cli-parameters)
3. [Server-Specific Parameters](#3-server-specific-parameters)
4. [Environment Variables](#4-environment-variables)
5. [Deprecated/Removed Parameters](#5-deprecatedremoved-parameters)
6. [Presets](#6-presets)

---

## 1. Build Configuration (CMake Options)

### General

#### `GGML_NATIVE`
- **Type**: on|off
- **Default**: ON (unless cross-compiling or SOURCE_DATE_EPOCH set)
- **Description**: Optimize the build for the current system's CPU. When enabled, the compiler uses native instruction sets and optimizations.
- **Notes**: Disabling is recommended when building for distribution across different machines.

#### `GGML_LTO`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable link time optimization for smaller and potentially faster binaries.

#### `GGML_CCACHE`
- **Type**: on|off
- **Default**: ON
- **Description**: Use ccache if available to speed up rebuilds.

#### `GGML_STATIC`
- **Type**: on|off
- **Default**: OFF
- **Description**: Static link libraries. Useful for creating portable binaries.

#### `GGML_BACKEND_DL`
- **Type**: on|off
- **Default**: OFF
- **Description**: Build backends as dynamic libraries (requires BUILD_SHARED_LIBS).

#### `GGML_BACKEND_DIR`
- **Type**: PATH
- **Default**: "" (empty)
- **Description**: Directory to load dynamic backends from (requires GGML_BACKEND_DL).

#### `BUILD_SHARED_LIBS`
- **Type**: on|off
- **Default**: ON (OFF on MINGW and Emscripten)
- **Description**: Build shared libraries instead of static ones.

### Debug & Warnings

#### `GGML_ALL_WARNINGS`
- **Type**: on|off
- **Default**: ON
- **Description**: Enable all compiler warnings. Aliased from LLAMA_ALL_WARNINGS in llama.cpp.

#### `GGML_ALL_WARNINGS_3RD_PARTY`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable all compiler warnings in 3rd party libraries.

#### `GGML_FATAL_WARNINGS`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable -Werror flag (treat warnings as errors). Aliased from LLAMA_FATAL_WARNINGS.

#### `GGML_GPROF`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable gprof profiling support.

### Sanitizers

#### `GGML_SANITIZE_THREAD`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable thread sanitizer (TSan). Detects data races.

#### `GGML_SANITIZE_ADDRESS`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable address sanitizer (ASan). Detects memory errors.

#### `GGML_SANITIZE_UNDEFINED`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable undefined behavior sanitizer (UBSan).

### Instruction Sets

#### `GGML_SSE42`
- **Type**: on|off
- **Default**: ON (when GGML_NATIVE is OFF)
- **Description**: Enable SSE 4.2 instruction set. x86_64 only.

#### `GGML_AVX`
- **Type**: on|off
- **Default**: ON (when GGML_NATIVE is OFF)
- **Description**: Enable AVX instruction set. x86_64 only.

#### `GGML_AVX_VNNI`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable AVX-VNNI (Vector Neural Network Instructions) for integer matrix operations.

#### `GGML_AVX2`
- **Type**: on|off
- **Default**: ON (when GGML_NATIVE is OFF)
- **Description**: Enable AVX2 (256-bit) instruction set. x86_64 only.

#### `GGML_BMI2`
- **Type**: on|off
- **Default**: ON (when GGML_NATIVE is OFF)
- **Description**: Enable BMI2 instruction set (bit manipulation). x86_64 only.

#### `GGML_AVX512`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable AVX512F (AVX-512 Foundation) instruction set.

#### `GGML_AVX512_VBMI`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable AVX512-VBMI extension.

#### `GGML_AVX512_VNNI`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable AVX512-VNNI extension for integer dot products.

#### `GGML_AVX512_BF16`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable AVX512-BF16 (Brain Float 16) support.

#### `GGML_FMA`
- **Type**: on|off
- **Default**: ON (when GGML_NATIVE is OFF, not on MSVC)
- **Description**: Enable FMA (Fused Multiply-Add) instructions. Not available on MSVC (implied by AVX2/AVX512).

#### `GGML_F16C`
- **Type**: on|off
- **Default**: ON (when GGML_NATIVE is OFF, not on MSVC)
- **Description**: Enable F16C (half-precision conversion) instructions. Not available on MSVC (implied by AVX2/AVX512).

#### `GGML_AMX_TILE`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable Intel AMX-TILE extension. x86_64 only, not on MSVC.

#### `GGML_AMX_INT8`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable Intel AMX-INT8 extension. x86_64 only, not on MSVC.

#### `GGML_AMX_BF16`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable Intel AMX-BF16 extension. x86_64 only, not on MSVC.

#### `GGML_LASX`
- **Type**: on|off
- **Default**: ON
- **Description**: Enable LoongArch LASX (128-bit SIMD) instructions.

#### `GGML_LSX`
- **Type**: on|off
- **Default**: ON
- **Description**: Enable LoongArch LSX (128-bit SIMD) instructions.

#### `GGML_RVV`
- **Type**: on|off
- **Default**: ON
- **Description**: Enable RISC-V Vector (RVV) extension.

#### `GGML_RV_ZFH`
- **Type**: on|off
- **Default**: ON
- **Description**: Enable RISC-V ZFH (half-precision floating point) extension.

#### `GGML_RV_ZVFH`
- **Type**: on|off
- **Default**: ON
- **Description**: Enable RISC-V ZVFFH (vector half-precision floating point) extension.

#### `GGML_RV_ZICBOP`
- **Type**: on|off
- **Default**: ON
- **Description**: Enable RISC-V ZICBOP (cache optimization hints) extension.

#### `GGML_RV_ZIHINTPAUSE`
- **Type**: on|off
- **Default**: ON
- **Description**: Enable RISC-V ZIHPAUSE (pause instruction hint) extension.

#### `GGML_RV_ZVFBFWMA`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable RISC-V ZVFBFWMA (vector floating-point multiply-accumulate) extension.

#### `GGML_XTHEADVECTOR`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable T-head XtheadVector extension (Xuantie processors).

#### `GGML_VXE`
- **Type**: on|off
- **Default**: ON (when GGML_NATIVE is ON)
- **Description**: Enable Alibaba VXE (vector extension) for Xuantie processors.

### GPU Backends

#### `GGML_CUDA`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable NVIDIA CUDA backend for GPU acceleration. Replaces deprecated LLAMA_CUDA and LLAMA_CUBLAS.

#### `GGML_MUSA`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable MUSA backend for Moore Threads GPUs.

#### `GGML_CUDA_FORCE_MMQ`
- **Type**: on|off
- **Default**: OFF
- **Description**: Use mmq (matrix multiply) kernels instead of cuBLAS. Useful for older GPUs without tensor cores.

#### `GGML_CUDA_FORCE_CUBLAS`
- **Type**: on|off
- **Default**: OFF
- **Description**: Always use cuBLAS instead of mmq kernels.

#### `GGML_CUDA_PEER_MAX_BATCH_SIZE`
- **Type**: INT
- **Default**: 128
- **Description**: Maximum batch size for using peer-to-peer GPU memory access.

#### `GGML_CUDA_NO_PEER_COPY`
- **Type**: on|off
- **Default**: OFF
- **Description**: Disable peer-to-peer GPU memory copies.

#### `GGML_CUDA_NO_VMM`
- **Type**: on|off
- **Default**: OFF
- **Description**: Do not try to use CUDA Virtual Memory Management (VMM).

#### `GGML_CUDA_FA`
- **Type**: on|off
- **Default**: ON
- **Description**: Compile ggml FlashAttention CUDA kernels.

#### `GGML_CUDA_FA_ALL_QUANTS`
- **Type**: on|off
- **Default**: OFF
- **Description**: Compile all quantization variants for FlashAttention (increases compile time).

#### `GGML_CUDA_GRAPHS`
- **Type**: on|off
- **Default**: OFF (can be overridden by llama.cpp CMakeLists.txt to ON)
- **Description**: Use CUDA graphs for improved performance (llama.cpp only).

#### `GGML_CUDA_NCCL`
- **Type**: on|off
- **Default**: ON
- **Description**: Use NVIDIA Collective Communications Library for multi-GPU support.

#### `GGML_CUDA_COMPRESSION_MODE`
- **Type**: none|speed|balance|size
- **Default**: size
- **Description**: CUDA link binary compression mode. Requires CUDA 12.8+.

#### `GGML_HIP`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable AMD ROCm/HIP backend for GPU acceleration.

#### `GGML_HIP_GRAPHS`
- **Type**: on|off
- **Default**: ON
- **Description**: Use HIP graphs for improved performance.

#### `GGML_HIP_RCCL`
- **Type**: on|off
- **Default**: OFF
- **Description**: Use ROCm Collective Communications Library (RCCL) for multi-GPU support.

#### `GGML_HIP_NO_VMM`
- **Type**: on|off
- **Default**: ON
- **Description**: Do not try to use HIP Virtual Memory Management.

#### `GGML_HIP_ROCWMMA_FATTN`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable rocWMMA for FlashAttention on AMD GPUs.

#### `GGML_HIP_MMQ_MFMA`
- **Type**: on|off
- **Default**: ON
- **Description**: Enable MFMA MMA for CDNA architecture in MMQ kernels.

#### `GGML_HIP_EXPORT_METRICS`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable kernel performance metrics output for AMD GPUs.

#### `GGML_MUSA_GRAPHS`
- **Type**: on|off
- **Default**: OFF
- **Description**: Use MUSA graphs (experimental, unstable).

#### `GGML_MUSA_MUDNN_COPY`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable muDNN for accelerated copy operations.

#### `GGML_VULKAN`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable Vulkan backend for cross-vendor GPU acceleration.

#### `GGML_VULKAN_CHECK_RESULTS`
- **Type**: on|off
- **Default**: OFF
- **Description**: Run Vulkan operation result checks for debugging.

#### `GGML_VULKAN_DEBUG`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable Vulkan debug output.

#### `GGML_VULKAN_MEMORY_DEBUG`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable Vulkan memory debug output.

#### `GGML_VULKAN_SHADER_DEBUG_INFO`
- **Type**: on|off
- **Default**: OFF
- **Description**: Include Vulkan shader debug info.

#### `GGML_VULKAN_VALIDATE`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable Vulkan validation layers.

#### `GGML_VULKAN_RUN_TESTS`
- **Type**: on|off
- **Default**: OFF
- **Description**: Run Vulkan backend tests at build time.

#### `GGML_WEBGPU`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable WebGPU backend for browser-based inference.

#### `GGML_WEBGPU_DEBUG`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable WebGPU debug output.

#### `GGML_WEBGPU_CPU_PROFILE`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable WebGPU profiling on CPU side.

#### `GGML_WEBGPU_GPU_PROFILE`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable WebGPU profiling on GPU side.

#### `GGML_WEBGPU_JSPI`
- **Type**: on|off
- **Default**: ON
- **Description**: Use JSPI (JavaScript Promises for WebGPU) for async WebGPU operations.

#### `GGML_ZDNN`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable Intel zDNN (Deep Neural Network) backend for Gaudi AI accelerators.

#### `GGML_VIRTGPU`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable VirtGPU/Virglrenderer API Remoting frontend.

#### `GGML_VIRTGPU_BACKEND`
- **Type**: on|off
- **Default**: OFF
- **Description**: Build the VirtGPU/Virglrenderer API Remoting backend.

#### `GGML_METAL`
- **Type**: on|off
- **Default**: ON on Apple, OFF otherwise
- **Description**: Enable Apple Metal backend for GPU acceleration on macOS/iOS.

#### `GGML_METAL_NDEBUG`
- **Type**: on|off
- **Default**: OFF
- **Description**: Disable Metal debugging (reduces overhead).

#### `GGML_METAL_SHADER_DEBUG`
- **Type**: on|off
- **Default**: OFF
- **Description**: Compile Metal shaders with -fno-fast-math for debugging.

#### `GGML_METAL_EMBED_LIBRARY`
- **Type**: on|off
- **Default**: ON (when GGML_METAL is ON)
- **Description**: Embed Metal library into the binary.

#### `GGML_METAL_STD`
- **Type**: STRING
- **Default**: "" (empty)
- **Description**: Metal standard version (-std flag), e.g., metal3.1.

#### `GGML_METAL_MACOSX_VERSION_MIN`
- **Type**: STRING
- **Default**: "" (empty)
- **Description**: Minimum macOS version for Metal compatibility.

#### `GGML_OPENCL`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable OpenCL backend for cross-platform GPU acceleration.

#### `GGML_OPENCL_PROFILING`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable OpenCL profiling (increases overhead).

#### `GGML_OPENCL_EMBED_KERNELS`
- **Type**: on|off
- **Default**: ON
- **Description**: Embed OpenCL kernels into the binary.

#### `GGML_OPENCL_USE_ADRENO_KERNELS`
- **Type**: on|off
- **Default**: ON
- **Description**: Use optimized OpenCL kernels for Qualcomm Adreno GPUs.

#### `GGML_OPENCL_TARGET_VERSION`
- **Type**: INT
- **Default**: 300
- **Description**: OpenCL API version to target (e.g., 300 for OpenCL 3.0).

#### `GGML_HEXAGON`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable Qualcomm Hexagon DSP backend for mobile inference.

#### `GGML_HEXAGON_FP32_QUANTIZE_GROUP_SIZE`
- **Type**: INT
- **Default**: 128
- **Description**: Quantize group size for Hexagon FP32 quantization (32, 64, or 128).

### CPU / Architecture

#### `GGML_CPU_HBM`
- **Type**: on|off
- **Default**: OFF
- **Description**: Use memkind for High Bandwidth Memory (HBM) support.

#### `GGML_CPU_REPACK`
- **Type**: on|off
- **Default**: ON
- **Description**: Enable runtime weight repacking of Q4_0 to Q4_X_X for better performance.

#### `GGML_CPU_KLEIDIAI`
- **Type**: on|off
- **Default**: OFF
- **Description**: Use KleidiAI optimized kernels where applicable (ARM CPU AI).

#### `GGML_CPU_ALL_VARIANTS`
- **Type**: on|off
- **Default**: OFF
- **Description**: Build all variants of the CPU backend (requires GGML_BACKEND_DL).

#### `GGML_CPU_ARM_ARCH`
- **Type**: STRING
- **Default**: "" (empty)
- **Description**: CPU architecture string for ARM builds.

#### `GGML_CPU_POWERPC_CPUTYPE`
- **Type**: STRING
- **Default**: "" (empty)
- **Description**: CPU type string for PowerPC builds.

### Other Backends

#### `GGML_ACCELERATE`
- **Type**: on|off
- **Default**: ON on Apple, OFF otherwise
- **Description**: Enable Apple Accelerate framework (BLAS/GEMM).

#### `GGML_BLAS`
- **Type**: on|off
- **Default**: ON on Apple, OFF otherwise
- **Description**: Use BLAS library for matrix operations.

#### `GGML_BLAS_VENDOR`
- **Type**: Generic|Apple|OpenBLAS|MKL|BLIS|BLAS
- **Default**: Generic (Apple on macOS)
- **Description**: BLAS library vendor to use.

#### `GGML_LLAMAFILE`
- **Type**: on|off
- **Default**: ON (can be overridden)
- **Description**: Use LLAMAFILE SIMD kernels for CPU inference.

#### `GGML_OPENMP`
- **Type**: on|off
- **Default**: ON
- **Description**: Enable OpenMP support for parallelism.

#### `GGML_RPC`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable RPC (Remote Procedure Call) backend for distributed inference.

#### `GGML_SYCL`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable Intel SYCL backend for oneAPI GPU/CPU acceleration.

#### `GGML_SYCL_F16`
- **Type**: on|off
- **Default**: OFF
- **Description**: Use 16-bit floats for SYCL calculations.

#### `GGML_SYCL_GRAPH`
- **Type**: on|off
- **Default**: ON
- **Description**: Enable SYCL graphs for improved performance.

#### `GGML_SYCL_HOST_MEM_FALLBACK`
- **Type**: on|off
- **Default**: ON
- **Description**: Allow host memory fallback in SYCL reorder (requires kernel 6.8+).

#### `GGML_SYCL_SUPPORT_LEVEL_ZERO_API`
- **Type**: on|off
- **Default**: ON
- **Description**: Use Intel Level Zero API in SYCL backend.

#### `GGML_SYCL_DNN`
- **Type**: on|off
- **Default**: ON
- **Description**: Enable oneDNN in the SYCL backend.

#### `GGML_SYCL_TARGET`
- **Type**: INTEL|CPU|GPU|ACCEL
- **Default**: INTEL
- **Description**: SYCL target device type.

#### `GGML_SYCL_DEVICE_ARCH`
- **Type**: STRING
- **Default**: "" (empty)
- **Description**: SYCL device architecture string (e.g., "gen12lp", "xehp").

#### `GGML_OPENVINO`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable Intel OpenVINO backend for CPU/GPU acceleration.

#### `GGML_WEBLLM`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable WebLLM backend (Web-based LLM inference).

#### `GGML_WEBLLM_LOG_DEBUG`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable WebLLM debug logging.

#### `GGML_WEBLLM_LOG_VERBOSE`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable WebLLM verbose logging.

#### `GGML_BEDROCK`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable AWS Bedrock integration.

#### `GGML_AZURE`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable Azure AI integration.

### Scheduling

#### `GGML_SCHED_MAX_COPIES`
- **Type**: INT
- **Default**: 4
- **Description**: Maximum number of input copies for pipeline parallelism.

#### `GGML_SCHED_NO_REALLOC`
- **Type**: on|off
- **Default**: OFF
- **Description**: Disallow reallocations in ggml-alloc (for debugging).

#### `GGML_CPU`
- **Type**: on|off
- **Default**: ON
- **Description**: Enable CPU backend.

### Logging

#### `GGML_LOG_LEVEL`
- **Type**: INT
- **Default**: 3 (info)
- **Description**: Logging verbosity level (0=generic, 1=error, 2=warning, 3=info, 4=trace, 5=debug).

#### `GGML_LOG_THREADS`
- **Type**: on|off
- **Default**: OFF
- **Description**: Include thread IDs in log messages.

#### `GGML_LOG_CALLBACK`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable custom log callback.

### Quantization Types

These are not build options but are referenced throughout the codebase. They define the quantization formats supported:

| Option | Quantization Format |
|--------|-------------------|
| `GGML_Q4_0` | 4-bit quantization (original) |
| `GGML_Q4_1` | 4-bit quantization with scaling |
| `GGML_Q5_0` | 5-bit quantization (original) |
| `GGML_Q5_1` | 5-bit quantization with scaling |
| `GGML_Q8_0` | 8-bit quantization (original) |
| `GGML_Q8_1` | 8-bit quantization with scaling |
| `GGML_Q2_K` | 2-bit K-quants |
| `GGML_Q3_K` | 3-bit K-quants |
| `GGML_Q4_K` | 4-bit K-quants |
| `GGML_Q5_K` | 5-bit K-quants |
| `GGML_Q6_K` | 6-bit K-quants |
| `GGML_IQ2_XXS` | 2-bit IQ2 extreme small |
| `GGML_IQ2_XS` | 2-bit IQ2 extra small |
| `GGML_IQ2_S` | 2-bit IQ2 small |
| `GGML_IQ2_M` | 2-bit IQ2 medium |
| `GGML_IQ3_XXS` | 3-bit IQ3 extreme small |
| `GGML_IQ3_S` | 3-bit IQ3 small |
| `GGML_IQ3_XS` | 3-bit IQ3 extra small |
| `GGML_IQ2_SXS` | 2-bit IQ2 SXS |
| `GGML_IQ2_2BIT` | 2-bit IQ2 |
| `GGML_IQ2_2BIT_S` | 2-bit IQ2 S |
| `GGML_IQ1_S` | 1-bit IQ1 small |
| `GGML_IQ1_M` | 1-bit IQ1 medium |
| `GGML_IQ4_XS` | 4-bit IQ4 extra small |
| `GGML_IQ4_NL` | 4-bit IQ4 non-linear |

### llama.cpp-specific

#### `LLAMA_USE_SYSTEM_GGML`
- **Type**: on|off
- **Default**: OFF
- **Description**: Use system-installed libggml instead of building the bundled version.

#### `LLAMA_WASM_MEM64`
- **Type**: on|off
- **Default**: ON
- **Description**: Use 64-bit memory in WASM builds for supporting backend_get_memory queries.

#### `LLAMA_WASM_SINGLE_FILE`
- **Type**: on|off
- **Default**: OFF
- **Description**: Embed WASM inside the generated llama.js (Emscripten only).

#### `LLAMA_BUILD_HTML`
- **Type**: on|off
- **Default**: ON
- **Description**: Build HTML file for WASM builds.

#### `LLAMA_ALL_WARNINGS`
- **Type**: on|off
- **Default**: ON
- **Description**: Enable all compiler warnings for llama.cpp (also sets GGML_ALL_WARNINGS).

#### `LLAMA_ALL_WARNINGS_3RD_PARTY`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable all warnings in 3rd party libs for llama.cpp (also sets GGML_ALL_WARNINGS_3RD_PARTY).

#### `LLAMA_FATAL_WARNINGS`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable -Werror flag for llama.cpp (also sets GGML_FATAL_WARNINGS).

#### `LLAMA_SANITIZE_THREAD`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable thread sanitizer for llama.cpp (also sets GGML_SANITIZE_THREAD).

#### `LLAMA_SANITIZE_ADDRESS`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable address sanitizer for llama.cpp (also sets GGML_SANITIZE_ADDRESS).

#### `LLAMA_SANITIZE_UNDEFINED`
- **Type**: on|off
- **Default**: OFF
- **Description**: Enable undefined behavior sanitizer for llama.cpp (also sets GGML_SANITIZE_UNDEFINED).

#### `LLAMA_BUILD_COMMON`
- **Type**: on|off
- **Default**: ON (when standalone)
- **Description**: Build the common utilities library (llama-common).

#### `LLAMA_BUILD_TESTS`
- **Type**: on|off
- **Default**: ON (when standalone)
- **Description**: Build the test suite.

#### `LLAMA_BUILD_TOOLS`
- **Type**: on|off
- **Default**: ON (when standalone)
- **Description**: Build additional tools.

#### `LLAMA_BUILD_EXAMPLES`
- **Type**: on|off
- **Default**: ON (when standalone)
- **Description**: Build example programs.

#### `LLAMA_BUILD_SERVER`
- **Type**: on|off
- **Default**: ON (when standalone)
- **Description**: Build the llama-server example.

#### `LLAMA_BUILD_APP`
- **Type**: on|off
- **Default**: ON (when standalone)
- **Description**: Build the unified binary (llama-app).

#### `LLAMA_BUILD_UI`
- **Type**: on|off
- **Default**: ON
- **Description**: Build the embedded Web UI for the server.

#### `LLAMA_USE_PREBUILT_UI`
- **Type**: on|off
- **Default**: ON
- **Description**: Use prebuilt UI from Hugging Face bucket when available (requires LLAMA_BUILD_UI=ON).

#### `LLAMA_OPENSSL`
- **Type**: on|off
- **Default**: ON
- **Description**: Use OpenSSL to support HTTPS connections.

#### `LLAMA_LLGUIDANCE`
- **Type**: on|off
- **Default**: OFF
- **Description**: Include LLGuidance library for structured output in common utils.

---

## 2. Common CLI Parameters

### General

#### `-h` / `--help` / `--usage`
- **Type**: flag
- **Default**: N/A
- **Description**: Print usage information and exit.
- **Notes**: Shows all available options for the current example.

#### `--version`
- **Type**: flag
- **Default**: N/A
- **Description**: Show version and build information, then exit.

#### `-cl` / `--cache-list`
- **Type**: flag
- **Default**: N/A
- **Description**: Show list of models in the cache, then exit.

#### `--completion-bash`
- **Type**: flag
- **Default**: N/A
- **Description**: Print source-able bash completion script for llama.cpp.

#### `--verbose-prompt`
- **Type**: flag
- **Default**: false
- **Description**: Print a verbose prompt before generation.
- **Examples**: COMPLETION, CLI, EMBEDDING, RETRIEVAL

#### `--display-prompt` / `--no-display-prompt`
- **Type**: on|off
- **Default**: true
- **Description**: Whether to print the prompt at generation time.
- **Examples**: COMPLETION, CLI

#### `-co` / `--color`
- **Type**: on|off|auto
- **Default**: auto (auto-detects terminal)
- **Description**: Colorize output to distinguish prompt and user input from generations.
- **Examples**: COMPLETION, CLI, SPECULATIVE, LOOKUP

### CPU/Threading

#### `-t` / `--threads`
- **Type**: INT
- **Default**: hardware_concurrency()
- **Description**: Number of CPU threads to use during generation.
- **Env**: `LLAMA_ARG_THREADS`

#### `-tb` / `--threads-batch`
- **Type**: INT
- **Default**: same as --threads
- **Description**: Number of threads to use during batch and prompt processing.

#### `-C` / `--cpu-mask`
- **Type**: STRING (hex)
- **Default**: "" (empty, any CPU)
- **Description**: CPU affinity mask as arbitrarily long hex string. Complements --cpu-range.

#### `-Cr` / `--cpu-range`
- **Type**: STRING (lo-hi)
- **Default**: "" (empty, any CPU)
- **Description**: Range of CPUs for affinity. Complements --cpu-mask.

#### `--cpu-strict`
- **Type**: 0|1
- **Default**: 0
- **Description**: Use strict CPU placement for thread scheduling.

#### `--prio`
- **Type**: INT (-1 to 3)
- **Default**: 0 (normal)
- **Description**: Set process/thread priority: low(-1), normal(0), medium(1), high(2), realtime(3).

#### `--poll`
- **Type**: INT (0-100)
- **Default**: 50
- **Description**: Use polling level to wait for work (0 = no polling, 100 = mostly polling).

#### `-Cb` / `--cpu-mask-batch`
- **Type**: STRING (hex)
- **Default**: same as --cpu-mask
- **Description**: CPU affinity mask for batch processing.

#### `-Crb` / `--cpu-range-batch`
- **Type**: STRING (lo-hi)
- **Default**: same as --cpu-range
- **Description**: Range of CPUs for batch processing affinity.

#### `--cpu-strict-batch`
- **Type**: 0|1
- **Default**: same as --cpu-strict
- **Description**: Use strict CPU placement for batch processing.

#### `--prio-batch`
- **Type**: INT (0-3)
- **Default**: same as --prio
- **Description**: Set process/thread priority for batch processing.

#### `--poll-batch`
- **Type**: 0|1
- **Default**: same as --poll
- **Description**: Use polling to wait for batch model work.

### Context/Generation

#### `-c` / `--ctx-size`
- **Type**: INT
- **Default**: 0 (loaded from model)
- **Description**: Size of the prompt context. 0 = use model's training context size.
- **Env**: `LLAMA_ARG_CTX_SIZE`

#### `-n` / `--predict` / `--n-predict`
- **Type**: INT
- **Default**: -1 (infinity)
- **Description**: Number of tokens to predict. -1 = infinity, -2 = until context filled (COMPLETION only).
- **Env**: `LLAMA_ARG_N_PREDICT`

#### `-b` / `--batch-size`
- **Type**: INT
- **Default**: 2048
- **Description**: Logical maximum batch size (must be >= 32 to use BLAS).
- **Env**: `LLAMA_ARG_BATCH`

#### `-ub` / `--ubatch-size`
- **Type**: INT
- **Default**: 512
- **Description**: Physical maximum batch size (must be >= 32 to use BLAS).
- **Env**: `LLAMA_ARG_UBATCH`

#### `--keep`
- **Type**: INT
- **Default**: 0
- **Description**: Number of tokens to keep from the initial prompt. -1 = keep all.

#### `--swa-full`
- **Type**: flag
- **Default**: false
- **Description**: Use full-size SWA (Sliding Window Attention) cache.
- **Env**: `LLAMA_ARG_SWA_FULL`

#### `-ctxcp` / `--ctx-checkpoints` / `--swa-checkpoints`
- **Type**: INT
- **Default**: 32
- **Description**: Maximum number of context checkpoints to create per slot.
- **Env**: `LLAMA_ARG_CTX_CHECKPOINTS`
- **Examples**: SERVER, CLI

#### `-cms` / `--checkpoint-min-step`
- **Type**: INT
- **Default**: 256
- **Description**: Minimum spacing between context checkpoints in tokens. 0 = no minimum.
- **Env**: `LLAMA_ARG_CHECKPOINT_MIN_SPACING_NT`
- **Examples**: SERVER

#### `-cram` / `--cache-ram`
- **Type**: INT (MiB)
- **Default**: 8192
- **Description**: Maximum cache size in MiB. -1 = no limit, 0 = disable.
- **Env**: `LLAMA_ARG_CACHE_RAM`
- **Examples**: SERVER, CLI

#### `-kvu` / `--kv-unified` / `--no-kv-unified`
- **Type**: on|off
- **Default**: auto (enabled if number of slots is auto)
- **Description**: Use single unified KV buffer shared across all sequences.
- **Env**: `LLAMA_ARG_KV_UNIFIED`
- **Examples**: SERVER, PERPLEXITY, BATCHED, BENCH, PARALLEL

#### `--cache-idle-slots` / `--no-cache-idle-slots`
- **Type**: on|off
- **Default**: true
- **Description**: Save idle slots to the prompt cache on new task. Requires cache-ram.
- **Env**: `LLAMA_ARG_CACHE_IDLE_SLOTS`
- **Examples**: SERVER

#### `--context-shift` / `--no-context-shift`
- **Type**: on|off
- **Default**: disabled
- **Description**: Whether to use context shift on infinite text generation.
- **Env**: `LLAMA_ARG_CONTEXT_SHIFT`
- **Examples**: COMPLETION, CLI, SERVER, IMATRIX, PERPLEXITY

#### `--chunks`
- **Type**: INT
- **Default**: -1 (all)
- **Description**: Maximum number of chunks to process.
- **Examples**: IMATRIX, PERPLEXITY, RETRIEVAL

#### `-fa` / `--flash-attn`
- **Type**: on|off|auto
- **Default**: auto
- **Description**: Set Flash Attention use. 'on' = enabled, 'off' = disabled, 'auto' = automatic.
- **Env**: `LLAMA_ARG_FLASH_ATTN`

### Model Loading

#### `-m` / `--model`
- **Type**: FILE
- **Default**: "" (required)
- **Description**: Model path to load. Required for all examples except server.
- **Env**: `LLAMA_ARG_MODEL`

#### `--mmap` / `--no-mmap`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Whether to memory-map the model. If mmap is disabled, loading is slower but may reduce pageouts when using mlock.
- **Env**: `LLAMA_ARG_MMAP`

#### `-dio` / `--direct-io` / `--no-direct-io`
- **Type**: on|off
- **Default**: false
- **Description**: Use DirectIO for disk reads if available.
- **Env**: `LLAMA_ARG_DIO`

#### `--mlock`
- **Type**: flag
- **Default**: false
- **Description**: Force system to keep model in RAM rather than swapping or compressing.
- **Env**: `LLAMA_ARG_MLOCK`

#### `--numa`
- **Type**: distribute|isolate|numactl
- **Default**: disabled
- **Description**: Attempt optimizations for NUMA systems.
  - **distribute**: Spread execution evenly over all nodes
  - **isolate**: Only spawn threads on CPUs on the node where execution started
  - **numactl**: Use the CPU map provided by numactl
- **Env**: `LLAMA_ARG_NUMA`

#### `-dev` / `--device`
- **Type**: STRING (comma-separated device names)
- **Default**: all available devices
- **Description**: Comma-separated list of devices to use for offloading. Use "none" to not offload.
- **Env**: `LLAMA_ARG_DEVICE`

#### `--list-devices`
- **Type**: flag
- **Default**: N/A
- **Description**: Print list of available devices and exit.

#### `-ot` / `--override-tensor`
- **Type**: STRING (tensor=buffer_type,...)
- **Default**: "" (none)
- **Description**: Override tensor buffer type. Format: `tensor_name_pattern=buffer_type,tensor2=type2`.
- **Env**: `LLAMA_ARG_OVERRIDE_TENSOR`

#### `-cmoe` / `--cpu-moe`
- **Type**: flag
- **Default**: false
- **Description**: Keep all Mixture of Experts (MoE) weights in the CPU.
- **Env**: `LLAMA_ARG_CPU_MOE`

#### `-ncmoe` / `--n-cpu-moe`
- **Type**: INT
- **Default**: 0
- **Description**: Keep the MoE weights of the first N layers in the CPU.
- **Env**: `LLAMA_ARG_N_CPU_MOE`

#### `--fit`
- **Type**: on|off
- **Default**: true (on)
- **Description**: Whether to adjust unset arguments to fit in device memory.
- **Env**: `LLAMA_ARG_FIT`

#### `-fitp` / `--fit-print`
- **Type**: on|off
- **Default**: false
- **Description**: Print the estimated required memory to run the model.
- **Env**: `LLAMA_ARG_FIT_ESTIMATE`
- **Examples**: FIT_PARAMS

#### `-fitt` / `--fit-target`
- **Type**: STRING (MiB,...)
- **Default**: 1024 MiB per device
- **Description**: Target margin per device for --fit. Comma-separated list of values.
- **Env**: `LLAMA_ARG_FIT_TARGET`

#### `-fitt` / `--fit-ctx`
- **Type**: INT
- **Default**: 4096
- **Description**: Minimum context size that can be set by --fit option.
- **Env**: `LLAMA_ARG_FIT_CTX`

#### `--check-tensors`
- **Type**: flag
- **Default**: false
- **Description**: Check model tensor data for invalid values.

#### `--override-kv`
- **Type**: STRING (KEY=TYPE:VALUE,...)
- **Default**: "" (none)
- **Description**: Advanced option to override model metadata by key. Types: int, float, bool, str. Example: `--override-kv tokenizer.ggml.add_bos_token=bool:false,tokenizer.ggml.add_eos_token=bool:false`

#### `--op-offload` / `--no-op-offload`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Whether to offload host tensor operations to device.

#### `--no-host`
- **Type**: flag
- **Default**: false
- **Description**: Bypass host buffer, allowing extra buffers to be used.
- **Env**: `LLAMA_ARG_NO_HOST`

### GPU Offloading

#### `-ngl` / `--gpu-layers` / `--n-gpu-layers`
- **Type**: INT | "auto" | "all"
- **Default**: auto (-1)
- **Description**: Maximum number of layers to store in VRAM. "auto" = automatic, "all" = all layers (-2).
- **Env**: `LLAMA_ARG_N_GPU_LAYERS`

#### `-sm` / `--split-mode`
- **Type**: none|layer|row|tensor
- **Default**: layer
- **Description**: How to split the model across multiple GPUs:
  - **none**: Use one GPU only
  - **layer** (default): Split layers and KV across GPUs (pipelined)
  - **row**: Split weights across GPUs by rows (parallelized)
  - **tensor**: Split weights and KV across GPUs (parallelized, experimental)
- **Env**: `LLAMA_ARG_SPLIT_MODE`

#### `-ts` / `--tensor-split`
- **Type**: STRING (comma-separated floats)
- **Default**: 0 (no split)
- **Description**: Fraction of the model to offload to each GPU. Comma-separated proportions, e.g., `3,1`.
- **Env**: `LLAMA_ARG_TENSOR_SPLIT`

#### `-mg` / `--main-gpu`
- **Type**: INT
- **Default**: 0
- **Description**: The GPU to use for scratch and small tensors (with split-mode=none), or for intermediate results and KV (with split-mode=row).
- **Env**: `LLAMA_ARG_MAIN_GPU`

### KV Cache

#### `-kvo` / `--kv-offload` / `--no-kv-offload`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Whether to enable KV cache offloading to CPU.
- **Env**: `LLAMA_ARG_KV_OFFLOAD`

#### `-ctk` / `--cache-type-k`
- **Type**: TYPE (f32|f16|bf16|q8_0|q4_0|q4_1|iq4_nl|q5_0|q5_1)
- **Default**: f16
- **Description**: KV cache data type for K.
- **Env**: `LLAMA_ARG_CACHE_TYPE_K`

#### `-ctv` / `--cache-type-v`
- **Type**: TYPE (f32|f16|bf16|q8_0|q4_0|q4_1|iq4_nl|q5_0|q5_1)
- **Default**: f16
- **Description**: KV cache data type for V.
- **Env**: `LLAMA_ARG_CACHE_TYPE_V`

### RoPE/Context Scaling

#### `--rope-scaling`
- **Type**: none|linear|yarn
- **Default**: unspecified (use model default)
- **Description**: RoPE frequency scaling method.
- **Env**: `LLAMA_ARG_ROPE_SCALING_TYPE`

#### `--rope-scale`
- **Type**: FLOAT
- **Default**: 1.0 (no scaling)
- **Description**: RoPE context scaling factor. Expands context by a factor of N.
- **Env**: `LLAMA_ARG_ROPE_SCALE`

#### `--rope-freq-base`
- **Type**: FLOAT
- **Default**: loaded from model (0.0 = use model default)
- **Description**: RoPE base frequency, used by NTK-aware scaling.
- **Env**: `LLAMA_ARG_ROPE_FREQ_BASE`

#### `--rope-freq-scale`
- **Type**: FLOAT
- **Default**: 1.0 (no scaling)
- **Description**: RoPE frequency scaling factor. Expands context by a factor of 1/N.
- **Env**: `LLAMA_ARG_ROPE_FREQ_SCALE`

#### `--yarn-orig-ctx`
- **Type**: INT
- **Default**: 0 (model training context size)
- **Description**: YaRN: original context length of the model.
- **Env**: `LLAMA_ARG_YARN_ORIG_CTX`

#### `--yarn-ext-factor`
- **Type**: FLOAT
- **Default**: -1.0 (full interpolation)
- **Description**: YaRN: extrapolation mix factor.
- **Env**: `LLAMA_ARG_YARN_EXT_FACTOR`

#### `--yarn-attn-factor`
- **Type**: FLOAT
- **Default**: -1.0 (auto)
- **Description**: YaRN: scale sqrt(t) or attention magnitude.
- **Env**: `LLAMA_ARG_YARN_ATTN_FACTOR`

#### `--yarn-beta-slow`
- **Type**: FLOAT
- **Default**: -1.0 (auto)
- **Description**: YaRN: high correction dim or alpha.
- **Env**: `LLAMA_ARG_YARN_BETA_SLOW`

#### `--yarn-beta-fast`
- **Type**: FLOAT
- **Default**: -1.0 (auto)
- **Description**: YaRN: low correction dim or beta.
- **Env**: `LLAMA_ARG_YARN_BETA_FAST`

### Group Attention

#### `-gan` / `--grp-attn-n`
- **Type**: INT
- **Default**: 1
- **Description**: Group-attention factor (number of groups).
- **Env**: `LLAMA_ARG_GRP_ATTN_N`
- **Examples**: COMPLETION, PASSKEY

#### `-gaw` / `--grp-attn-w`
- **Type**: INT
- **Default**: 512
- **Description**: Group-attention width (tokens per group).
- **Env**: `LLAMA_ARG_GRP_ATTN_W`
- **Examples**: COMPLETION

### Multimodal

#### `-mm` / `--mmproj`
- **Type**: FILE
- **Default**: "" (none)
- **Description**: Path to a multimodal projector file. Auto-downloaded when using -hf.
- **Env**: `LLAMA_ARG_MMPROJ`

#### `-mmu` / `--mmproj-url`
- **Type**: URL
- **Default**: "" (none)
- **Description**: URL to a multimodal projector file.
- **Env**: `LLAMA_ARG_MMPROJ_URL`

#### `--mmproj-auto` / `--no-mmproj` / `--no-mmproj-auto`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Whether to use multimodal projector file if available (useful with -hf).
- **Env**: `LLAMA_ARG_MMPROJ_AUTO`

#### `--mmproj-offload` / `--no-mmproj-offload`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Whether to enable GPU offloading for multimodal projector.
- **Env**: `LLAMA_ARG_MMPROJ_OFFLOAD`

#### `--image` / `--audio` / `--video`
- **Type**: FILE (comma-separated)
- **Default**: "" (none)
- **Description**: Path to an image, audio, or video file. Use comma-separated values for multiple files.
- **Examples**: MTMD, CLI

#### `--image-min-tokens`
- **Type**: INT
- **Default**: read from model
- **Description**: Minimum number of tokens each image can take (vision models with dynamic resolution).
- **Env**: `LLAMA_ARG_IMAGE_MIN_TOKENS`

#### `--image-max-tokens`
- **Type**: INT
- **Default**: read from model
- **Description**: Maximum number of tokens each image can take (vision models with dynamic resolution).
- **Env**: `LLAMA_ARG_IMAGE_MAX_TOKENS`

#### `--mtmd-batch-max-tokens`
- **Type**: INT
- **Default**: 1024
- **Description**: Maximum number of image tokens per batch when encoding images.
- **Env**: `LLAMA_ARG_MTMD_BATCH_MAX_TOKENS`
- **Examples**: SERVER

### Prompt/Input

#### `-p` / `--prompt`
- **Type**: STRING
- **Default**: "" (none)
- **Description**: Prompt to start generation with. Use -sys for system message.
- **Excludes**: SERVER

#### `-sys` / `--system-prompt`
- **Type**: STRING
- **Default**: "" (none)
- **Description**: System prompt to use with model (depending on chat template).
- **Examples**: COMPLETION, CLI, DIFFUSION, MTMD

#### `-f` / `--file`
- **Type**: FILE
- **Default**: "" (none)
- **Description**: File containing the prompt.
- **Excludes**: SERVER

#### `-sysf` / `--system-prompt-file`
- **Type**: FILE
- **Default**: "" (none)
- **Description**: File containing the system prompt.
- **Examples**: COMPLETION, CLI, DIFFUSION

#### `--in-file`
- **Type**: FILE (comma-separated)
- **Default**: "" (none)
- **Description**: Input file(s) for imatrix processing.
- **Examples**: IMATRIX

#### `-bf` / `--binary-file`
- **Type**: FILE
- **Default**: "" (none)
- **Description**: Binary file containing the prompt.
- **Excludes**: SERVER

#### `-e` / `--escape` / `--no-escape`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Whether to process escape sequences (\n, \r, \t, \', \", \\).

#### `-ptc` / `--print-token-count`
- **Type**: INT
- **Default**: -1 (disabled)
- **Description**: Print token count every N tokens.
- **Examples**: COMPLETION

#### `--prompt-cache`
- **Type**: FILE
- **Default**: "" (none)
- **Description**: File to cache prompt state for faster startup.
- **Examples**: COMPLETION

#### `--prompt-cache-all`
- **Type**: flag
- **Default**: false
- **Description**: Save user input and generations to prompt cache as well.
- **Examples**: COMPLETION

#### `--prompt-cache-ro`
- **Type**: flag
- **Default**: false
- **Description**: Use the prompt cache in read-only mode (do not update).
- **Examples**: COMPLETION

#### `-r` / `--reverse-prompt`
- **Type**: STRING
- **Default**: "" (none)
- **Description**: Halt generation at this prompt, return control in interactive mode. Can be specified multiple times.
- **Examples**: COMPLETION, CLI, SERVER

#### `-sp` / `--special`
- **Type**: flag
- **Default**: false
- **Description**: Enable special token output (rendering).
- **Examples**: COMPLETION, CLI, SERVER

#### `-cnv` / `--conversation` / `--no-conversation`
- **Type**: on|off
- **Default**: auto (enabled if chat template is available)
- **Description**: Run in conversation mode (no special tokens/suffix/prefix output, enables interactive mode).
- **Examples**: COMPLETION, CLI

#### `-st` / `--single-turn`
- **Type**: flag
- **Default**: false
- **Description**: Run conversation for a single turn only, then exit.
- **Examples**: COMPLETION, CLI

#### `-i` / `--interactive`
- **Type**: flag
- **Default**: false
- **Description**: Run in interactive mode.
- **Examples**: COMPLETION

#### `-if` / `--interactive-first`
- **Type**: flag
- **Default**: false
- **Description**: Run in interactive mode and wait for user input immediately.
- **Examples**: COMPLETION

#### `-mli` / `--multiline-input`
- **Type**: flag
- **Default**: false
- **Description**: Allow writing or pasting multiple lines without ending each in '\'.
- **Examples**: COMPLETION, CLI

#### `--in-prefix-bos`
- **Type**: flag
- **Default**: false
- **Description**: Prefix BOS token to user inputs, preceding the --in-prefix string.
- **Examples**: COMPLETION

#### `--in-prefix`
- **Type**: STRING
- **Default**: "" (empty)
- **Description**: String to prefix user inputs with.
- **Examples**: COMPLETION

#### `--in-suffix`
- **Type**: STRING
- **Default**: "" (empty)
- **Description**: String to suffix after user inputs with.
- **Examples**: COMPLETION

#### `--warmup` / `--no-warmup`
- **Type**: on|off
- **Default**: enabled
- **Description**: Whether to perform a warmup run with an empty prompt.
- **Examples**: COMPLETION, CLI, SERVER, MTMD, EMBEDDING, RETRIEVAL, PERPLEXITY, DEBUG

#### `--spm-infill`
- **Type**: flag
- **Default**: false
- **Description**: Use Suffix/Prefix/Middle pattern for infill (some models prefer this over Prefix/Suffix/Middle).
- **Examples**: SERVER

#### `--samplers`
- **Type**: STRING (samplers separated by ';')
- **Default**: penalties;dry;top-n-sigma;top-k;typical-p;top-p;min-p;xtc;temperature
- **Description**: Samplers used for generation in order, separated by ';'.
- **Env**: `LLAMA_ARG_SAMPLERS`

#### `-s` / `--seed`
- **Type**: UINT
- **Default**: LLAMA_DEFAULT_SEED (random)
- **Description**: RNG seed for reproducible generation.
- **Sampling**

#### `--sampler-seq` / `--sampling-seq`
- **Type**: STRING (single-char codes)
- **Default**: derived from default samplers
- **Description**: Simplified sampler sequence using single-character codes (e.g., "kt").
- **Sampling**

#### `--ignore-eos`
- **Type**: flag
- **Default**: false
- **Description**: Ignore end-of-stream token and continue generating. Implies --logit-bias EOS-inf.
- **Sampling**

### Sampling

#### `--temp` / `--temperature`
- **Type**: FLOAT
- **Default**: 0.80
- **Description**: Temperature for sampling. <= 0.0 = greedy, 0.0 = don't output probabilities.
- **Sampling**

#### `--top-k`
- **Type**: INT
- **Default**: 40
- **Description**: Top-K sampling. 0 = disabled (use vocab size).
- **Env**: `LLAMA_ARG_TOP_K`
- **Sampling**

#### `--top-p`
- **Type**: FLOAT
- **Default**: 0.95
- **Description**: Top-P (nucleus) sampling. 1.0 = disabled.
- **Sampling**

#### `--min-p`
- **Type**: FLOAT
- **Default**: 0.05
- **Description**: Min-P sampling. 0.0 = disabled.
- **Sampling**

#### `--top-nsigma` / `--top-n-sigma`
- **Type**: FLOAT
- **Default**: -1.0 (disabled)
- **Description**: Top-n-sigma sampling. -1.0 = disabled.
- **Sampling**

#### `--xtc-probability`
- **Type**: FLOAT
- **Default**: 0.00
- **Description**: XTC (eXclusion Top-C) probability. 0.0 = disabled.
- **Sampling**

#### `--xtc-threshold`
- **Type**: FLOAT
- **Default**: 0.10
- **Description**: XTC threshold. > 0.5 disables XTC.
- **Sampling**

#### `--typical` / `--typical-p`
- **Type**: FLOAT
- **Default**: 1.00
- **Description**: Locally typical sampling parameter p. 1.0 = disabled.
- **Sampling**

#### `--repeat-last-n`
- **Type**: INT
- **Default**: 64
- **Description**: Last N tokens to consider for repetition penalty. 0 = disabled, -1 = context size.
- **Sampling**

#### `--repeat-penalty`
- **Type**: FLOAT
- **Default**: 1.00
- **Description**: Penalize repeat sequences of tokens. 1.0 = disabled.
- **Sampling**

#### `--presence-penalty`
- **Type**: FLOAT
- **Default**: 0.00
- **Description**: Repeat alpha presence penalty. 0.0 = disabled.
- **Sampling**

#### `--frequency-penalty`
- **Type**: FLOAT
- **Default**: 0.00
- **Description**: Repeat alpha frequency penalty. 0.0 = disabled.
- **Sampling**

#### `--dry-multiplier`
- **Type**: FLOAT
- **Default**: 0.00
- **Description**: DRY sampling multiplier. 0.0 = disabled.
- **Sampling**

#### `--dry-base`
- **Type**: FLOAT
- **Default**: 1.75
- **Description**: DRY sampling base value. Must be < 1.0.
- **Sampling**

#### `--dry-allowed-length`
- **Type**: INT
- **Default**: 2
- **Description**: Allowed length for DRY sampling before penalty applies.
- **Sampling**

#### `--dry-penalty-last-n`
- **Type**: INT
- **Default**: -1 (context size)
- **Description**: DRY penalty for the last N tokens. 0 = disable, -1 = context size.
- **Sampling**

#### `--dry-sequence-breaker`
- **Type**: STRING
- **Default**: "\n", ":", "\"", "*"
- **Description**: Add sequence breaker for DRY sampling. Use "none" to clear defaults.
- **Sampling**

#### `--adaptive-target`
- **Type**: FLOAT (0.0-1.0)
- **Default**: -1.0 (disabled)
- **Description**: Adaptive-P: select tokens near this probability.
- **Sampling**

#### `--adaptive-decay`
- **Type**: FLOAT (0.0-0.99)
- **Default**: 0.90
- **Description**: Adaptive-P: decay rate for target adaptation. Lower = more reactive.
- **Sampling**

#### `--dynatemp-range`
- **Type**: FLOAT
- **Default**: 0.00
- **Description**: Dynamic temperature range. 0.0 = disabled.
- **Sampling**

#### `--dynatemp-exp`
- **Type**: FLOAT
- **Default**: 1.00
- **Description**: Dynamic temperature exponent. Controls how entropy maps to temperature.
- **Sampling**

#### `--mirostat`
- **Type**: INT (0, 1, 2)
- **Default**: 0 (disabled)
- **Description**: Mirostat sampling. 0 = disabled, 1 = Mirostat, 2 = Mirostat 2.0. Top-K, Nucleus, and Locally Typical samplers are ignored when used.
- **Sampling**

#### `--mirostat-lr`
- **Type**: FLOAT
- **Default**: 0.10
- **Description**: Mirostat learning rate (parameter eta).
- **Sampling**

#### `--mirostat-ent`
- **Type**: FLOAT
- **Default**: 5.00
- **Description**: Mirostat target entropy (parameter tau).
- **Sampling**

#### `-l` / `--logit-bias`
- **Type**: STRING (TOKEN_ID(+/-)BIAS)
- **Default**: "" (none)
- **Description**: Modify likelihood of a token. E.g., `--logit-bias 15043+1` to increase, `--logit-bias 15043-1` to decrease.
- **Sampling**

#### `--grammar`
- **Type**: STRING (GBNF grammar)
- **Default**: "" (none)
- **Description**: BNF-like grammar to constrain generations. See grammars/ directory for samples.
- **Sampling**

#### `--grammar-file`
- **Type**: FILE
- **Default**: "" (none)
- **Description**: File to read grammar from.
- **Sampling**

#### `-j` / `--json-schema`
- **Type**: STRING (JSON schema)
- **Default**: "" (none)
- **Description**: JSON schema to constrain generations (https://json-schema.org/). E.g., `{}` for any JSON object.
- **Sampling**

#### `-jf` / `--json-schema-file`
- **Type**: FILE
- **Default**: "" (none)
- **Description**: File containing a JSON schema to constrain generations.
- **Sampling**

#### `-bs` / `--backend-sampling`
- **Type**: flag
- **Default**: disabled
- **Description**: Enable backend sampling (experimental).
- **Env**: `LLAMA_ARG_BACKEND_SAMPLING`
- **Sampling**

### Speculative Decoding

#### `--spec-draft-hf` / `-hfd` / `-hfrd` / `--hf-repo-draft`
- **Type**: STRING (<user>/<model>[:quant])
- **Default**: "" (unused)
- **Description**: Hugging Face model repository for the draft model.
- **Env**: `LLAMA_ARG_SPEC_DRAFT_HF_REPO`

#### `--spec-draft-threads` / `-td` / `--threads-draft`
- **Type**: INT
- **Default**: same as --threads
- **Description**: Number of threads for draft model generation.
- **Speculative**

#### `--spec-draft-threads-batch` / `-tbd` / `--threads-batch-draft`
- **Type**: INT
- **Default**: same as --threads-draft
- **Description**: Number of threads for draft model batch processing.
- **Speculative**

#### `--spec-draft-cpu-mask` / `-Cd` / `--cpu-mask-draft`
- **Type**: STRING (hex)
- **Default**: same as --cpu-mask
- **Description**: Draft model CPU affinity mask.
- **Speculative**

#### `--spec-draft-cpu-range` / `-Crd` / `--cpu-range-draft`
- **Type**: STRING (lo-hi)
- **Default**: same as --cpu-range
- **Description**: Ranges of CPUs for draft model affinity.
- **Speculative**

#### `--spec-draft-cpu-strict` / `--cpu-strict-draft`
- **Type**: 0|1
- **Default**: same as --cpu-strict
- **Description**: Strict CPU placement for draft model.
- **Speculative**

#### `--spec-draft-prio` / `--prio-draft`
- **Type**: INT (0-3)
- **Default**: same as --prio
- **Description**: Draft model process/thread priority.
- **Speculative**

#### `--spec-draft-poll` / `--poll-draft`
- **Type**: 0|1
- **Default**: same as --poll
- **Description**: Polling level for draft model work.
- **Speculative**

#### `--spec-draft-cpu-mask-batch` / `-Cbd` / `--cpu-mask-batch-draft`
- **Type**: STRING (hex)
- **Default**: same as --cpu-mask
- **Description**: Draft model CPU affinity mask for batch processing.
- **Speculative**

#### `--spec-draft-cpu-range-batch` / `-Crbd` / `--cpu-range-batch-draft`
- **Type**: STRING (lo-hi)
- **Default**: same as --cpu-range
- **Description**: Ranges of CPUs for draft model batch affinity.
- **Speculative**

#### `--spec-draft-cpu-strict-batch` / `--cpu-strict-batch-draft`
- **Type**: 0|1
- **Default**: same as --cpu-strict-draft
- **Description**: Strict CPU placement for draft model batch processing.
- **Speculative**

#### `--spec-draft-prio-batch` / `--prio-batch-draft`
- **Type**: INT (0-3)
- **Default**: same as --prio-batch
- **Description**: Draft model batch processing priority.
- **Speculative**

#### `--spec-draft-poll-batch` / `--poll-batch-draft`
- **Type**: 0|1
- **Default**: same as --poll-draft
- **Description**: Polling level for draft model batch processing.
- **Speculative**

#### `--spec-draft-type-k` / `-ctkd` / `--cache-type-k-draft`
- **Type**: TYPE (f32|f16|bf16|q8_0|q4_0|q4_1|iq4_nl|q5_0|q5_1)
- **Default**: f16
- **Description**: KV cache data type for K for the draft model.
- **Env**: `LLAMA_ARG_SPEC_DRAFT_CACHE_TYPE_K`

#### `--spec-draft-type-v` / `-ctvd` / `--cache-type-v-draft`
- **Type**: TYPE (f32|f16|bf16|q8_0|q4_0|q4_1|iq4_nl|q5_0|q5_1)
- **Default**: f16
- **Description**: KV cache data type for V for the draft model.
- **Env**: `LLAMA_ARG_SPEC_DRAFT_CACHE_TYPE_V`

#### `--spec-draft-override-tensor` / `-otd` / `--override-tensor-draft`
- **Type**: STRING (tensor=buffer_type,...)
- **Default**: "" (none)
- **Description**: Override tensor buffer type for draft model.
- **Speculative**

#### `--spec-draft-cpu-moe` / `-cmoed` / `--cpu-moe-draft`
- **Type**: flag
- **Default**: false
- **Description**: Keep all MoE weights in the CPU for the draft model.
- **Env**: `LLAMA_ARG_SPEC_DRAFT_CPU_MOE`
- **Speculative**

#### `--spec-draft-n-cpu-moe` / `--spec-draft-ncmoe` / `-ncmoed` / `--n-cpu-moe-draft`
- **Type**: INT
- **Default**: 0
- **Description**: Keep MoE weights of first N layers in CPU for draft model.
- **Env**: `LLAMA_ARG_SPEC_DRAFT_N_CPU_MOE`
- **Speculative**

#### `--spec-draft-n-max`
- **Type**: INT
- **Default**: 3
- **Description**: Number of tokens to draft for speculative decoding.
- **Env**: `LLAMA_ARG_SPEC_DRAFT_N_MAX`

#### `--spec-draft-n-min`
- **Type**: INT
- **Default**: 0
- **Description**: Minimum number of draft tokens to use for speculative decoding.
- **Env**: `LLAMA_ARG_SPEC_DRAFT_N_MIN`

#### `--spec-draft-p-split` / `--draft-p-split`
- **Type**: FLOAT
- **Default**: 0.10
- **Description**: Speculative decoding split probability.
- **Env**: `LLAMA_ARG_SPEC_DRAFT_P_SPLIT`

#### `--spec-draft-p-min` / `--draft-p-min`
- **Type**: FLOAT
- **Default**: 0.00
- **Description**: Minimum speculative decoding probability (greedy).
- **Env**: `LLAMA_ARG_SPEC_DRAFT_P_MIN`

#### `--spec-draft-backend-sampling` / `--no-spec-draft-backend-sampling`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Offload draft sampling to the backend.
- **Env**: `LLAMA_ARG_SPEC_DRAFT_BACKEND_SAMPLING`

#### `--spec-draft-device` / `-devd` / `--device-draft`
- **Type**: STRING (comma-separated device names)
- **Default**: same as --device
- **Description**: Devices to use for offloading the draft model.
- **Speculative**

#### `--spec-draft-ngl` / `-ngld` / `--gpu-layers-draft` / `--n-gpu-layers-draft`
- **Type**: INT | "auto" | "all"
- **Default**: auto (-1)
- **Description**: Maximum number of draft model layers in VRAM.
- **Env**: `LLAMA_ARG_N_GPU_LAYERS_DRAFT`
- **Speculative**

#### `--spec-draft-model` / `-md` / `--model-draft`
- **Type**: FILE
- **Default**: "" (unused)
- **Description**: Draft model for speculative decoding.
- **Env**: `LLAMA_ARG_SPEC_DRAFT_MODEL`
- **Speculative**

#### `--spec-type`
- **Type**: STRING (comma-separated types)
- **Default**: none
- **Description**: Speculative decoding types. Available types: `none`, `draft-simple`, `draft-eagle3`, `draft-mtp`, `ngram-simple`, `ngram-map-k`, `ngram-map-k4v`, `ngram-mod`, `ngram-cache`.
- **Env**: `LLAMA_ARG_SPEC_TYPE`
- **Speculative**

#### `--spec-ngram-mod-n-min`
- **Type**: INT (0-1024)
- **Default**: 48
- **Description**: Minimum ngram tokens for ngram-mod speculative decoding.
- **Speculative**

#### `--spec-ngram-mod-n-max`
- **Type**: INT (0-1024)
- **Default**: 64
- **Description**: Maximum ngram tokens for ngram-mod speculative decoding.
- **Speculative**

#### `--spec-ngram-mod-n-match`
- **Type**: INT (1-1024)
- **Default**: 24
- **Description**: Ngram-mod lookup length.
- **Speculative**

#### `--spec-ngram-simple-size-n`
- **Type**: INT (1-1024)
- **Default**: 12
- **Description**: Ngram size N for ngram-simple (lookup n-gram length).
- **Speculative**

#### `--spec-ngram-simple-size-m`
- **Type**: INT (1-1024)
- **Default**: 48
- **Description**: Ngram size M for ngram-simple (draft m-gram length).
- **Speculative**

#### `--spec-ngram-simple-min-hits`
- **Type**: INT
- **Default**: 1
- **Description**: Minimum hits for ngram-simple speculative decoding.
- **Speculative**

#### `--spec-ngram-map-k-size-n`
- **Type**: INT (1-1024)
- **Default**: 12
- **Description**: Ngram size N for ngram-map-k (lookup n-gram length).
- **Speculative**

#### `--spec-ngram-map-k-size-m`
- **Type**: INT (1-1024)
- **Default**: 48
- **Description**: Ngram size M for ngram-map-k (draft m-gram length).
- **Speculative**

#### `--spec-ngram-map-k-min-hits`
- **Type**: INT
- **Default**: 1
- **Description**: Minimum hits for ngram-map-k speculative decoding.
- **Speculative**

#### `--spec-ngram-map-k4v-size-n`
- **Type**: INT (1-1024)
- **Default**: 12
- **Description**: Ngram size N for ngram-map-k4v (lookup n-gram length).
- **Speculative**

#### `--spec-ngram-map-k4v-size-m`
- **Type**: INT (1-1024)
- **Default**: 48
- **Description**: Ngram size M for ngram-map-k4v (draft m-gram length).
- **Speculative**

#### `--spec-ngram-map-k4v-min-hits`
- **Type**: INT
- **Default**: 1
- **Description**: Minimum hits for ngram-map-k4v speculative decoding.
- **Speculative**

#### `-lcs` / `--lookup-cache-static`
- **Type**: FILE
- **Default**: "" (none)
- **Description**: Path to static ngram cache file (not updated by generation).
- **Examples**: LOOKUP, SERVER

#### `-lcd` / `--lookup-cache-dynamic`
- **Type**: FILE
- **Default**: "" (none)
- **Description**: Path to dynamic ngram cache file (updated by generation).
- **Examples**: LOOKUP, SERVER

### LoRA/Control Vectors

#### `--lora`
- **Type**: FILE (comma-separated)
- **Default**: "" (none)
- **Description**: Path to LoRA adapter(s). Comma-separated for multiple adapters.

#### `--lora-scaled`
- **Type**: STRING (FNAME:SCALE,...)
- **Default**: "" (none)
- **Description**: Path to LoRA adapter with custom scaling. Format: `FNAME:SCALE,...`.

#### `--control-vector`
- **Type**: FILE (comma-separated)
- **Default**: "" (none)
- **Description**: Add a control vector. Comma-separated for multiple.

#### `--control-vector-scaled`
- **Type**: STRING (FNAME:SCALE,...)
- **Default**: "" (none)
- **Description**: Add a control vector with custom scaling. Format: `FNAME:SCALE,...`.

#### `--control-vector-layer-range`
- **Type**: INT START, INT END
- **Default**: -1 (all layers)
- **Description**: Layer range to apply control vector(s) to, start and end inclusive.

#### `--lora-init-without-apply`
- **Type**: flag
- **Default**: false
- **Description**: Load LoRA adapters without applying them (apply later via POST /lora-adapters).
- **Examples**: SERVER

### Model Sources

#### `-mu` / `--model-url`
- **Type**: URL
- **Default**: "" (unused)
- **Description**: Model download URL.
- **Env**: `LLAMA_ARG_MODEL_URL`

#### `-dr` / `--docker-repo`
- **Type**: STRING [<repo>/]<model>[:quant]
- **Default**: "" (unused)
- **Description**: Docker Hub model repository. Quant is optional (default: :latest).
- **Env**: `LLAMA_ARG_DOCKER_REPO`

#### `-hf` / `-hfr` / `--hf-repo`
- **Type**: STRING <user>/<model>[:quant]
- **Default**: "" (unused)
- **Description**: Hugging Face model repository. Quant is optional (default: Q4_K_M). mmproj auto-downloaded.
- **Env**: `LLAMA_ARG_HF_REPO`

#### `-hff` / `--hf-file`
- **Type**: FILE
- **Default**: "" (unused)
- **Description**: Hugging Face model file. Overrides quant in --hf-repo.
- **Env**: `LLAMA_ARG_HF_FILE`

#### `-hft` / `--hf-token`
- **Type**: STRING
- **Default**: value from HF_TOKEN env
- **Description**: Hugging Face access token (Bearer token).
- **Env**: `HF_TOKEN`

#### `-hfv` / `-hfrv` / `--hf-repo-v`
- **Type**: STRING <user>/<model>[:quant]
- **Default**: "" (unused)
- **Description**: Hugging Face model repository for the vocoder model.
- **Env**: `LLAMA_ARG_HF_REPO_V`

#### `-hffv` / `--hf-file-v`
- **Type**: FILE
- **Default**: "" (unused)
- **Description**: Hugging Face model file for the vocoder model.
- **Env**: `LLAMA_ARG_HF_FILE_V`

#### `--offline`
- **Type**: flag
- **Default**: false
- **Description**: Offline mode: forces use of cache, prevents network access.
- **Env**: `LLAMA_ARG_OFFLINE`

#### `--skip-download`
- **Type**: flag
- **Default**: false
- **Description**: Skip model file downloading.

### Misc

#### `--log-disable`
- **Type**: flag
- **Default**: N/A
- **Description**: Pause logging.

#### `--log-file`
- **Type**: FILE
- **Default**: "" (stdout/stderr)
- **Description**: Log to file.
- **Env**: `LLAMA_ARG_LOG_FILE`

#### `--log-colors`
- **Type**: on|off|auto
- **Default**: auto
- **Description**: Set colored logging. 'auto' enables colors when output is to a terminal.
- **Env**: `LLAMA_ARG_LOG_COLORS`

#### `-v` / `--verbose` / `--log-verbose`
- **Type**: flag
- **Default**: N/A
- **Description**: Set verbosity level to infinity (log all messages).

#### `-lv` / `--verbosity` / `--log-verbosity`
- **Type**: INT
- **Default**: 3 (info)
- **Description**: Set the verbosity threshold. 0=generic, 1=error, 2=warning, 3=info, 4=trace, 5=debug.
- **Env**: `LLAMA_ARG_LOG_VERBOSITY`

#### `--log-prefix` / `--no-log-prefix`
- **Type**: on|off
- **Default**: enabled
- **Description**: Enable prefix in log messages.
- **Env**: `LLAMA_ARG_LOG_PREFIX`

#### `--log-timestamps` / `--no-log-timestamps`
- **Type**: on|off
- **Default**: enabled
- **Description**: Enable timestamps in log messages.
- **Env**: `LLAMA_ARG_LOG_TIMESTAMPS`

#### `--tags`
- **Type**: STRING (comma-separated)
- **Default**: "" (none)
- **Description**: Set model tags (informational, not used for routing).
- **Env**: `LLAMA_ARG_TAGS`
- **Examples**: SERVER

#### `-a` / `--alias`
- **Type**: STRING (comma-separated)
- **Default**: "" (none)
- **Description**: Set model name aliases (to be used by API).
- **Env**: `LLAMA_ARG_ALIAS`
- **Examples**: SERVER

#### `-o` / `--output` / `--output-file`
- **Type**: FILE
- **Default**: "" (none)
- **Description**: Output filename.
- **Examples**: IMATRIX, CVECTOR_GENERATOR, EXPORT_LORA, TTS, FINETUNE, RESULTS, EXPORT_GRAPH_OPS

#### `-ofreq` / `--output-frequency`
- **Type**: INT
- **Default**: 10
- **Description**: Output the imatrix every N iterations.
- **Examples**: IMATRIX

#### `--output-format`
- **Type**: gguf|dat
- **Default**: gguf
- **Description**: Output format for imatrix file.
- **Examples**: IMATRIX

#### `--save-frequency`
- **Type**: INT
- **Default**: 0
- **Description**: Save an imatrix copy every N iterations.
- **Examples**: IMATRIX

#### `--process-output`
- **Type**: flag
- **Default**: false
- **Description**: Collect data for the output tensor.
- **Examples**: IMATRIX

#### `--ppl` / `--no-ppl`
- **Type**: on|off
- **Default**: true
- **Description**: Whether to compute perplexity.
- **Examples**: IMATRIX

#### `--chunk` / `--from-chunk`
- **Type**: INT
- **Default**: 0
- **Description**: Start processing from chunk N.
- **Examples**: IMATRIX

#### `--show-statistics`
- **Type**: flag
- **Default**: false
- **Description**: Show imatrix statistics and then exit.
- **Examples**: IMATRIX

#### `--parse-special`
- **Type**: flag
- **Default**: false
- **Description**: Parse special tokens (chat, tool, etc).
- **Examples**: IMATRIX

#### `--ppl-stride`
- **Type**: INT
- **Default**: 0 (use pre-existing approach)
- **Description**: Stride for perplexity calculations.
- **Examples**: PERPLEXITY

#### `--ppl-output-type`
- **Type**: 0|1
- **Default**: 0
- **Description**: Output type for perplexity. 0=normal, 1=num_tokens,ppl per line.
- **Examples**: PERPLEXITY

#### `--hellaswag`
- **Type**: flag
- **Default**: false
- **Description**: Compute HellaSwag score over random tasks from datafile.
- **Examples**: PERPLEXITY

#### `--hellaswag-tasks`
- **Type**: INT
- **Default**: 400
- **Description**: Number of HellaSwag tasks to compute.
- **Examples**: PERPLEXITY

#### `--winogrande`
- **Type**: flag
- **Default**: false
- **Description**: Compute Winogrande score over random tasks from datafile.
- **Examples**: PERPLEXITY

#### `--winogrande-tasks`
- **Type**: INT
- **Default**: 0 (all tasks)
- **Description**: Number of Winogrande tasks to compute.
- **Examples**: PERPLEXITY

#### `--multiple-choice`
- **Type**: flag
- **Default**: false
- **Description**: Compute multiple choice score (TruthfulQA) from datafile.
- **Examples**: PERPLEXITY

#### `--multiple-choice-tasks`
- **Type**: INT
- **Default**: 0 (all tasks)
- **Description**: Number of multiple choice tasks to compute.
- **Examples**: PERPLEXITY

#### `--kl-divergence`
- **Type**: flag
- **Default**: false
- **Description**: Compute KL-divergence to logits provided via --save-all-logits.
- **Examples**: PERPLEXITY

#### `--save-all-logits` / `--kl-divergence-base`
- **Type**: FILE
- **Default**: "" (none)
- **Description**: File for saving all logits.
- **Examples**: PERPLEXITY

#### `--save-logits`
- **Type**: flag
- **Default**: false
- **Description**: Save final logits to files for verification.
- **Examples**: DEBUG

#### `--logits-output-dir`
- **Type**: PATH
- **Default**: "data"
- **Description**: Directory for saving logits output files.
- **Examples**: DEBUG

#### `--tensor-filter`
- **Type**: STRING (regex)
- **Default**: "" (none)
- **Description**: Filter tensor names for debug output (regex pattern, can be specified multiple times).
- **Examples**: DEBUG

#### `--check`
- **Type**: flag
- **Default**: false
- **Description**: Check rather than generate results (for llama-results).
- **Examples**: RESULTS

#### `--output-format` (bench)
- **Type**: md|jsonl
- **Default**: md
- **Description**: Output format for batched-bench results.
- **Examples**: BENCH

#### `-pps`
- **Type**: flag
- **Default**: false
- **Description**: Is the prompt shared across parallel sequences.
- **Examples**: BENCH, PARALLEL

#### `-tgs`
- **Type**: flag
- **Default**: false
- **Description**: Is the text generation separated across different sequences.
- **Examples**: BENCH, PARALLEL

#### `-npp`
- **Type**: STRING (comma-separated ints)
- **Default**: "" (none)
- **Description**: Number of prompt tokens (per sequence).
- **Examples**: BENCH

#### `-ntg`
- **Type**: STRING (comma-separated ints)
- **Default**: "" (none)
- **Description**: Number of text generation tokens (per sequence).
- **Examples**: BENCH

#### `-npl`
- **Type**: STRING (comma-separated ints)
- **Default**: "" (none)
- **Description**: Number of parallel prompts.
- **Examples**: BENCH

#### `--ppl` / `--no-ppl` (imatrix)
- **Type**: on|off
- **Default**: true
- **Description**: Whether to compute perplexity during imatrix processing.
- **Examples**: IMATRIX

#### `--chunks`
- **Type**: INT
- **Default**: -1
- **Description**: Maximum number of chunks to process.
- **Examples**: IMATRIX, PERPLEXITY, RETRIEVAL

#### `--embd-normalize`
- **Type**: INT
- **Default**: 2 (euclidean)
- **Description**: Normalization for embeddings. -1=none, 0=max absolute int16, 1=taxicab, 2=euclidean, >2=p-norm.
- **Examples**: EMBEDDING, SERVER, DEBUG

#### `--embd-output-format`
- **Type**: STRING
- **Default**: "" (default)
- **Description**: Embedding output format. ""=default, "array"=[[[],...]], "json"=OpenAI style, "json+"=json + cosine similarity, "raw"=plain whitespace-delimited.
- **Examples**: EMBEDDING

#### `--embd-separator`
- **Type**: STRING
- **Default**: "\n"
- **Description**: Separator of embeddings.
- **Examples**: EMBEDDING

#### `--cls-separator`
- **Type**: STRING
- **Default**: "\t"
- **Description**: Separator of classification sequences.
- **Examples**: EMBEDDING

#### `--pooling`
- **Type**: none|mean|cls|last|rank
- **Default**: model default
- **Description**: Pooling type for embeddings.
- **Env**: `LLAMA_ARG_POOLING`
- **Examples**: EMBEDDING, RETRIEVAL, SERVER, DEBUG

#### `--attention`
- **Type**: causal|non-causal
- **Default**: model default
- **Description**: Attention type for embeddings.
- **Examples**: EMBEDDING

#### `--rpc`
- **Type**: STRING (host:port,...)
- **Default**: "" (none)
- **Description**: Comma-separated list of RPC servers. Requires RPC backend.
- **Env**: `LLAMA_ARG_RPC`

#### `--repack` / `--no-repack`
- **Type**: on|off
- **Default**: enabled
- **Description**: Whether to enable weight repacking.
- **Env**: `LLAMA_ARG_REPACK`

### Reasoning/Thinking

#### `--reasoning-format`
- **Type**: none|deepseek|deepseek-legacy
- **Default**: auto (deepseek)
- **Description**: Controls thought tag handling:
  - **none**: Leaves thoughts unparsed in message.content
  - **deepseek**: Puts thoughts in message.reasoning_content
  - **deepseek-legacy**: Keeps <think> tags in message.content while also populating reasoning_content
- **Env**: `LLAMA_ARG_THINK`

#### `-rea` / `--reasoning`
- **Type**: on|off|auto
- **Default**: auto (detect from template)
- **Description**: Use reasoning/thinking in the chat.
- **Env**: `LLAMA_ARG_REASONING`

#### `--reasoning-budget`
- **Type**: INT
- **Default**: -1 (unrestricted)
- **Description**: Token budget for thinking. -1=unrestricted, 0=immediate end, N>0=token budget.
- **Env**: `LLAMA_ARG_THINK_BUDGET`

#### `--reasoning-budget-message`
- **Type**: STRING
- **Default**: "" (none)
- **Description**: Message injected before end-of-thinking tag when reasoning budget is exhausted.
- **Env**: `LLAMA_ARG_THINK_BUDGET_MESSAGE`

### Chat

#### `--chat-template`
- **Type**: STRING (Jinja template)
- **Default**: template from model's metadata
- **Description**: Set custom Jinja chat template. If suffix/prefix are specified, template will be disabled.
- **Env**: `LLAMA_ARG_CHAT_TEMPLATE`

#### `--chat-template-file`
- **Type**: FILE (Jinja template file)
- **Default**: template from model's metadata
- **Description**: Set custom Jinja chat template file.
- **Env**: `LLAMA_ARG_CHAT_TEMPLATE_FILE`

#### `--jinja` / `--no-jinja`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Whether to use Jinja template engine for chat.
- **Env**: `LLAMA_ARG_JINJA`

#### `--skip-chat-parsing` / `--no-skip-chat-parsing`
- **Type**: on|off
- **Default**: disabled
- **Description**: Force pure content parser, even if Jinja template is specified. Model outputs everything in content section.
- **Env**: `LLAMA_ARG_SKIP_CHAT_PARSING`

#### `--prefill-assistant` / `--no-prefill-assistant`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Whether to prefill the assistant's response if the last message is an assistant message.
- **Env**: `LLAMA_ARG_PREFILL_ASSISTANT`
- **Examples**: SERVER

#### `--chat-template-kwargs`
- **Type**: STRING (JSON object)
- **Default**: {} (empty)
- **Description**: Additional params for the Jinja template parser. Must be valid JSON, e.g., `{"key1":"value1"}`.
- **Env**: `LLAMA_ARG_CHAT_TEMPLATE_KWARGS`

### Embedding/Reranking

#### `--embedding` / `--embeddings`
- **Type**: flag
- **Default**: disabled
- **Description**: Restrict to only support embedding use case. Use only with dedicated embedding models.
- **Env**: `LLAMA_ARG_EMBEDDINGS`
- **Examples**: SERVER, DEBUG

#### `--rerank` / `--reranking`
- **Type**: flag
- **Default**: disabled
- **Description**: Enable reranking endpoint on server. Sets pooling_type to RANK.
- **Env**: `LLAMA_ARG_RERANKING`
- **Examples**: SERVER

### TTS

#### `-mv` / `--model-vocoder`
- **Type**: FILE
- **Default**: "" (unused)
- **Description**: Vocoder model for audio generation.
- **Examples**: TTS, SERVER

#### `--tts-use-guide-tokens`
- **Type**: flag
- **Default**: false
- **Description**: Use guide tokens to improve TTS word recall.
- **Examples**: TTS, SERVER

#### `--tts-speaker-file`
- **Type**: FILE
- **Default**: "" (unused)
- **Description**: Speaker file path for audio generation.
- **Examples**: TTS

### Diffusion

#### `--diffusion-steps`
- **Type**: INT
- **Default**: 128
- **Description**: Number of diffusion steps.
- **Examples**: DIFFUSION

#### `--diffusion-visual`
- **Type**: flag
- **Default**: false
- **Description**: Enable visual diffusion mode (show progressive generation).
- **Examples**: DIFFUSION

#### `--diffusion-eps`
- **Type**: FLOAT
- **Default**: 0.0
- **Description**: Epsilon for timesteps.
- **Examples**: DIFFUSION

#### `--diffusion-algorithm`
- **Type**: INT (0-4)
- **Default**: 4 (confidence-based)
- **Description**: Diffusion algorithm: 0=origin, 1=entropy-based, 2=margin-based, 3=random, 4=confidence-based.
- **Examples**: DIFFUSION

#### `--diffusion-alg-temp`
- **Type**: FLOAT
- **Default**: 0.0
- **Description**: Dream algorithm temperature.
- **Examples**: DIFFUSION

#### `--diffusion-block-length`
- **Type**: INT
- **Default**: 0
- **Description**: LLaDA block length for generation.
- **Examples**: DIFFUSION

#### `--diffusion-cfg-scale`
- **Type**: FLOAT
- **Default**: 0.0
- **Description**: LLaDA classifier-free guidance scale.
- **Examples**: DIFFUSION

#### `--diffusion-add-gumbel-noise`
- **Type**: FLOAT
- **Default**: false
- **Description**: Add Gumbel noise to the logits if temp > 0.0.
- **Examples**: DIFFUSION

### Finetune

#### `-lr` / `--learning-rate`
- **Type**: FLOAT
- **Default**: 1e-5
- **Description**: AdamW or SGD optimizer alpha. SGD alpha recommended ~10x (no momentum).
- **Examples**: FINETUNE

#### `-lr-min` / `--learning-rate-min`
- **Type**: FLOAT
- **Default**: -1 (disabled)
- **Description**: Final learning rate after decay (if -decay-epochs is set).
- **Examples**: FINETUNE

#### `-decay-epochs` / `--learning-rate-decay-epochs`
- **Type**: FLOAT
- **Default**: -1 (disabled)
- **Description**: Decay learning rate to -lr-min after this many epochs (exponential decay).
- **Examples**: FINETUNE

#### `-wd` / `--weight-decay`
- **Type**: FLOAT
- **Default**: 0.0
- **Description**: AdamW or SGD optimizer weight decay (0 is off, recommend very small e.g. 1e-9).
- **Examples**: FINETUNE

#### `-val-split` / `--val-split`
- **Type**: FLOAT
- **Default**: 0.05
- **Description**: Fraction of data to use as validation set.
- **Examples**: FINETUNE

#### `-epochs` / `--epochs`
- **Type**: INT
- **Default**: 2
- **Description**: Optimizer max number of epochs.
- **Examples**: FINETUNE

#### `-opt` / `--optimizer`
- **Type**: adamw|sgd
- **Default**: adamw
- **Description**: Optimizer type.
- **Examples**: FINETUNE

### Retrieval/Passkey

#### `--context-file`
- **Type**: FILE (comma-separated)
- **Default**: "" (none)
- **Description**: File(s) to load context from.
- **Examples**: RETRIEVAL

#### `--chunk-size`
- **Type**: INT
- **Default**: 64
- **Description**: Minimum length of embedded text chunks.
- **Examples**: RETRIEVAL

#### `--chunk-separator`
- **Type**: STRING
- **Default**: "\n"
- **Description**: Separator between chunks.
- **Examples**: RETRIEVAL

#### `--junk`
- **Type**: INT
- **Default**: 250
- **Description**: Number of times to repeat the junk text (passkey test).
- **Examples**: PASSKEY, PARALLEL

#### `--pos`
- **Type**: INT
- **Default**: -1
- **Description**: Position of the passkey in the junk text.
- **Examples**: PASSKEY

### Batch/Bench

#### `-np` / `--parallel`
- **Type**: INT
- **Default**: 1 (CLI), -1=auto (SERVER)
- **Description**: Number of parallel sequences to decode (CLI) or server slots (SERVER).
- **Env**: `LLAMA_ARG_N_PARALLEL`

#### `-ns` / `--sequences`
- **Type**: INT
- **Default**: 1
- **Description**: Number of sequences to decode.
- **Examples**: PARALLEL

#### `-cb` / `--cont-batching` / `--no-cont-batching`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Enable continuous batching (dynamic batching).
- **Env**: `LLAMA_ARG_CONT_BATCHING`
- **Examples**: SERVER

#### `--simple-io`
- **Type**: flag
- **Default**: false
- **Description**: Use basic IO for better compatibility with subprocesses and limited consoles.
- **Examples**: COMPLETION, CLI

#### `--perf` / `--no-perf`
- **Type**: on|off
- **Default**: false (enabled)
- **Description**: Whether to enable internal libllama performance timings.
- **Env**: `LLAMA_ARG_PERF`

#### `--show-timings` / `--no-show-timings`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Whether to show timing information after each response.
- **Env**: `LLAMA_ARG_SHOW_TIMINGS`
- **Examples**: CLI

#### `--log-prompts-dir`
- **Type**: PATH
- **Default**: "" (disabled)
- **Description**: Log prompts to directory (debugging only).
- **Examples**: SERVER, CLI

---

## 3. Server-Specific Parameters

### Network

#### `--host`
- **Type**: STRING
- **Default**: "127.0.0.1"
- **Description**: IP address to listen on, or bind to a UNIX socket if the address ends with .sock.
- **Env**: `LLAMA_ARG_HOST`

#### `--port`
- **Type**: INT
- **Default**: 8080
- **Description**: Port to listen on.
- **Env**: `LLAMA_ARG_PORT`

#### `--reuse-port`
- **Type**: flag
- **Default**: false
- **Description**: Allow multiple sockets to bind to the same port.
- **Env**: `LLAMA_ARG_REUSE_PORT`

#### `--path`
- **Type**: PATH
- **Default**: "" (none)
- **Description**: Path to serve static files from.
- **Env**: `LLAMA_ARG_STATIC_PATH`

#### `--api-prefix`
- **Type**: STRING
- **Default**: "" (none)
- **Description**: Prefix path the server serves from (without trailing slash).
- **Env**: `LLAMA_ARG_API_PREFIX`

#### `--api-key`
- **Type**: STRING (comma-separated)
- **Default**: "" (none)
- **Description**: API key(s) for authentication. Multiple keys can be comma-separated.
- **Env**: `LLAMA_API_KEY`

#### `--api-key-file`
- **Type**: FILE
- **Default**: "" (none)
- **Description**: Path to file containing API keys (one per line).
- **Env**: `LLAMA_ARG_API_KEY_FILE`

#### `--ssl-key-file`
- **Type**: FILE
- **Default**: "" (none)
- **Description**: Path to PEM-encoded SSL private key.
- **Env**: `LLAMA_ARG_SSL_KEY_FILE`

#### `--ssl-cert-file`
- **Type**: FILE
- **Default**: "" (none)
- **Description**: Path to PEM-encoded SSL certificate.
- **Env**: `LLAMA_ARG_SSL_CERT_FILE`

#### `-to` / `--timeout`
- **Type**: INT (seconds)
- **Default**: 3600
- **Description**: Server read/write timeout in seconds.
- **Env**: `LLAMA_ARG_TIMEOUT`

#### `--sse-ping-interval`
- **Type**: INT (seconds)
- **Default**: 30
- **Description**: SSE ping interval. -1 = disabled.
- **Env**: `LLAMA_ARG_SSE_PING_INTERVAL`

#### `--threads-http`
- **Type**: INT
- **Default**: -1 (auto)
- **Description**: Number of threads used to process HTTP requests.
- **Env**: `LLAMA_ARG_THREADS_HTTP`

### Caching

#### `--cache-prompt` / `--no-cache-prompt`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Whether to enable prompt caching.
- **Env**: `LLAMA_ARG_CACHE_PROMPT`

#### `--cache-reuse`
- **Type**: INT
- **Default**: 0 (disabled)
- **Description**: Minimum chunk size to attempt reusing from cache via KV shifting. Requires prompt caching.
- **Env**: `LLAMA_ARG_CACHE_REUSE`

#### `--cache-idle-slots` / `--no-cache-idle-slots`
- **Type**: on|off
- **Default**: true
- **Description**: Save idle slots to the prompt cache on new task. Requires cache-ram.
- **Env**: `LLAMA_ARG_CACHE_IDLE_SLOTS`

### Endpoints

#### `--metrics`
- **Type**: flag
- **Default**: false
- **Description**: Enable Prometheus-compatible metrics endpoint.
- **Env**: `LLAMA_ARG_ENDPOINT_METRICS`

#### `--props`
- **Type**: flag
- **Default**: false
- **Description**: Enable changing global properties via POST /props.
- **Env**: `LLAMA_ARG_ENDPOINT_PROPS`

#### `--slots` / `--no-slots`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Expose slots monitoring endpoint.
- **Env**: `LLAMA_ARG_ENDPOINT_SLOTS`

#### `--slot-save-path`
- **Type**: PATH
- **Default**: "" (disabled)
- **Description**: Path to save slot KV cache. Must be a directory.

#### `--media-path`
- **Type**: PATH
- **Default**: "" (disabled)
- **Description**: Directory for loading local media files. Files accessible via file:// URLs with relative paths.

### Router

#### `--models-dir`
- **Type**: PATH
- **Default**: "" (disabled)
- **Description**: Directory containing models for the router server.
- **Env**: `LLAMA_ARG_MODELS_DIR`

#### `--models-preset`
- **Type**: PATH
- **Default**: "" (disabled)
- **Description**: Path to INI file containing model presets for the router server.
- **Env**: `LLAMA_ARG_MODELS_PRESET`

#### `--models-max`
- **Type**: INT
- **Default**: 4
- **Description**: Maximum number of models to load simultaneously. 0 = unlimited.
- **Env**: `LLAMA_ARG_MODELS_MAX`

#### `--models-autoload` / `--no-models-autoload`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Automatically load models when requested via the router server.
- **Env**: `LLAMA_ARG_MODELS_AUTOLOAD`

### Chat

#### `--jinja` / `--no-jinja`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Whether to use Jinja template engine for chat.
- **Env**: `LLAMA_ARG_JINJA`

#### `--reasoning-format`
- **Type**: none|deepseek|deepseek-legacy
- **Default**: auto (deepseek)
- **Description**: Controls thought tag handling in responses.
- **Env**: `LLAMA_ARG_THINK`

#### `-rea` / `--reasoning`
- **Type**: on|off|auto
- **Default**: auto
- **Description**: Use reasoning/thinking in the chat.
- **Env**: `LLAMA_ARG_REASONING`

#### `--reasoning-budget`
- **Type**: INT
- **Default**: -1 (unrestricted)
- **Description**: Token budget for thinking.
- **Env**: `LLAMA_ARG_THINK_BUDGET`

#### `--reasoning-budget-message`
- **Type**: STRING
- **Default**: "" (none)
- **Description**: Message injected before end-of-thinking tag when budget exhausted.
- **Env**: `LLAMA_ARG_THINK_BUDGET_MESSAGE`

#### `--chat-template`
- **Type**: STRING (Jinja template)
- **Default**: model metadata
- **Description**: Set custom Jinja chat template.
- **Env**: `LLAMA_ARG_CHAT_TEMPLATE`

#### `--chat-template-file`
- **Type**: FILE
- **Default**: model metadata
- **Description**: Set custom Jinja chat template file.
- **Env**: `LLAMA_ARG_CHAT_TEMPLATE_FILE`

#### `--skip-chat-parsing` / `--no-skip-chat-parsing`
- **Type**: on|off
- **Default**: disabled
- **Description**: Force pure content parser.
- **Env**: `LLAMA_ARG_SKIP_CHAT_PARSING`

#### `--prefill-assistant` / `--no-prefill-assistant`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Prefill assistant's response if last message is assistant.
- **Env**: `LLAMA_ARG_PREFILL_ASSISTANT`

#### `--chat-template-kwargs`
- **Type**: STRING (JSON)
- **Default**: {}
- **Description**: Additional params for the Jinja template parser.
- **Env**: `LLAMA_ARG_CHAT_TEMPLATE_KWARGS`

### UI

#### `--ui` / `--no-ui`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Whether to enable the Web UI.
- **Env**: `LLAMA_ARG_UI`

#### `--ui-config`
- **Type**: STRING (JSON)
- **Default**: "" (none)
- **Description**: JSON that provides default UI settings (overrides UI defaults).
- **Env**: `LLAMA_ARG_UI_CONFIG`

#### `--ui-config-file`
- **Type**: PATH
- **Default**: "" (none)
- **Description**: JSON file that provides default UI settings (overrides UI defaults).
- **Env**: `LLAMA_ARG_UI_CONFIG_FILE`

#### `--ui-mcp-proxy` / `--no-ui-mcp-proxy`
- **Type**: on|off
- **Default**: false
- **Description**: Experimental: Enable MCP CORS proxy. Do not enable in untrusted environments.
- **Env**: `LLAMA_ARG_UI_MCP_PROXY`

#### `--webui-config` (deprecated)
- **Type**: STRING (JSON)
- **Default**: "" (none)
- **Description**: DEPRECATED: Use --ui-config. JSON that provides default WebUI settings.
- **Env**: `LLAMA_ARG_WEBUI_CONFIG`

#### `--webui-config-file` (deprecated)
- **Type**: PATH
- **Default**: "" (none)
- **Description**: DEPRECATED: Use --ui-config-file. JSON file for WebUI settings.
- **Env**: `LLAMA_ARG_WEBUI_CONFIG_FILE`

#### `--webui-mcp-proxy` (deprecated)
- **Type**: on|off
- **Default**: false
- **Description**: DEPRECATED: Use --ui-mcp-proxy/--no-ui-mcp-proxy. Experimental MCP CORS proxy.
- **Env**: `LLAMA_ARG_WEBUI_MCP_PROXY`

#### `--webui` / `--no-webui` (deprecated)
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: DEPRECATED: Use --ui/--no-ui. Whether to enable the Web UI.
- **Env**: `LLAMA_ARG_WEBUI`

#### `--tools`
- **Type**: STRING (comma-separated)
- **Default**: "" (no tools)
- **Description**: Enable built-in tools for AI agents. Use "all" to enable all. Available: read_file, file_glob_search, grep_search, exec_shell_command, write_file, edit_file, apply_diff, get_datetime.
- **Env**: `LLAMA_ARG_TOOLS`

### Other

#### `-np` / `--parallel`
- **Type**: INT
- **Default**: -1 (auto)
- **Description**: Number of server slots.
- **Env**: `LLAMA_ARG_N_PARALLEL`

#### `-cb` / `--cont-batching` / `--no-cont-batching`
- **Type**: on|off
- **Default**: true (enabled)
- **Description**: Enable continuous batching (dynamic batching).
- **Env**: `LLAMA_ARG_CONT_BATCHING`

#### `-sps` / `--slot-prompt-similarity`
- **Type**: FLOAT
- **Default**: 0.10
- **Description**: How much the prompt of a request must match a slot's prompt to reuse it. 0.0 = disabled.

#### `--lora-init-without-apply`
- **Type**: flag
- **Default**: false
- **Description**: Load LoRA adapters without applying them (apply via POST /lora-adapters).

#### `--sleep-idle-seconds`
- **Type**: INT
- **Default**: -1 (disabled)
- **Description**: Number of seconds of idleness after which the server will sleep. Must be > 0 or -1.

#### `--embedding` / `--embeddings`
- **Type**: flag
- **Default**: disabled
- **Description**: Restrict to embedding use case only.
- **Env**: `LLAMA_ARG_EMBEDDINGS`

#### `--rerank` / `--reranking`
- **Type**: flag
- **Default**: disabled
- **Description**: Enable reranking endpoint.
- **Env**: `LLAMA_ARG_RERANKING`

#### `--log-prompts-dir`
- **Type**: PATH
- **Default**: "" (disabled)
- **Description**: Log prompts to directory (debugging only).

---

## 4. Environment Variables

All CLI parameters can be overridden via environment variables with the `LLAMA_ARG_` prefix. Boolean flags can be negated with `LLAMA_ARG_NO_` prefix.

### General & CPU
| Environment Variable | Parameter |
|---------------------|-----------|
| `LLAMA_ARG_THREADS` | `--threads` |
| `LLAMA_ARG_CTX_SIZE` | `--ctx-size` |
| `LLAMA_ARG_N_PREDICT` | `--predict` |
| `LLAMA_ARG_BATCH` | `--batch-size` |
| `LLAMA_ARG_UBATCH` | `--ubatch-size` |
| `LLAMA_ARG_SWA_FULL` | `--swa-full` |
| `LLAMA_ARG_CTX_CHECKPOINTS` | `--ctx-checkpoints` |
| `LLAMA_ARG_CHECKPOINT_MIN_SPACING_NT` | `--checkpoint-min-step` |
| `LLAMA_ARG_CACHE_RAM` | `--cache-ram` |
| `LLAMA_ARG_KV_UNIFIED` | `--kv-unified` |
| `LLAMA_ARG_CACHE_IDLE_SLOTS` | `--cache-idle-slots` |
| `LLAMA_ARG_CONTEXT_SHIFT` | `--context-shift` |
| `LLAMA_ARG_FLASH_ATTN` | `--flash-attn` |
| `LLAMA_ARG_PERF` | `--perf` |
| `LLAMA_ARG_SHOW_TIMINGS` | `--show-timings` |
| `LLAMA_ARG_MMAP` | `--mmap` |
| `LLAMA_ARG_DIO` | `--direct-io` |
| `LLAMA_ARG_MLOCK` | `--mlock` |
| `LLAMA_ARG_NUMA` | `--numa` |
| `LLAMA_ARG_DEVICE` | `--device` |
| `LLAMA_ARG_OVERRIDE_TENSOR` | `--override-tensor` |
| `LLAMA_ARG_CPU_MOE` | `--cpu-moe` |
| `LLAMA_ARG_N_CPU_MOE` | `--n-cpu-moe` |
| `LLAMA_ARG_N_GPU_LAYERS` | `--gpu-layers` |
| `LLAMA_ARG_SPLIT_MODE` | `--split-mode` |
| `LLAMA_ARG_TENSOR_SPLIT` | `--tensor-split` |
| `LLAMA_ARG_MAIN_GPU` | `--main-gpu` |
| `LLAMA_ARG_FIT` | `--fit` |
| `LLAMA_ARG_FIT_ESTIMATE` | `--fit-print` |
| `LLAMA_ARG_FIT_TARGET` | `--fit-target` |
| `LLAMA_ARG_FIT_CTX` | `--fit-ctx` |
| `LLAMA_ARG_KV_OFFLOAD` | `--kv-offload` |
| `LLAMA_ARG_CACHE_TYPE_K` | `--cache-type-k` |
| `LLAMA_ARG_CACHE_TYPE_V` | `--cache-type-v` |
| `LLAMA_ARG_ROPE_SCALING_TYPE` | `--rope-scaling` |
| `LLAMA_ARG_ROPE_SCALE` | `--rope-scale` |
| `LLAMA_ARG_ROPE_FREQ_BASE` | `--rope-freq-base` |
| `LLAMA_ARG_ROPE_FREQ_SCALE` | `--rope-freq-scale` |
| `LLAMA_ARG_YARN_ORIG_CTX` | `--yarn-orig-ctx` |
| `LLAMA_ARG_YARN_EXT_FACTOR` | `--yarn-ext-factor` |
| `LLAMA_ARG_YARN_ATTN_FACTOR` | `--yarn-attn-factor` |
| `LLAMA_ARG_YARN_BETA_SLOW` | `--yarn-beta-slow` |
| `LLAMA_ARG_YARN_BETA_FAST` | `--yarn-beta-fast` |
| `LLAMA_ARG_GRP_ATTN_N` | `--grp-attn-n` |
| `LLAMA_ARG_GRP_ATTN_W` | `--grp-attn-w` |
| `LLAMA_ARG_REPACK` | `--repack` |
| `LLAMA_ARG_NO_HOST` | `--no-host` |

### Sampling
| Environment Variable | Parameter |
|---------------------|-----------|
| `LLAMA_ARG_TOP_K` | `--top-k` |
| `LLAMA_ARG_BACKEND_SAMPLING` | `--backend-sampling` |

### Model Sources
| Environment Variable | Parameter |
|---------------------|-----------|
| `LLAMA_ARG_MODEL` | `--model` |
| `LLAMA_ARG_MODEL_URL` | `--model-url` |
| `LLAMA_ARG_DOCKER_REPO` | `--docker-repo` |
| `LLAMA_ARG_HF_REPO` | `--hf-repo` |
| `LLAMA_ARG_HF_FILE` | `--hf-file` |
| `LLAMA_ARG_HF_REPO_V` | `--hf-repo-v` |
| `LLAMA_ARG_HF_FILE_V` | `--hf-file-v` |
| `HF_TOKEN` | `--hf-token` |
| `LLAMA_ARG_OFFLINE` | `--offline` |

### Speculative
| Environment Variable | Parameter |
|---------------------|-----------|
| `LLAMA_ARG_SPEC_TYPE` | `--spec-type` |
| `LLAMA_ARG_SPEC_DRAFT_HF_REPO` | `--spec-draft-hf` |
| `LLAMA_ARG_SPEC_DRAFT_MODEL` | `--spec-draft-model` |
| `LLAMA_ARG_SPEC_DRAFT_N_MAX` | `--spec-draft-n-max` |
| `LLAMA_ARG_SPEC_DRAFT_N_MIN` | `--spec-draft-n-min` |
| `LLAMA_ARG_SPEC_DRAFT_P_SPLIT` | `--spec-draft-p-split` |
| `LLAMA_ARG_SPEC_DRAFT_P_MIN` | `--spec-draft-p-min` |
| `LLAMA_ARG_SPEC_DRAFT_BACKEND_SAMPLING` | `--spec-draft-backend-sampling` |
| `LLAMA_ARG_N_GPU_LAYERS_DRAFT` | `--spec-draft-ngl` |
| `LLAMA_ARG_SPEC_DRAFT_CACHE_TYPE_K` | `--spec-draft-type-k` |
| `LLAMA_ARG_SPEC_DRAFT_CACHE_TYPE_V` | `--spec-draft-type-v` |
| `LLAMA_ARG_SPEC_DRAFT_CPU_MOE` | `--spec-draft-cpu-moe` |
| `LLAMA_ARG_SPEC_DRAFT_N_CPU_MOE` | `--spec-draft-n-cpu-moe` |

### Server
| Environment Variable | Parameter |
|---------------------|-----------|
| `LLAMA_ARG_HOST` | `--host` |
| `LLAMA_ARG_PORT` | `--port` |
| `LLAMA_ARG_REUSE_PORT` | `--reuse-port` |
| `LLAMA_ARG_STATIC_PATH` | `--path` |
| `LLAMA_ARG_API_PREFIX` | `--api-prefix` |
| `LLAMA_API_KEY` | `--api-key` |
| `LLAMA_ARG_API_KEY_FILE` | `--api-key-file` |
| `LLAMA_ARG_SSL_KEY_FILE` | `--ssl-key-file` |
| `LLAMA_ARG_SSL_CERT_FILE` | `--ssl-cert-file` |
| `LLAMA_ARG_TIMEOUT` | `--timeout` |
| `LLAMA_ARG_SSE_PING_INTERVAL` | `--sse-ping-interval` |
| `LLAMA_ARG_THREADS_HTTP` | `--threads-http` |
| `LLAMA_ARG_CACHE_PROMPT` | `--cache-prompt` |
| `LLAMA_ARG_CACHE_REUSE` | `--cache-reuse` |
| `LLAMA_ARG_CACHE_IDLE_SLOTS` | `--cache-idle-slots` |
| `LLAMA_ARG_ENDPOINT_METRICS` | `--metrics` |
| `LLAMA_ARG_ENDPOINT_PROPS` | `--props` |
| `LLAMA_ARG_ENDPOINT_SLOTS` | `--slots` |
| `LLAMA_ARG_MODELS_DIR` | `--models-dir` |
| `LLAMA_ARG_MODELS_PRESET` | `--models-preset` |
| `LLAMA_ARG_MODELS_MAX` | `--models-max` |
| `LLAMA_ARG_MODELS_AUTOLOAD` | `--models-autoload` |
| `LLAMA_ARG_N_PARALLEL` | `--parallel` |
| `LLAMA_ARG_CONT_BATCHING` | `--cont-batching` |
| `LLAMA_ARG_EMBEDDINGS` | `--embeddings` |
| `LLAMA_ARG_RERANKING` | `--reranking` |
| `LLAMA_ARG_JINJA` | `--jinja` |
| `LLAMA_ARG_CHAT_TEMPLATE` | `--chat-template` |
| `LLAMA_ARG_CHAT_TEMPLATE_FILE` | `--chat-template-file` |
| `LLAMA_ARG_CHAT_TEMPLATE_KWARGS` | `--chat-template-kwargs` |
| `LLAMA_ARG_SKIP_CHAT_PARSING` | `--skip-chat-parsing` |
| `LLAMA_ARG_PREFILL_ASSISTANT` | `--prefill-assistant` |
| `LLAMA_ARG_REASONING` | `--reasoning` |
| `LLAMA_ARG_THINK` | `--reasoning-format` |
| `LLAMA_ARG_THINK_BUDGET` | `--reasoning-budget` |
| `LLAMA_ARG_THINK_BUDGET_MESSAGE` | `--reasoning-budget-message` |
| `LLAMA_ARG_UI` | `--ui` |
| `LLAMA_ARG_UI_CONFIG` | `--ui-config` |
| `LLAMA_ARG_UI_CONFIG_FILE` | `--ui-config-file` |
| `LLAMA_ARG_UI_MCP_PROXY` | `--ui-mcp-proxy` |
| `LLAMA_ARG_TOOLS` | `--tools` |
| `LLAMA_ARG_WEBUI` | `--webui` |
| `LLAMA_ARG_WEBUI_CONFIG` | `--webui-config` |
| `LLAMA_ARG_WEBUI_CONFIG_FILE` | `--webui-config-file` |
| `LLAMA_ARG_WEBUI_MCP_PROXY` | `--webui-mcp-proxy` |
| `LLAMA_ARG_ALIAS` | `--alias` |
| `LLAMA_ARG_TAGS` | `--tags` |

### Logging
| Environment Variable | Parameter |
|---------------------|-----------|
| `LLAMA_ARG_LOG_FILE` | `--log-file` |
| `LLAMA_ARG_LOG_COLORS` | `--log-colors` |
| `LLAMA_ARG_LOG_VERBOSITY` | `--verbosity` |
| `LLAMA_ARG_LOG_PREFIX` | `--log-prefix` |
| `LLAMA_ARG_LOG_TIMESTAMPS` | `--log-timestamps` |

### Multimodal
| Environment Variable | Parameter |
|---------------------|-----------|
| `LLAMA_ARG_MMPROJ` | `--mmproj` |
| `LLAMA_ARG_MMPROJ_URL` | `--mmproj-url` |
| `LLAMA_ARG_MMPROJ_AUTO` | `--mmproj-auto` |
| `LLAMA_ARG_MMPROJ_OFFLOAD` | `--mmproj-offload` |
| `LLAMA_ARG_IMAGE_MIN_TOKENS` | `--image-min-tokens` |
| `LLAMA_ARG_IMAGE_MAX_TOKENS` | `--image-max-tokens` |
| `LLAMA_ARG_MTMD_BATCH_MAX_TOKENS` | `--mtmd-batch-max-tokens` |

### Pooling
| Environment Variable | Parameter |
|---------------------|-----------|
| `LLAMA_ARG_POOLING` | `--pooling` |

### RPC
| Environment Variable | Parameter |
|---------------------|-----------|
| `LLAMA_ARG_RPC` | `--rpc` |

### Removed/Deprecated
| Environment Variable | Parameter |
|---------------------|-----------|
| `LLAMA_ARG_DRAFT_MAX` | `--draft` / `--draft-n` / `--draft-max` (removed) |
| `LLAMA_ARG_DRAFT_MIN` | `--draft-min` / `--draft-n-min` (removed) |
| `LLAMA_ARG_DEFRAG_THOLD` | `--defrag-thold` (deprecated) |

---

## 5. Deprecated/Removed Parameters

The following parameters have been removed or deprecated and will throw an error if used:

### Removed Parameters

#### `--draft` / `--draft-n` / `--draft-max`
- **Replaced by**: `--spec-draft-n-max` or `--spec-ngram-mod-n-max`
- **Env**: `LLAMA_ARG_DRAFT_MAX`

#### `--draft-min` / `--draft-n-min`
- **Replaced by**: `--spec-draft-n-min` or `--spec-ngram-mod-n-min`
- **Env**: `LLAMA_ARG_DRAFT_MIN`

#### `--spec-ngram-size-n`
- **Replaced by**: respective `--spec-ngram-*-size-n` parameters
- **Removed from**: SERVER

#### `--spec-ngram-size-m`
- **Replaced by**: respective `--spec-ngram-*-size-m` parameters
- **Removed from**: SERVER

#### `--spec-ngram-min-hits`
- **Replaced by**: respective `--spec-ngram-*-min-hits` parameters
- **Removed from**: SERVER

### Deprecated Parameters

#### `--defrag-thold`
- **Status**: Deprecated, no longer necessary
- **Env**: `LLAMA_ARG_DEFRAG_THOLD`

#### `--webui` / `--no-webui`
- **Replaced by**: `--ui` / `--no-ui`
- **Env**: `LLAMA_ARG_WEBUI`

#### `--webui-config`
- **Replaced by**: `--ui-config`
- **Env**: `LLAMA_ARG_WEBUI_CONFIG`

#### `--webui-config-file`
- **Replaced by**: `--ui-config-file`
- **Env**: `LLAMA_ARG_WEBUI_CONFIG_FILE`

#### `--webui-mcp-proxy` / `--no-webui-mcp-proxy`
- **Replaced by**: `--ui-mcp-proxy` / `--no-ui-mcp-proxy`
- **Env**: `LLAMA_ARG_WEBUI_MCP_PROXY`

### Deprecated CMake Options

| Old Option | New Option |
|-----------|-----------|
| `LLAMA_CUBLAS` | `GGML_CUDA` |
| `LLAMA_CUDA` | `GGML_CUDA` |
| `LLAMA_METAL` | `GGML_METAL` |
| `LLAMA_METAL_EMBED_LIBRARY` | `GGML_METAL_EMBED_LIBRARY` |
| `LLAMA_NATIVE` | `GGML_NATIVE` |
| `LLAMA_RPC` | `GGML_RPC` |
| `LLAMA_SYCL` | `GGML_SYCL` |
| `LLAMA_SYCL_F16` | `GGML_SYCL_F16` |
| `LLAMA_CANN` | `GGML_CANN` |
| `LLAMA_CURL` | (removed, use `LLAMA_OPENSSL`) |

---

## 6. Presets

Presets are special parameters that configure the server with predefined settings for specific models. They can automatically download models from Hugging Face.

### Model Presets

#### `--tts-oute-default`
- **Description**: Use default OuteTTS models. Downloads weights from the internet.
- **Model**: `ggml-org/OuteTTS-0.2-500M-GGUF:OuteTTS-0.2-500M-Q8_0.gguf`
- **Vocoder**: `ggml-org/WavTokenizer:WavTokenizer-Large-75-F16.gguf`

#### `--embd-gemma-default`
- **Description**: Use default EmbeddingGemma model.
- **Model**: `ggml-org/embeddinggemma-300M-qat-q4_0-GGUF:embeddinggemma-300M-qat-Q4_0.gguf`
- **Port**: 8011, **ubatch**: 2048, **batch**: 2048, **parallel**: 32, **ctx**: 65536

### FIM (Fill-in-the-Middle) Presets

#### `--fim-qwen-1.5b-default`
- **Description**: Qwen 2.5 Coder 1.5B for FIM.
- **Model**: `ggml-org/Qwen2.5-Coder-1.5B-Q8_0-GGUF:qwen2.5-coder-1.5b-q8_0.gguf`
- **Port**: 8012, **ubatch**: 1024, **batch**: 1024, **cache_reuse**: 256

#### `--fim-qwen-3b-default`
- **Description**: Qwen 2.5 Coder 3B for FIM.
- **Model**: `ggml-org/Qwen2.5-Coder-3B-Q8_0-GGUF:qwen2.5-coder-3b-q8_0.gguf`
- **Port**: 8012, **ubatch**: 1024, **batch**: 1024, **cache_reuse**: 256

#### `--fim-qwen-7b-default`
- **Description**: Qwen 2.5 Coder 7B for FIM.
- **Model**: `ggml-org/Qwen2.5-Coder-7B-Q8_0-GGUF:qwen2.5-coder-7b-q8_0.gguf`
- **Port**: 8012, **ubatch**: 1024, **batch**: 1024, **cache_reuse**: 256

#### `--fim-qwen-7b-spec`
- **Description**: Qwen 2.5 Coder 7B + 0.5B draft for speculative decoding.
- **Model**: `ggml-org/Qwen2.5-Coder-7B-Q8_0-GGUF:qwen2.5-coder-7b-q8_0.gguf`
- **Draft**: `ggml-org/Qwen2.5-Coder-0.5B-Q8_0-GGUF:qwen2.5-coder-0.5b-q8_0.gguf`
- **Port**: 8012, **ubatch**: 1024, **batch**: 1024, **cache_reuse**: 256

#### `--fim-qwen-14b-spec`
- **Description**: Qwen 2.5 Coder 14B + 0.5B draft for speculative decoding.
- **Model**: `ggml-org/Qwen2.5-Coder-14B-Q8_0-GGUF:qwen2.5-coder-14b-q8_0.gguf`
- **Draft**: `ggml-org/Qwen2.5-Coder-0.5B-Q8_0-GGUF:qwen2.5-coder-0.5b-q8_0.gguf`
- **Port**: 8012, **ubatch**: 1024, **batch**: 1024, **cache_reuse**: 256

#### `--fim-qwen-30b-default`
- **Description**: Qwen 3 Coder 30B A3B Instruct for FIM.
- **Model**: `ggml-org/Qwen3-Coder-30B-A3B-Instruct-Q8_0-GGUF:qwen3-coder-30b-a3b-instruct-q8_0.gguf`
- **Port**: 8012, **ubatch**: 1024, **batch**: 1024, **cache_reuse**: 256

### Other Model Presets

#### `--gpt-oss-20b-default`
- **Description**: GPT-oss 20B model.
- **Model**: `ggml-org/gpt-oss-20b-GGUF:gpt-oss-20b-mxfp4.gguf`
- **Port**: 8013, **ubatch**: 2048, **batch**: 32768, **parallel**: 2, **ctx**: 262144
- **Sampling**: temp=1.0, top_p=1.0, top_k=0, min_p=0.01

#### `--gpt-oss-120b-default`
- **Description**: GPT-oss 120B model.
- **Model**: `ggml-org/gpt-oss-120b-GGUF`
- **Port**: 8013, **ubatch**: 2048, **batch**: 32768, **parallel**: 2, **ctx**: 262144
- **Sampling**: temp=1.0, top_p=1.0, top_k=0, min_p=0.01

#### `--vision-gemma-4b-default`
- **Description**: Gemma 3 4B QAT (multimodal).
- **Model**: `ggml-org/gemma-3-4b-it-qat-GGUF`
- **Port**: 8014, **ctx**: 0 (model default)

#### `--vision-gemma-12b-default`
- **Description**: Gemma 3 12B QAT (multimodal).
- **Model**: `ggml-org/gemma-3-12b-it-qat-GGUF`
- **Port**: 8014, **ctx**: 0 (model default)

### Speculative Preset

#### `--spec-default`
- **Description**: Enable default speculative decoding configuration (ngram-mod).
- **Types**: ngram-mod
- **n_match**: 24, **n_min**: 48, **n_max**: 64

### Router Preset Options

These are used in preset INI files for the router server:

#### `load-on-startup`
- **Type**: NAME
- **Description**: In server router mode, autoload this model on startup.
- **Env**: `COMMON_ARG_PRESET_LOAD_ON_STARTUP`

#### `stop-timeout`
- **Type**: SECONDS
- **Description**: In server router mode, force-kill model instance after this many seconds of graceful shutdown.
- **Env**: `COMMON_ARG_PRESET_STOP_TIMEOUT`
