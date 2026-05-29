# GGML Options

Low-level GGML library tuning, cache policies, and tensor operation configuration.

**Tags**: `build`, `cmake`, `ggml`, `performance`, `optimization`

---

## GGML Core Options

### Build Configuration

| Flag | Default | Description |
|------|---------|-------------|
| `-DGGML_ALL=OFF` | `OFF` | Build all backends at once |
| `-DGGML_BACKEND_LOAD=OFF` | `OFF` | Dynamic backend loading |
| `-DGGML_CCACHE=ON` | `ON` | Use ccache for faster rebuilds |
| `-DGGML_NATIVE=ON` | `ON` | Optimize for host CPU architecture |
| `-DGGML_LLAMAFILE=OFF` | `OFF` | llama.cpp-specific optimizations |
| `-DGGML_SANITIZE_THREAD=OFF` | `OFF` | Enable ThreadSanitizer |
| `-DGGML_SANITIZE_ADDRESS=OFF` | `OFF` | Enable AddressSanitizer |
| `-DGGML_FATAL_HANDLER=ON` | `ON` | Install fatal signal handler |
| `-DGGML_GPROF=OFF` | `OFF` | Enable gprof profiling |

### CPU Vectorization

| Flag | Default | Description |
|------|---------|-------------|
| `-DGGML_AVX=ON` | `ON` | Enable AVX instructions |
| `-DGGML_AVX2=ON` | `ON` | Enable AVX2 instructions |
| `-DGGML_AVX512=OFF` | `OFF` | Enable AVX-512 instructions |
| `-DGGML_AVX512_VBMI=OFF` | `OFF` | Enable AVX-512 VBMI |
| `-DGGML_AVX512_VNNI=OFF` | `OFF` | Enable AVX-512 VNNI (integer dot product) |
| `-DGGML_FMA=ON` | `ON` | Enable FMA (fused multiply-add) |
| `-DGGML_F16C=ON` | `ON` | Enable FP16 conversion instructions |
| `-DGGML_LASX=OFF` | `OFF` | Enable LoongArch LASX |
| `-DGGML_LSX=OFF` | `OFF` | Enable LoongArch LSX |
| `-DGGML_RVV=OFF` | `OFF` | Enable RISC-V Vector extension |
| `-DGGML_ZVE=OFF` | `OFF` | Enable RISC-V ZVE extension |
| `-DGGML_SVE=OFF` | `OFF` | Enable ARM SVE |
| `-DGGML_SVE_BITS` | — | ARM SVE vector bits |

### SIMD / Acceleration Libraries

| Flag | Default | Description |
|------|---------|-------------|
| `-DGGML_OPENMP=OFF` | `OFF` | Enable OpenMP parallelization |
| `-DGGML_AMX=OFF` | `OFF` | Enable Intel AMX (Advanced Matrix Extensions) |
| `-DGGML_AMX_BF16=OFF` | `OFF` | Enable AMX BF16 |
| `-DGGML_AMX_INT8=OFF` | `OFF` | Enable AMX INT8 |
| `-DGGML_AMX_TILE=OFF` | `OFF` | Enable AMX tile operations |

### Cache & Memory

| Flag | Default | Description |
|------|---------|-------------|
| `-DGGML_CUDA_NO_VMM=OFF` | `OFF` | Disable CUDA virtual memory management |
| `-DGGML_CUDA_NO_PEER_COPY=OFF` | `OFF` | Disable CUDA peer-to-peer copy |
| `-DGGML_CUDA_PEER_MAX_BATCH_SIZE=128` | `128` | Max batch size for CUDA peer access |
| `-DGGML_CUDA_FORCE_MMQ=OFF` | `OFF` | Force MMQ (legacy quantization) |

---

## Performance Tuning

### AVX-512 Considerations

AVX-512 can cause frequency throttling on some Intel CPUs. Test performance with and without:

```bash
# With AVX-512 (may throttle)
cmake -B build -DGGML_AVX512=ON -DGGML_AVX512_VNNI=ON

# Without AVX-512 (may be faster on some CPUs)
cmake -B build -DGGML_AVX512=OFF -DGGML_AVX512_VNNI=OFF
```

### AMX (Intel 4th Gen Xeon+)

AMX provides significant speedup for matrix operations on supported hardware:

```bash
cmake -B build -DGGML_AMX=ON -DGGML_AMX_BF16=ON -DGGML_AMX_INT8=ON
```

### OpenMP vs Native Threading

```bash
# OpenMP (may be better for some workloads)
cmake -B build -DGGML_OPENMP=ON

# Native threading (default, often faster)
cmake -B build -DGGML_OPENMP=OFF
```

---

## See Also

- [[llama-cpp/build-options/cmake-overview\|CMake Overview]] — General CMake configuration
- [[llama-cpp/build-options/backend-options\|Backend Options]] — GPU backend configuration
- [[llama-cpp/build-options/build-flags-reference\|Build Flags Reference]] — Complete flag table
