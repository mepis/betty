# llama.cpp Build Documentation

## Overview

This documentation covers all build-time configuration options, CMake flags, environment variables, and backend settings for building llama.cpp and its underlying ggml library.

## Prerequisites

### Required Tools

- **CMake** 3.14 or higher
- **C/C++ Compiler**: GCC, Clang, MSVC, or oneAPI
- **Git** (for version information)
- **Python 3** (for some utilities)

### Optional Dependencies

| Dependency | Purpose | Installation |
|------------|---------|--------------|
| `ccache` | Faster incremental builds | `apt install ccache`, `brew install ccache` |
| `libssl-dev` | HTTPS/TLS support | `apt-get install libssl-dev` |
| `ninja` | Parallel build system | `apt install ninja-build` |

## Basic Build Commands

### Standard Build

```bash
# Configure
cmake -B build

# Build
cmake --build build --config Release
```

### Parallel Build

```bash
# Configure and build with parallel jobs
cmake -B build
cmake --build build --config Release -j 8
```

### Debug Build

```bash
# Single-config generator (Unix Makefiles)
cmake -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build

# Multi-config generator (Visual Studio, XCode)
cmake -B build -G "Xcode"
cmake --build build --config Debug
```

### Static Build

```bash
cmake -B build -DBUILD_SHARED_LIBS=OFF
cmake --build build --config Release
```

## CMake Build Options

### General Options

| Option | Default | Description |
|--------|---------|-------------|
| `BUILD_SHARED_LIBS` | ON (OFF for MINGW) | Build shared libraries |
| `CMAKE_BUILD_TYPE` | Release | Build type (Debug, Release, MinSizeRel, RelWithDebInfo) |
| `CMAKE_EXPORT_COMPILE_COMMANDS` | ON | Generate compile_commands.json |
| `GGML_STANDALONE` | Auto | Build as standalone project |
| `GGML_BACKEND_DL` | OFF | Build backends as dynamic libraries |
| `GGML_BACKEND_DIR` | "" | Directory to load dynamic backends from |

### Debug Options

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_ALL_WARNINGS` | ON | Enable all compiler warnings |
| `GGML_ALL_WARNINGS_3RD_PARTY` | OFF | Enable warnings in 3rd party libs |
| `GGML_GPROF` | OFF | Enable gprof profiling |
| `GGML_FATAL_WARNINGS` | OFF | Enable -Werror flag |

### Sanitizers

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_SANITIZE_THREAD` | OFF | Enable thread sanitizer |
| `GGML_SANITIZE_ADDRESS` | OFF | Enable address sanitizer |
| `GGML_SANITIZE_UNDEFINED` | OFF | Enable undefined behavior sanitizer |

### Instruction Set Options

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_NATIVE` | ON (OFF for cross-compile) | Optimize build for current system |
| `GGML_LTO` | OFF | Enable link time optimization |
| `GGML_CCACHE` | ON | Use ccache if available |
| `GGML_STATIC` | OFF | Static link libraries |
| `GGML_CPU_ALL_VARIANTS` | OFF | Build all CPU backend variants |
| `GGML_CPU_ARM_ARCH` | "" | CPU architecture for ARM |
| `GGML_CPU_POWERPC_CPUTYPE` | "" | CPU type for PowerPC |

### CPU Instruction Sets (when GGML_NATIVE=OFF)

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_SSE42` | ON | Enable SSE 4.2 |
| `GGML_AVX` | ON | Enable AVX |
| `GGML_AVX_VNNI` | OFF | Enable AVX-VNNI |
| `GGML_AVX2` | ON | Enable AVX2 |
| `GGML_BMI2` | ON | Enable BMI2 |
| `GGML_AVX512` | OFF | Enable AVX512F |
| `GGML_AVX512_VBMI` | OFF | Enable AVX512-VBMI |
| `GGML_AVX512_VNNI` | OFF | Enable AVX512-VNNI |
| `GGML_AVX512_BF16` | OFF | Enable AVX512-BF16 |
| `GGML_FMA` | ON | Enable FMA (not MSVC) |
| `GGML_F16C` | ON | Enable F16C (not MSVC) |
| `GGML_AMX_TILE` | OFF | Enable AMX-TILE (not MSVC) |
| `GGML_AMX_INT8` | OFF | Enable AMX-INT8 (not MSVC) |
| `GGML_AMX_BF16` | OFF | Enable AMX-BF16 (not MSVC) |
| `GGML_LASX` | ON | Enable LASX |
| `GGML_LSX` | ON | Enable LSX |
| `GGML_RVV` | ON | Enable RVV (RISC-V Vector) |
| `GGML_RV_ZFH` | ON | Enable RISC-V ZFH |
| `GGML_RV_ZVFH` | ON | Enable RISC-V ZVFH |
| `GGML_RV_ZICBOP` | ON | Enable RISC-V ZICBOP |
| `GGML_RV_ZIHINTPAUSE` | ON | Enable RISC-V ZIHINTPAUSE |
| `GGML_XTHEADVECTOR` | OFF | Enable XTheadVector |
| `GGML_VXE` | ON | Enable VXE |
| `GGML_CPU_HBM` | OFF | Use memkind for CPU HBM |
| `GGML_CPU_REPACK` | ON | Use runtime weight conversion |
| `GGML_CPU_KLEIDIAI` | OFF | Use KleidiAI optimized kernels |

### CPU Backend Options

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_CPU` | ON | Enable CPU backend |
| `GGML_SCHED_MAX_COPIES` | 4 | Max input copies for pipeline parallelism |
| `GGML_SCHED_NO_REALLOC` | OFF | Disallow reallocations in ggml-alloc |

### BLAS Options

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_BLAS` | ON (Apple), OFF (others) | Use BLAS |
| `GGML_BLAS_VENDOR` | Apple/Generic | BLAS library vendor |

**Supported BLAS Vendors:**
- `Generic` - Default BLAS
- `OpenBLAS` - OpenBLAS library
- `Intel10_64lp` - Intel oneMKL (64-bit loop)
- `Intel10_64lp_seq` - Intel oneMKL sequential
- `BLIS` - BLIS library
- `Apple` - Accelerate framework (macOS only)

**OpenBLAS Build:**
```bash
cmake -B build -DGGML_BLAS=ON -DGGML_BLAS_VENDOR=OpenBLAS
```

**Intel oneMKL Build:**
```bash
source /opt/intel/oneapi/setvars.sh
cmake -B build -DGGML_BLAS=ON -DGGML_BLAS_VENDOR=Intel10_64lp \
    -DCMAKE_C_COMPILER=icx -DCMAKE_CXX_COMPILER=icpx -DGGML_NATIVE=ON
```

### BLAS Build Options

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_ACCELERATE` | ON (Apple) | Enable Accelerate framework |
| `GGML_LLAMAFILE` | OFF | Use LLAMAFILE |

### CUDA Backend

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_CUDA` | OFF | Enable CUDA backend |
| `GGML_CUDA_FORCE_MMQ` | OFF | Force use of MMQ kernels |
| `GGML_CUDA_FORCE_CUBLAS` | OFF | Force use of cuBLAS |
| `GGML_CUDA_PEER_MAX_BATCH_SIZE` | 128 | Max batch size for peer access |
| `GGML_CUDA_NO_PEER_COPY` | OFF | Disable peer-to-peer copies |
| `GGML_CUDA_NO_VMM` | OFF | Disable CUDA VMM (Virtual Memory) |
| `GGML_CUDA_FA` | ON | Compile FlashAttention CUDA kernels |
| `GGML_CUDA_FA_ALL_QUANTS` | OFF | Compile all quants for FA |
| `GGML_CUDA_GRAPHS` | OFF | Use CUDA graphs |
| `GGML_CUDA_COMPRESSION_MODE` | size | Binary compression mode (none/speed/balance/size) |

**CUDA Build:**
```bash
cmake -B build -DGGML_CUDA=ON
```

**Non-Native CUDA Build (all GPUs):**
```bash
cmake -B build -DGGML_CUDA=ON -DGGML_NATIVE=OFF
```

**Override CUDA Architectures:**
```bash
cmake -B build -DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES="86;89"
```

**Override CUDA Version:**
```bash
cmake -B build -DGGML_CUDA=ON \
    -DCMAKE_CUDA_COMPILER=/opt/cuda-11.7/bin/nvcc \
    -DCMAKE_INSTALL_RPATH="/opt/cuda-11.7/lib64;$ORIGIN" \
    -DCMAKE_BUILD_WITH_INSTALL_RPATH=ON
```

### MUSA Backend

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_MUSA` | OFF | Enable MUSA backend |
| `GGML_MUSA_GRAPHS` | OFF | Use MUSA graphs (experimental) |
| `GGML_MUSA_MUDNN_COPY` | OFF | Enable muDNN for accelerated copy |

**MUSA Build:**
```bash
cmake -B build -DGGML_MUSA=ON
```

**Static MUSA Build:**
```bash
cmake -B build -DGGML_MUSA=ON \
    -DBUILD_SHARED_LIBS=OFF \
    -DCMAKE_POSITION_INDEPENDENT_CODE=ON
```

### HIP Backend

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_HIP` | OFF | Enable HIP backend |
| `GGML_HIP_GRAPHS` | OFF | Use HIP graphs (experimental) |
| `GGML_HIP_NO_VMM` | ON | Disable HIP VMM |
| `GGML_HIP_ROCWMMA_FATTN` | OFF | Enable rocWMMA for FlashAttention |
| `GGML_HIP_MMQ_MFMA` | ON | Enable MFMA MMA for CDNA in MMQ |
| `GGML_HIP_EXPORT_METRICS` | OFF | Enable kernel perf metrics |

**HIP Build:**
```bash
HIPCXX="$(hipconfig -l)/clang" HIP_PATH="$(hipconfig -R)" \
    cmake -S . -B build -DGGML_HIP=ON -DGPU_TARGETS=gfx1030 \
    -DCMAKE_BUILD_TYPE=Release
```

### Vulkan Backend

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_VULKAN` | OFF | Enable Vulkan backend |
| `GGML_VULKAN_CHECK_RESULTS` | OFF | Run Vulkan op checks |
| `GGML_VULKAN_DEBUG` | OFF | Enable Vulkan debug output |
| `GGML_VULKAN_MEMORY_DEBUG` | OFF | Enable Vulkan memory debug |
| `GGML_VULKAN_SHADER_DEBUG_INFO` | OFF | Enable shader debug info |
| `GGML_VULKAN_VALIDATE` | OFF | Enable Vulkan validation |
| `GGML_VULKAN_RUN_TESTS` | OFF | Run Vulkan tests |

**Vulkan Build (Linux):**
```bash
cmake -B build -DGGML_VULKAN=1
```

**Vulkan Build (macOS with MoltenVK):**
```bash
cmake -B build -DGGML_VULKAN=1 -DGGML_METAL=OFF
```

### WebGPU Backend

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_WEBGPU` | OFF | Enable WebGPU backend |
| `GGML_WEBGPU_DEBUG` | OFF | Enable WebGPU debug output |
| `GGML_WEBGPU_CPU_PROFILE` | OFF | Enable WebGPU CPU profiling |
| `GGML_WEBGPU_GPU_PROFILE` | OFF | Enable WebGPU GPU profiling |
| `GGML_WEBGPU_JSPI` | ON | Use JSPI for WebGPU |

**WebGPU Build:**
```bash
cmake -B build -DGGML_WEBGPU=ON
```

### Metal Backend (macOS)

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_METAL` | ON (Apple) | Enable Metal backend |
| `GGML_METAL_NDEBUG` | OFF | Disable Metal debugging |
| `GGML_METAL_SHADER_DEBUG` | OFF | Compile with -fno-fast-math |
| `GGML_METAL_EMBED_LIBRARY` | ON | Embed Metal library |
| `GGML_METAL_MACOSX_VERSION_MIN` | "" | Minimum macOS version |
| `GGML_METAL_STD` | "" | Metal standard version (-std flag) |

**Metal Build (disabled):**
```bash
cmake -B build -DGGML_METAL=OFF
```

### SYCL Backend

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_SYCL` | OFF | Enable SYCL backend |
| `GGML_SYCL_F16` | OFF | Use 16-bit floats for SYCL |
| `GGML_SYCL_GRAPH` | ON | Enable graphs in SYCL backend |
| `GGML_SYCL_DNN` | ON | Enable oneDNN in SYCL backend |
| `GGML_SYCL_TARGET` | INTEL | SYCL target device |
| `GGML_SYCL_DEVICE_ARCH` | "" | SYCL device architecture |

**SYCL Build:**
```bash
source /opt/intel/oneapi/setvars.sh
cmake -B build -DGGML_SYCL=ON
```

### CANN Backend (Ascend NPU)

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_CANN` | OFF | Enable CANN backend |

**CANN Build:**
```bash
cmake -B build -DGGML_CANN=ON -DCMAKE_BUILD_TYPE=Release
```

### OpenCL Backend

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_OPENCL` | OFF | Enable OpenCL backend |
| `GGML_OPENCL_PROFILING` | OFF | Use OpenCL profiling |
| `GGML_OPENCL_EMBED_KERNELS` | ON | Embed kernels |
| `GGML_OPENCL_USE_ADRENO_KERNELS` | ON | Use Adreno optimized kernels |
| `GGML_OPENCL_TARGET_VERSION` | 300 | OpenCL API version to target |

### OpenVINO Backend

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_OPENVINO` | OFF | Enable OpenVINO backend |

**OpenVINO Build:**
```bash
cmake -B build -DGGML_OPENVINO=ON
```

### ZenDNN Backend

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_ZENDNN` | OFF | Enable ZenDNN backend |
| `ZENDNN_ROOT` | "" | Path to ZenDNN installation |

**ZenDNN Build:**
```bash
cmake -B build -DGGML_ZENDNN=ON
```

**Custom ZenDNN:**
```bash
cmake -B build -DGGML_ZENDNN=ON -DZENDNN_ROOT=/path/to/zendnn
```

### RPC Backend

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_RPC` | OFF | Enable RPC backend |

### Hexagon Backend

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_HEXAGON` | OFF | Enable Hexagon backend |
| `GGML_HEXAGON_FP32_QUANTIZE_GROUP_SIZE` | 128 | Quantize group size (32, 64, 128) |

### VirtGPU Backend

| Option | Default | Description |
|--------|---------|-------------|
| `GGML_VIRTGPU` | OFF | Enable VirtGPU/Virglrenderer frontend |
| `GGML_VIRTGPU_BACKEND` | OFF | Build VirtGPU backend |

### llama.cpp Specific Options

| Option | Default | Description |
|--------|---------|-------------|
| `LLAMA_USE_SYSTEM_GGML` | OFF | Use system libggml |
| `LLAMA_WASM_MEM64` | ON | Use 64-bit memory in WASM |
| `LLAMA_WASM_SINGLE_FILE` | OFF | Embed WASM in llama.js |
| `LLAMA_BUILD_HTML` | ON | Build HTML file |
| `BUILD_SHARED_LIBS` | ON | Build shared libraries |
| `LLAMA_BUILD_COMMON` | ON | Build common utils library |
| `LLAMA_BUILD_TESTS` | ON | Build tests |
| `LLAMA_BUILD_TOOLS` | ON | Build tools |
| `LLAMA_BUILD_EXAMPLES` | ON | Build examples |
| `LLAMA_BUILD_SERVER` | ON | Build server example |
| `LLAMA_BUILD_WEBUI` | ON | Build embedded Web UI |
| `LLAMA_TOOLS_INSTALL` | ON | Install tools |
| `LLAMA_TESTS_INSTALL` | ON | Install tests |
| `LLAMA_OPENSSL` | ON | Use OpenSSL for HTTPS |
| `LLAMA_LLGUIDANCE` | OFF | Include LLGuidance library |

### llama.cpp Build Options

| Option | Default | Description |
|--------|---------|-------------|
| `LLAMA_ALL_WARNINGS` | ON | Enable all compiler warnings |
| `LLAMA_ALL_WARNINGS_3RD_PARTY` | OFF | Enable warnings in 3rd party libs |
| `LLAMA_FATAL_WARNINGS` | OFF | Enable -Werror flag |
| `LLAMA_SANITIZE_THREAD` | OFF | Enable thread sanitizer |
| `LLAMA_SANITIZE_ADDRESS` | OFF | Enable address sanitizer |
| `LLAMA_SANITIZE_UNDEFINED` | OFF | Enable undefined sanitizer |

## Runtime Environment Variables

### CUDA Environment Variables

| Variable | Description |
|----------|-------------|
| `CUDA_VISIBLE_DEVICES` | Hide specified compute devices |
| `CUDA_SCALE_LAUNCH_QUEUES` | Control CUDA command buffer size (e.g., `4x`) |
| `GGML_CUDA_ENABLE_UNIFIED_MEMORY` | Enable unified memory (Linux) |
| `GGML_CUDA_FORCE_CUBLAS_COMPUTE_32F` | Use FP32 compute type |
| `GGML_CUDA_FORCE_CUBLAS_COMPUTE_16F` | Force FP16 compute type |

### HIP Environment Variables

| Variable | Description |
|----------|-------------|
| `HIP_VISIBLE_DEVICES` | Specify which GPU(s) to use |
| `HSA_OVERRIDE_GFX_VERSION` | Override GPU version (e.g., `10.3.0`) |

### MUSA Environment Variables

| Variable | Description |
|----------|-------------|
| `MUSA_VISIBLE_DEVICES` | Hide specified compute devices |

### CPU Environment Variables

| Variable | Description |
|----------|-------------|
| `OMP_NUM_THREADS` | Number of OpenMP threads |
| `GGML_KLEIDIAI_SME` | Control SME behavior (not set/0/<n>) |

### Vulkan Environment Variables (macOS)

| Variable | Description |
|----------|-------------|
| `VK_ICD_FILENAMES` | Set Vulkan ICD (MoltenVK/KosmicKrisp) |
| `VK_DRIVER_FILES` | Set Vulkan driver files |

### General Environment Variables

| Variable | Description |
|----------|-------------|
| `SOURCE_DATE_EPOCH` | Reproducible builds |
| `CMAKE_BUILD_PARALLEL_LEVEL` | Parallel build level |

## Platform-Specific Builds

### Windows (MSVC)

```bash
# Using Developer Command Prompt
cmake -B build -G Ninja -DGGML_CUDA=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

### Windows (arm64)

```bash
cmake --preset arm64-windows-llvm-release -D GGML_OPENMP=OFF
cmake --build build-arm64-windows-llvm-release
```

### macOS (Metal)

```bash
cmake -B build
cmake --build build --config Release
```

### Linux (CUDA)

```bash
cmake -B build -DGGML_CUDA=ON
cmake --build build --config Release -j 8
```

### Linux (OpenBLAS)

```bash
cmake -B build -DGGML_BLAS=ON -DGGML_BLAS_VENDOR=OpenBLAS
cmake --build build --config Release
```

### Docker (Vulkan)

```bash
docker build -t llama-cpp-vulkan --target light -f .devops/vulkan.Dockerfile .
```

## Build Output

### Directory Structure

```
build/
├── bin/
│   ├── llama-server          # Server binary
│   ├── llama-cli             # CLI binary
│   ├── llama-tokenize        # Tokenizer binary
│   ├── llama-quantize        # Quantization binary
│   ├── llama-bench           # Benchmark binary
│   └── ...                   # Other tools
├── lib/
│   ├── libllama.so           # llama library
│   └── libggml.so            # ggml library
└── CMakeCache.txt            # CMake configuration
```

## Installation

```bash
# Install to system
cmake --build build --config Release --target install

# Custom installation prefix
cmake -B build -DCMAKE_INSTALL_PREFIX=/opt/llama.cpp
cmake --build build --config Release --target install
```

## Common Build Issues

### Issue: CUDA not detected

**Solution:**
```bash
cmake -B build -DGGML_CUDA=ON \
    -DCMAKE_CUDA_COMPILER=/path/to/nvcc
```

### Issue: Vulkan not found

**Solution (Ubuntu):**
```bash
sudo apt-get install libvulkan-dev glslc
```

### Issue: Metal build failed on non-Apple

**Solution:**
```bash
cmake -B build -DGGML_METAL=OFF
```

### Issue: Slow incremental builds

**Solution:**
```bash
cmake -B build -DCMAKE_C_COMPILER_LAUNCHER=ccache -DCMAKE_CXX_COMPILER_LAUNCHER=ccache
```

## Build Verification

```bash
# Check build configuration
cmake -L build

# Run tests (if enabled)
ctest --test-dir build

# Verify binaries
./build/bin/llama-cli --version
```
