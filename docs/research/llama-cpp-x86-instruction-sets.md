# llama.cpp x86 CPU Instruction Sets — Detailed Research Report

> **Date:** 2026-06-22
> **Purpose:** Research report on llama.cpp's x86 CPU instruction set build configuration parameters.
> **Source Material:** llama.cpp source code (`ggml/src/`), Intel documentation, Phoronix reviews, community benchmarks, Wikipedia.

---

## Table of Contents

1. [Overview & Build Architecture](#1-overview--build-architecture)
2. [Instruction Set Deep Dives](#2-instruction-set-deep-dives)
   - [GGML_SSE42](#21-ggml_sse42)
   - [GGML_AVX](#22-ggml_avx)
   - [GGML_AVX2](#23-ggml_avx2)
   - [GGML_FMA](#24-ggml_fma)
   - [GGML_F16C](#25-ggml_f16c)
   - [GGML_BMI2](#26-ggml_bmi2)
   - [GGML_AVX_VNNI](#27-ggml_avx_vnni)
   - [GGML_AVX512](#28-ggml_avx512)
   - [GGML_AVX512_VBMI](#29-ggml_avx512_vbmi)
   - [GGML_AVX512_VNNI](#210-ggml_avx512_vnni)
   - [GGML_AVX512_BF16](#211-ggml_avx512_bf16)
   - [GGML_AMX_TILE](#212-ggml_amx_tile)
   - [GGML_AMX_INT8](#213-ggml_amx_int8)
   - [GGML_AMX_BF16](#214-ggml_amx_bf16)
3. [Build Variant Hierarchy](#3-build-variant-hierarchy)
4. [Performance Summary](#4-performance-summary)
5. [Recommendations](#5-recommendations)

---

## 1. Overview & Build Architecture

### How llama.cpp Handles Instruction Sets

llama.cpp uses a **layered build system** for x86 CPU instruction sets. The key files are:

- **`ggml/src/CMakeLists.txt`** (lines 329-401): Defines the build variant hierarchy
- **`ggml/src/ggml-cpu/CMakeLists.txt`** (lines 252-366): Sets compiler flags per feature
- **`ggml/src/ggml-cpu/arch/x86/cpu-feats.cpp`**: Runtime CPU feature detection via `cpuid` instruction
- **`ggml/src/ggml-cpu/ggml-cpu.c`** (lines 3552-3610): `ggml_cpu_has_*()` API for runtime queries

### Build Modes

| Mode | How it works | Best for |
|------|-------------|----------|
| **GGML_NATIVE=ON** (default) | Compiler auto-detects CPU and uses all supported instructions | Building on the target machine itself |
| **GGML_NATIVE=OFF** | Uses conservative defaults (SSE42, AVX, AVX2, BMI2, FMA, F16C all ON) | Cross-compiling or distributing binaries |
| **GGML_CPU_ALL_VARIANTS=ON** | Builds 14+ separate backend variants, runtime dispatch picks the best one | Distributing a single binary that works everywhere |

### Instruction Set Hierarchy (from `ggml/src/CMakeLists.txt`)

llama.cpp defines 14 named build variants that form an **increasing capability ladder**:

```
x64 (baseline)
  → sse42 (SSE4.2 only)
  → sandybridge (SSE4.2 + AVX)
  → ivybridge (SSE4.2 + AVX + F16C)
  → piledriver (SSE4.2 + AVX + F16C + FMA)
  → haswell (SSE4.2 + AVX + F16C + FMA + AVX2 + BMI2)
  → skylakex (haswell + AVX512)
  → cannonlake (skylakex + AVX512_VBMI)
  → cascadelake (skylakex + AVX512_VNNI)
  → icelake (cannonlake + AVX512_VNNI)
  → cooperlake (icelake + AVX512_BF16)
  → zen4 (icelake + AVX512_BF16 + AVX512_VBMI)
  → alderlake (haswell + AVX_VNNI)
  → sapphirerapids (zen4 + AMX_TILE + AMX_INT8)
```

---

## 2. Instruction Set Deep Dives

### 2.1 GGML_SSE42

| Property | Value |
|----------|-------|
| **Default** | ON (when GGML_NATIVE is OFF) |
| **Introduced** | Intel Penryn / AMD Bulldozer (2007-2011) |
| **Required by** | Almost all subsequent variants |
| **Runtime check** | `f_1_ecx[20]` in `cpu-feats.cpp` |

**What it does:**
SSE 4.2 adds 12 new instructions to SSE 4.1, primarily focused on:
- **String operations**: `PCMPISTRM`, `PCMPISTRI`, `PCMPESTRI`, `PCMPESTRM` for SIMD string comparison
- **CRC32**: `CRC32` instruction for hardware-accelerated cyclic redundancy check
- **POPCNT**: `POPCNT` for population count (number of set bits)

**LLM Impact:**
- **Minimal direct impact** on matrix multiplication kernels
- Used for **string processing** during tokenization and text handling
- The `POPCNT` instruction can speed up bit manipulation in quantized data handling
- SSE 4.2 is the **absolute minimum** baseline for any llama.cpp build that targets x86_64

**CPU Compatibility:**
- Intel: Core 2 (Penryn refresh, 2007+) through all modern Xeons/Core
- AMD: Barcelona (2007+) through all modern Ryzen/EPYC
- **Universal** on any x86_64 CPU from the last 15+ years

**When to enable/disable:**
- ✅ **Always enable** — this is the baseline
- ❌ Never disable unless targeting exotic embedded x86 CPUs

---

### 2.2 GGML_AVX

| Property | Value |
|----------|-------|
| **Default** | ON (when GGML_NATIVE is OFF) |
| **Introduced** | Intel Westmere / Sandy Bridge (2011) |
| **Required by** | All variants above `sse42` |
| **Runtime check** | `f_1_ecx[28]` in `cpu-feats.cpp` |

**What it does:**
AVX (Advanced Vector Extensions) introduces 256-bit wide SIMD registers (YMM0-YMM15) and new instructions:
- **256-bit floating-point operations**: `VADDPS`, `VMULPS`, `VSUBPS`, `VDIVPS` (packed single-precision)
- **256-bit integer operations**: `VADDD`, `VMULL` (packed integers)
- **Shuffle and move**: `VSHUFPS`, `VMOVAPD`, `VMOVAPS`
- **Horizontal operations**: `VHADDPS`, `VHSUBPS`

**LLM Impact:**
- Enables **256-bit parallel floating-point math** for quantized matmul
- Each AVX instruction processes **8 x float32** or **4 x float32** simultaneously
- Provides roughly **2x throughput** over SSE4.2 for FP32 operations
- Used in the **SSE42→AVX** variant path for basic quantized inference

**CPU Compatibility:**
- Intel: Sandy Bridge (2011), Westmere-EP (2011), all later
- AMD: Bulldozer (2011), all later
- **Not available** on pre-2011 Intel CPUs (Core 2, original Nehalem)

**When to enable/disable:**
- ✅ **Enable on any CPU from 2011+**
- ❌ Disable only if targeting very old hardware or compatibility with Windows 7 (AVX requires SP1+)

---

### 2.3 GGML_AVX2

| Property | Value |
|----------|-------|
| **Default** | ON (when GGML_NATIVE is OFF) |
| **Introduced** | Intel Haswell / AMD Excavator (2013-2015) |
| **Required by** | haswell variant and above |
| **Runtime check** | `f_7_ebx[5]` in `cpu-feats.cpp` |

**What it does:**
AVX2 extends AVX with **integer SIMD at 256 bits** and additional floating-point capabilities:
- **256-bit integer operations**: `VPADDB`, `VPADDW`, `VPADDD` (packed byte/word/dword add)
- **Gather/scatter**: `VPGATHERDD`, `VPGATHERDQ` (non-contiguous memory access)
- **Masked operations**: `VPMASKMOVd`, `VPMASKMOVq`
- **256-bit FMADD**: `VFMADD132PS`, `VFMADD213PS`, `VFMADD231PS`
- **Bitwise ops**: `VPAND`, `VPOR`, `VPSRLD`, `VPSLLD`

**LLM Impact:**
- **Critical for quantized matmul**: AVX2 kernels handle the bulk of quantized inference
- Enables **integer SIMD** which is essential for dequantizing Q4_0, Q4_1, Q5_0, etc.
- The **Haswell variant** (SSE42+AVX+F16C+FMA+AVX2+BMI2) is the **sweet spot** for most modern CPUs
- On a typical modern desktop CPU, AVX2 provides **~40-60% speedup** over AVX-only builds for LLM inference
- llama.cpp's AVX2 kernels handle the common quantization types: Q4_0, Q4_1, Q5_0, Q5_1, Q8_0, Q8_1

**CPU Compatibility:**
- Intel: Haswell (2013), Broadwell, Skylake, all later
- AMD: Excavator (2015), Zen (2017), all later
- **Not available** on pre-Haswell Intel or pre-Zen AMD

**When to enable/disable:**
- ✅ **Enable on any CPU from 2013+** (Intel Haswell+, AMD Excavator+/Zen+)
- ❌ Disable only for maximum compatibility with older hardware

---

### 2.4 GGML_FMA

| Property | Value |
|----------|-------|
| **Default** | ON (when GGML_NATIVE is OFF, not on MSVC) |
| **Introduced** | Intel Haswell (2013) |
| **Implied by** | AVX2, AVX512 (automatically available) |
| **Runtime check** | `f_1_ecx[12]` in `cpu-feats.cpp` |

**What it does:**
FMA (Fused Multiply-Add) performs `a * b + c` in a **single instruction** with **single rounding**:
- **AVX-FMA**: `VFMAADDPS`, `VFMAADDPD` (256-bit, 8x FP32 or 4x FP64)
- **AVX2-FMA**: Same, but with integer masked versions
- **Accuracy**: Single rounding gives better numerical precision than separate multiply+add

**LLM Impact:**
- **~15-25% throughput improvement** over separate MUL+ADD for dot products
- Each FMA instruction computes `8 x (a*b + c)` in one cycle on modern CPUs
- Critical for **quantized matmul kernels** — the core operation in LLM inference
- llama.cpp's FMA kernels are used in the **piledriver** variant and above
- On MSVC, FMA is **implied by AVX2/AVX512** and cannot be disabled separately

**CPU Compatibility:**
- Intel: Haswell (2013+) through all modern
- AMD: Excavator (2015), Zen (2017), all later
- **Not available** on pre-Haswell Intel or pre-Zen AMD

**When to enable/disable:**
- ✅ **Always enable** — it's implied by AVX2/AVX512 anyway
- ❌ Never manually disable; it's automatically enabled when AVX2 or AVX512 is on

---

### 2.5 GGML_F16C

| Property | Value |
|----------|-------|
| **Default** | ON (when GGML_NATIVE is OFF, not on MSVC) |
| **Introduced** | Intel Sandy Bridge (2011) |
| **Implied by** | AVX2, AVX512 (automatically available) |
| **Runtime check** | `f_1_ecx[29]` in `cpu-feats.cpp` |

**What it does:**
F16C provides **hardware half-precision (FP16) to/from single-precision (FP32) conversion**:
- `_mm_cvtps_ph()` — pack FP32 → FP16 (SSE4.1 style)
- `_mm_cvtph_ps()` — unpack FP16 → FP32
- `_mm_cvtss_sh()` — scalar FP32 → FP16
- `_mm_cvtsh_ss()` — scalar FP16 → FP32

**LLM Impact:**
- **Critical for f16/bf16 weight loading**: Converts between FP16 model weights and FP32 computation
- Without F16C, conversion falls back to **software emulation** (lookup tables or arithmetic)
- Software fallback is **~10-20x slower** than hardware F16C
- Used in the **ivybridge** variant and above
- Essential for llama.cpp's f16 matmul kernels

**CPU Compatibility:**
- Intel: Sandy Bridge (2011), Westmere (2011), all later
- AMD: Bulldozer (2011), all later
- **Not available** on pre-Sandy Bridge Intel or pre-Bulldozer AMD

**When to enable/disable:**
- ✅ **Always enable** — implied by AVX2/AVX512 on most compilers
- ❌ Disable only if targeting pre-2011 hardware

---

### 2.6 GGML_BMI2

| Property | Value |
|----------|-------|
| **Default** | ON (when GGML_NATIVE is OFF) |
| **Introduced** | Intel Broadwell / AMD Excavator (2014-2015) |
| **Required by** | haswell variant and above |
| **Runtime check** | `f_7_ebx[8]` in `cpu-feats.cpp` |

**What it does:**
BMI2 (Bit Manipulation Instruction Set 2) provides **enhanced bit manipulation**:
- **`BZHI`**: Bit extract (extract bits from position 0 to index)
- **`PDEP`**: Parallel bits deposit (scatter bits into result)
- **`PEXT`**: Parallel bits extract (gather bits from source)
- **`SHLX`, `SHRX`, `SARX`**: Variable-shift (no dependency on shift count)
- **`ANDN`**: Bitwise not-and (no dependency on first operand)

**LLM Impact:**
- **Significant impact on quantized data handling**: BMI2 is used in:
  - **Weight repacking** (`repack.cpp`): Converting Q4_0 to Q4_X_X formats
  - **Bit extraction** from quantized blocks: Extracting sub-byte values from packed representations
  - **Index computation** for sparse quantization schemes
- The `PDEP`/`PEXT` instructions are particularly useful for **bit-level data layout**
- On llama.cpp's repacking kernels, BMI2 can provide **2-3x speedup** over software bit manipulation
- **Not a SIMD instruction** — it's general-purpose bit manipulation that accelerates data preparation

**CPU Compatibility:**
- Intel: Broadwell (2014), all later
- AMD: Excavator (2015), Zen (2017), all later
- **Not available** on pre-Broadwell Intel or pre-Zen AMD

**When to enable/disable:**
- ✅ **Enable on any CPU from 2014+** (Intel Broadwell+, AMD Excavator+/Zen+)
- ❌ Disable only for maximum compatibility

---

### 2.7 GGML_AVX_VNNI

| Property | Value |
|----------|-------|
| **Default** | OFF |
| **Introduced** | Intel Alder Lake / Raptor Lake (2021-2022) |
| **Part of** | Intel AVX10 (first release) |
| **Runtime check** | `f_7_1_eax[4]` in `cpu-feats.cpp` |

**What it does:**
AVX-VNNI (AVX Vector Neural Network Instructions) brings **integer dot product** to **256-bit AVX registers**:
- **`VDPBSSD`**: Dot product of signed bytes, accumulate to dword (256-bit)
- **`VDPHSSD`**: Dot product of signed words, accumulate to dword (256-bit)
- Processes **32 x int8** dot products in a single 256-bit instruction
- **Alternative to AVX512-VNNI** on CPUs that don't support AVX512

**LLM Impact:**
- **2x throughput** over AVX2 for int8 dot products (32 vs 16 elements per instruction)
- Used in llama.cpp's **alderlake** variant for **quantized matmul acceleration**
- Particularly beneficial for **Alder Lake / Raptor Lake / Meteor Lake** consumer CPUs
- **Key advantage**: Works on consumer CPUs that lack AVX512 (most desktop/laptop CPUs)
- On Alder Lake P-cores, AVX-VNNI provides **~1.5-2x speedup** over AVX2 for quantized inference
- The `alderlake` variant in llama.cpp: `SSE42 + AVX + F16C + FMA + AVX2 + BMI2 + AVX_VNNI`

**CPU Compatibility:**
- Intel: Alder Lake (12th Gen, 2021), Raptor Lake (13th Gen, 2022), Meteor Lake (Core Ultra, 2023), Lunar Lake (Core Ultra 200S, 2024)
- Also available via **Intel oneAPI compiler** on older Xeons that support AVX2
- **Not available** on: Skylake, Ice Lake, Tiger Lake, or any pre-Alder Lake CPU
- **Not available** on AMD CPUs (AMD has its own integer matrix multiply via KleidiAI)

**When to enable/disable:**
- ✅ **Enable on Alder Lake+ consumer CPUs** — best option for desktop/laptop without AVX512
- ✅ **Enable on Xeon 6 / Granite Rapids** — works alongside AMX
- ❌ Disable on older CPUs (they don't have the instructions)
- ⚠️ On Alder Lake/Raptor Lake P-cores, AVX-VNNI throughput is **limited to 2 instructions/cycle** (same as AVX2), so the benefit is mainly from processing more elements per instruction

---

### 2.8 GGML_AVX512

| Property | Value |
|----------|-------|
| **Default** | OFF |
| **Introduced** | Intel Skylake-SP / Xeon Phi (2016) |
| **Full name** | AVX-512 Foundation (AVX512F) |
| **Required by** | All AVX512-variant extensions |
| **Runtime check** | `f_7_ebx[16]` in `cpu-feats.cpp` |

**What it does:**
AVX-512 Foundation introduces **512-bit wide SIMD registers** (ZMM0-ZMM31) and new capabilities:
- **512-bit registers**: 16x FP32 or 8x FP64 or 16x int32 per register
- **Mask registers**: K0-K7 for conditional execution
- **Compressed store**: `VCOMPRESSPS` / `VCOMPRESSPD`
- **Broadcast**: Single element broadcast to 512 bits
- **EVEX encoding**: More efficient instruction encoding

**LLM Impact:**
- **2x throughput** over AVX2 for floating-point operations (512 vs 256 bits)
- On Intel Xeon Scalable, AVX512 provides **~1.5-2x speedup** for LLM inference
- **Critical trade-off**: AVX512 can trigger **clock throttling** on many CPUs
  - Intel: Pre-Ice Lake Xeons downclock significantly under AVX512 load
  - AMD: Zen 4/5 also downclock under sustained AVX512
  - The throttling can **negate** the theoretical 2x speedup in practice
- llama.cpp's **skylakex** variant uses AVX512 for f16 matmul kernels
- For **quantized inference** (Q4_Q8), the benefit is more modest: **~10-30%**

**CPU Compatibility:**
- Intel: Skylake-SP (Xeon Scalable, 2017), Cascade Lake, Ice Lake, Sapphire Rapids, all server
- Intel: **NOT available** on consumer CPUs since Alder Lake (12th Gen+) — Intel dropped AVX512 from Core i-series
- AMD: Zen 4 (EPYC 9004, Ryzen 7000), Zen 5 (EPYC 9005, Ryzen 9000)
- **Not available** on: Skylake desktop, Coffee Lake, Comet Lake, Tiger Lake, or any consumer CPU before Zen 4

**When to enable/disable:**
- ✅ **Enable on server CPUs** (Xeon Scalable, EPYC 9004/9005) — the benefit is real
- ✅ **Enable on Zen 4/5 desktop** if your CPU doesn't throttle heavily
- ❌ **Disable on consumer CPUs** (Intel 12th-15th Gen, AMD Ryzen before Zen 4)
- ⚠️ **Test for throttling**: Run a benchmark with and without AVX512; if clocks drop >10%, the benefit may be minimal

---

### 2.9 GGML_AVX512_VBMI

| Property | Value |
|----------|-------|
| **Default** | OFF |
| **Introduced** | Intel Cannon Lake (2018) |
| **Full name** | AVX-512 Vector Bit Manipulation |
| **Runtime check** | `f_7_ecx[1]` in `cpu-feats.cpp` |

**What it does:**
AVX512-VBMI adds **bit manipulation** to 512-bit vectors:
- **`VPERMT2B`**: Permute bytes from two sources using indices
- **`VPERMB`**: Permute bytes within a single 512-bit register
- **`VPSHAB`**: Shift and blend bytes
- **`VPBMB`**: Pack and bitmask operations

**LLM Impact:**
- Enables **more efficient weight repacking** and **quantization format conversion**
- Allows **byte-level permutation** of quantized data without software loops
- Used in the **cannonlake**, **icelake**, **zen4**, and **sapphirerapids** variants
- The performance benefit is **modest** (~5-10%) and mostly visible in **data preparation** rather than matmul

**CPU Compatibility:**
- Intel: Cannon Lake (2018), Ice Lake (2019), all later server
- AMD: Zen 4 (2022), Zen 5 (2024)
- **Not available** on: Skylake-SP, Cascade Lake, Cooper Lake, or any pre-Cannon Lake Intel

**When to enable/disable:**
- ✅ **Enable on Cannon Lake+ Intel or Zen 4+ AMD**
- ❌ Disable on older CPUs

---

### 2.10 GGML_AVX512_VNNI

| Property | Value |
|----------|-------|
| **Default** | OFF |
| **Introduced** | Intel Ice Lake (2019) |
| **Full name** | AVX-512 Vector Neural Network Instructions |
| **Runtime check** | `f_7_ecx[11]` in `cpu-feats.cpp` |

**What it does:**
AVX512-VNNI brings **integer dot product** to 512-bit AVX512 registers:
- **`VDPBSSD`**: Dot product of 256 signed bytes, accumulate to 64 dwords (512-bit)
- **`VDPHSSD`**: Dot product of 128 signed words, accumulate to 64 dwords (512-bit)
- Each instruction computes **64 x int8 dot products** in one 512-bit instruction
- Part of **Intel Deep Learning Boost** (DL Boost)

**LLM Impact:**
- **2x throughput** over AVX-VNNI (64 vs 32 elements per instruction)
- **The most impactful instruction set for quantized LLM inference** on server CPUs
- llama.cpp's **cascadelake**, **icelake**, **cooperlake**, **zen4**, and **sapphirerapids** variants use it
- For quantized matmul (Q4_Q8), AVX512-VNNI can provide **~2-3x speedup** over AVX2
- On Sapphire Rapids, combined with AMX, it provides excellent performance for **INT8/INT4 inference**
- The `VDPBSSD` instruction is the **workhorse** for quantized matrix multiplication

**CPU Compatibility:**
- Intel: Ice Lake (Xeon Scalable 3rd Gen, 2019), Cascade Lake (with microcode update), Cooper Lake, Sapphire Rapids, all later
- AMD: Zen 4 (EPYC 9004, 2022), Zen 5 (EPYC 9005, 2024)
- **Not available** on: Skylake-SP, Cascade Lake (without update), or any pre-Ice Lake Intel

**When to enable/disable:**
- ✅ **Enable on Ice Lake+ Intel or Zen 4+ AMD** — the single best optimization for quantized inference on servers
- ✅ **Enable on Zen 4 desktop** (Ryzen 9000) if your CPU doesn't throttle
- ❌ Disable on older CPUs

---

### 2.11 GGML_AVX512_BF16

| Property | Value |
|----------|-------|
| **Default** | OFF |
| **Introduced** | Intel Cooper Lake (2020) / AMD Zen 4 (2022) |
| **Full name** | AVX-512 Brain Float 16 |
| **Runtime check** | `f_7_1_eax[5]` in `cpu-feats.cpp` |

**What it does:**
AVX512-BF16 provides **hardware BF16 (Brain Float 16) support**:
- **`VDPBF16PS`**: Dot product of 32 BF16 pairs, accumulate to 16 FP32 results
- **`VCVTNE2PS2BF16`**: Convert 32 FP32 → 32 BF16 (two packed FP32 to one BF16)
- **`VCVTNEPS2BF16`**: Convert 16 FP32 → 16 BF16
- BF16 has **8 exponent bits** (same range as FP32) but only **7 mantissa bits** (vs FP16's 10)

**LLM Impact:**
- **Native BF16 matmul** without FP32 conversion overhead
- **~1.5-2x speedup** for f16/bf16 weight inference over FP32-only paths
- Used in **cooperlake**, **zen4**, and **sapphirerapids** variants
- BF16 is **better suited for deep learning** than FP16 because:
  - Same dynamic range as FP32 (8 exponent bits)
  - No overflow/underflow issues in training/inference
  - Lower precision than FP32 but sufficient for most LLM operations
- llama.cpp can use BF16 for **f16 weight kernels** when this is enabled

**CPU Compatibility:**
- Intel: Cooper Lake (2020), Sapphire Rapids (2023), Emerald Rapids (2024), all later
- AMD: Zen 4 (EPYC 9004, 2022), Zen 5 (EPYC 9005, 2024)
- **Not available** on: Skylake-SP, Cascade Lake, Ice Lake, or any pre-Cooper Lake Intel

**When to enable/disable:**
- ✅ **Enable on Cooper Lake+ Intel or Zen 4+ AMD** — significant benefit for BF16/f16 workloads
- ❌ Disable on older CPUs

---

### 2.12 GGML_AMX_TILE

| Property | Value |
|----------|-------|
| **Default** | OFF |
| **Introduced** | Intel Sapphire Rapids (2023) |
| **Full name** | AMX Tile Configuration |
| **Runtime check** | `f_7_edx[24]` in `cpu-feats.cpp` |

**What it does:**
AMX-TILE provides the **tile register infrastructure** for AMX:
- **8 tile registers** (TMM0-TMM7), each 1KB (16 rows x 64 bytes)
- **TILECFG**: Configure tile dimensions (row count, column count)
- **TILELOAD**: Load data from memory into tiles
- **TILEDISCARD**: Discard tile contents
- Tiles store **2D matrix data** for the TMUL accelerator

**LLM Impact:**
- **Foundation for AMX acceleration**: Without tile support, the TMUL accelerator cannot operate
- Enables **massive throughput** for matrix operations:
  - INT8: 16 x 64 = 1024 elements per tile
  - BF16: 16 x 32 = 512 elements per tile
- The **Tile Matrix Multiply Unit (TMUL)** performs matrix multiply-accumulate on tile data
- On Sapphire Rapids, AMX can achieve **4-8x throughput** over scalar AVX-512F FP32 for large GEMM
- llama.cpp's **sapphirerapids** variant uses AMX for **f16 matmul** kernels
- AMX is **especially effective** for large batch sizes and long context inference

**CPU Compatibility:**
- Intel: Sapphire Rapids (Xeon 4th Gen, 2023), Emerald Rapids (Xeon 5th Gen, 2024), Granite Rapids (Xeon 6th Gen, 2024)
- **Not available** on: Any consumer CPU, any pre-Sapphire Rapids server CPU
- **Intel-only**: AMD does not have an AMX equivalent (AMD uses different approaches)

**When to enable/disable:**
- ✅ **Enable on Sapphire Rapids+ Xeon** — the single biggest performance boost for server LLM inference
- ❌ Disable on all other CPUs (they don't have the instructions)

---

### 2.13 GGML_AMX_INT8

| Property | Value |
|----------|-------|
| **Default** | OFF |
| **Introduced** | Intel Sapphire Rapids (2023) |
| **Full name** | AMX INT8 Matrix Extension |
| **Runtime check** | `f_7_edx[25]` in `cpu-feats.cpp` |

**What it does:**
AMX-INT8 enables **INT8 matrix multiply-accumulate** on the TMUL:
- **`TMMMA`**: Tile matrix multiply-accumulate for INT8
- Each tile operation: `(A 16x64 INT8) × (B 64xN INT8) → C 16xN INT32`
- Processes **1024 INT8 multiply-accumulate operations** per instruction
- Accumulates to **INT32** for full precision

**LLM Impact:**
- **The fastest path for INT8/INT4 quantized inference** on Intel server CPUs
- For llama.cpp's quantized models (Q4_0, Q4_1, Q5_0, etc.), AMX-INT8 provides:
  - **~4-8x speedup** over AVX2 for large matrix operations
  - **~2-4x speedup** over AVX512-VNNI for the same work
- Used in the **sapphirerapids** variant
- Particularly effective for:
  - **Prompt evaluation** (large batch size)
  - **Long context inference** (repeated matmul operations)
  - **MoE (Mixture of Experts)** models (many small matmuls)
- AMX-INT8 is the **primary reason** to build the sapphirerapids variant

**CPU Compatibility:**
- Intel: Sapphire Rapids (2023), Emerald Rapids (2024), Granite Rapids (2024)
- **Intel-only**

**When to enable/disable:**
- ✅ **Enable on Sapphire Rapids+ Xeon** — essential for maximum INT8/INT4 performance
- ❌ Disable on all other CPUs

---

### 2.14 GGML_AMX_BF16

| Property | Value |
|----------|-------|
| **Default** | OFF |
| **Introduced** | Intel Sapphire Rapids (2023) |
| **Full name** | AMX BF16 Matrix Extension |
| **Runtime check** | `f_7_edx[22]` in `cpu-feats.cpp` |

**What it does:**
AMX-BF16 enables **BF16 matrix multiply-accumulate** on the TMUL:
- **`TMMMA`**: Tile matrix multiply-accumulate for BF16
- Each tile operation: `(A 16x32 BF16) × (B 32xN BF16) → C 16xN BF16`
- Processes **512 BF16 multiply-accumulate operations** per instruction
- Accumulates to **BF16** (same precision as inputs)

**LLM Impact:**
- **Fastest path for BF16/f16 inference** on Intel server CPUs
- For llama.cpp's f16 weight kernels, AMX-BF16 provides:
  - **~4-6x speedup** over AVX512-FP32 for large matrix operations
  - **~2-3x speedup** over AVX512-BF16 for the same work
- Used in the **sapphirerapids** variant
- BF16 is preferred over FP16 for LLM inference because:
  - Same dynamic range as FP32 (no overflow in attention scores)
  - Native hardware support on Sapphire Rapids+
  - Better numerical stability for transformer attention

**CPU Compatibility:**
- Intel: Sapphire Rapids (2023), Emerald Rapids (2024), Granite Rapids (2024)
- **Intel-only**
- Note: AMX-FP16 (FP16 input type) is documented for Granite Rapids but not yet widely available

**When to enable/disable:**
- ✅ **Enable on Sapphire Rapids+ Xeon** — essential for BF16/f16 workloads
- ❌ Disable on all other CPUs

---

## 3. Build Variant Hierarchy

### Complete Variant Map (from `ggml/src/CMakeLists.txt`, lines 379-401)

```
x64                          — baseline x86_64, no special ISA
sse42                        — SSE4.2 only
sandybridge                  — SSE4.2 + AVX
ivybridge                    — SSE4.2 + AVX + F16C
piledriver                   — SSE4.2 + AVX + F16C + FMA
haswell                      — SSE4.2 + AVX + F16C + FMA + AVX2 + BMI2
skylakex                     — haswell + AVX512
cannonlake                   — skylakex + AVX512_VBMI
cascadelake                  — skylakex + AVX512_VNNI
icelake                      — cannonlake + AVX512_VNNI
cooperlake                   — icelake + AVX512_BF16
zen4                         — icelake + AVX512_BF16 + AVX512_VBMI
alderlake                    — haswell + AVX_VNNI
sapphirerapids               — zen4 + AMX_TILE + AMX_INT8
```

### Recommended Variants by Use Case

| Use Case | Recommended Variant | CMake Flags |
|----------|-------------------|-------------|
| **Build on target machine** | `x64` (GGML_NATIVE=ON) | `-DGGML_NATIVE=ON` |
| **Distribute to modern desktops** | `haswell` | `-DGGML_NATIVE=OFF` |
| **Distribute to all x86_64** | All variants | `-DGGML_CPU_ALL_VARIANTS=ON -DGGML_BACKEND_DL=ON` |
| **Intel server (Sapphire Rapids+)** | `sapphirerapids` | `-DGGML_NATIVE=OFF -DGGML_AVX512=ON -DGGML_AMX_TILE=ON` |
| **Intel server (Ice Lake-Cascade)** | `icelake` | `-DGGML_NATIVE=OFF -DGGML_AVX512=ON -DGGML_AVX512_VNNI=ON` |
| **Intel consumer (12th-15th Gen)** | `alderlake` | `-DGGML_NATIVE=OFF -DGGML_AVX_VNNI=ON` |
| **AMD Zen 4/5** | `zen4` | `-DGGML_NATIVE=OFF -DGGML_AVX512=ON -DGGML_AVX512_VNNI=ON` |

---

## 4. Performance Summary

### Relative Performance by Instruction Set Level

| Instruction Set Level | Relative Throughput (Quantized) | Relative Throughput (FP16) | Notes |
|----------------------|--------------------------------|---------------------------|-------|
| SSE4.2 | 1.0x (baseline) | 1.0x | Universal compatibility, slowest |
| SSE4.2 + AVX | 1.3-1.5x | 1.3-1.5x | 2x FP32 throughput |
| SSE4.2 + AVX + FMA | 1.5-1.8x | 1.5-1.8x | Fused multiply-add |
| + AVX2 + BMI2 (Haswell) | 2.0-2.5x | 2.0-2.5x | Sweet spot for most desktops |
| + AVX-VNNI (Alder Lake) | 2.5-3.5x | 2.0-2.5x | Best for Intel consumer 12th-15th Gen |
| + AVX512 (Skylake-SP) | 2.5-3.5x | 2.5-3.5x | Server CPUs, watch for throttling |
| + AVX512-VNNI (Ice Lake+) | 3.5-5.0x | 3.0-4.0x | Best for quantized on servers |
| + AVX512-BF16 (Cooper Lake+) | 3.5-5.0x | 4.0-6.0x | Best for BF16/f16 on servers |
| + AMX (Sapphire Rapids+) | 5.0-10.0x | 6.0-12.0x | Server-only, massive speedup |

### Key Performance Observations

1. **AVX512 throttling is real**: On many Intel server CPUs (pre-Ice Lake), AVX512 can trigger 20-40% clock downclocking under sustained load. This can **negate** the theoretical throughput advantage. Ice Lake and later have better AVX512 handling.

2. **AMX is game-changing for servers**: On Sapphire Rapids, AMX can deliver **4-8x throughput** over scalar AVX-512 for large GEMM operations. This makes it the single most impactful instruction set for server-side LLM inference.

3. **AVX-VNNI is the consumer sweet spot**: Since Intel dropped AVX512 from consumer CPUs (12th Gen+), AVX-VNNI is the best option for Alder Lake/Raptor Lake/Meteor Lake. It provides meaningful speedup without the throttling issues of AVX512.

4. **Diminishing returns**: Going from AVX2 to AVX512-VNNI gives ~2x speedup, but going from AVX512-VNNI to AMX gives another ~2x. Each level adds complexity and reduces compatibility.

5. **Memory bandwidth often becomes the bottleneck**: On large models, the GPU/memory bandwidth limits inference speed more than CPU instruction sets. AMX helps because it can process more data per memory transaction.

---

## 5. Recommendations

### For Building llama.cpp

1. **For local use on your own machine**:
   ```bash
   cmake -B build -DGGML_NATIVE=ON
   ```
   This auto-detects your CPU and uses all available instructions.

2. **For distributing to modern desktops (2013+)**:
   ```bash
   cmake -B build -DGGML_NATIVE=OFF
   ```
   This enables SSE42, AVX, AVX2, BMI2, FMA, F16C — covers 95%+ of x86_64 systems.

3. **For maximum compatibility (single binary)**:
   ```bash
   cmake -B build -DGGML_CPU_ALL_VARIANTS=ON -DGGML_BACKEND_DL=ON
   ```
   This builds all variants and uses runtime dispatch to pick the best one.

4. **For Intel Sapphire Rapids+ servers**:
   ```bash
   cmake -B build -DGGML_NATIVE=OFF \
     -DGGML_AVX512=ON -DGGML_AVX512_VBMI=ON -DGGML_AVX512_VNNI=ON \
     -DGGML_AVX512_BF16=ON -DGGML_AMX_TILE=ON -DGGML_AMX_INT8=ON
   ```

5. **For Intel consumer 12th-15th Gen**:
   ```bash
   cmake -B build -DGGML_NATIVE=OFF -DGGML_AVX_VNNI=ON
   ```

### When to Enable/Disable Each Parameter

| Parameter | Always Enable | Never Enable | Test First |
|-----------|--------------|--------------|------------|
| `GGML_SSE42` | All x86_64 builds | N/A | N/A |
| `GGML_AVX` | 2011+ CPUs | Pre-2011 Intel/AMD | N/A |
| `GGML_AVX2` | 2013+ Intel / 2015+ AMD | Pre-Haswell / Pre-Zen | N/A |
| `GGML_FMA` | 2013+ Intel / 2015+ AMD | Pre-Haswell / Pre-Zen | N/A (implied by AVX2) |
| `GGML_F16C` | 2011+ Intel / 2011+ AMD | Pre-Sandy Bridge / Pre-Bulldozer | N/A (implied by AVX2) |
| `GGML_BMI2` | 2014+ Intel / 2015+ AMD | Pre-Broadwell / Pre-Zen | N/A |
| `GGML_AVX_VNNI` | Alder Lake+ Intel | Pre-Alder Lake Intel, AMD | N/A |
| `GGML_AVX512` | Server Xeons, Zen 4/5 | Intel consumer 12th-15th Gen | Test throttling |
| `GGML_AVX512_VBMI` | Cannon Lake+ Intel, Zen 4+ | Pre-Cannon Lake Intel, Pre-Zen 4 | N/A |
| `GGML_AVX512_VNNI` | Ice Lake+ Intel, Zen 4+ | Pre-Ice Lake Intel, Pre-Zen 4 | N/A |
| `GGML_AVX512_BF16` | Cooper Lake+ Intel, Zen 4+ | Pre-Cooper Lake Intel, Pre-Zen 4 | N/A |
| `GGML_AMX_TILE` | Sapphire Rapids+ Xeon | All other CPUs | N/A |
| `GGML_AMX_INT8` | Sapphire Rapids+ Xeon | All other CPUs | N/A |
| `GGML_AMX_BF16` | Sapphire Rapids+ Xeon | All other CPUs | N/A |

---

## Appendix: Runtime Feature Detection

llama.cpp detects CPU features at runtime using the `cpuid` instruction. The key detection code is in `ggml/src/ggml-cpu/arch/x86/cpu-feats.cpp`:

```cpp
// Key cpuid leaf/function mappings:
// Leaf 1, ECX bit 28: AVX
// Leaf 1, ECX bit 29: F16C
// Leaf 1, ECX bit 12: FMA
// Leaf 1, ECX bit 20: SSE4.2
// Leaf 7, EBX bit 5: AVX2
// Leaf 7, EBX bit 8: BMI2
// Leaf 7, EBX bit 16: AVX512F
// Leaf 7, EBX bit 30: AVX512BW
// Leaf 7, EBX bit 31: AVX512VL
// Leaf 7, ECX bit 1: AVX512_VBMI
// Leaf 7, ECX bit 11: AVX512_VNNI
// Leaf 7, EDX bit 22: AMX_BF16
// Leaf 7, EDX bit 24: AMX_TILE
// Leaf 7, EDX bit 25: AMX_INT8
// Leaf 7, Sub-leaf 1, EAX bit 4: AVX_VNNI
// Leaf 7, Sub-leaf 1, EAX bit 5: AVX512_BF16
```

The `ggml_cpu_has_*()` API functions (in `ggml/src/ggml-cpu/ggml-cpu.c`, lines 3552-3610) provide runtime queries that the dispatch system uses to select the optimal kernel at runtime.

---

## Sources

1. llama.cpp source code: `ggml/src/CMakeLists.txt`, `ggml/src/ggml-cpu/CMakeLists.txt`, `ggml/src/ggml-cpu/arch/x86/cpu-feats.cpp`, `ggml/src/ggml-cpu/ggml-cpu.c`, `ggml/src/ggml-cpu/ggml-cpu.cpp`
2. Intel® Deep Learning Boost documentation: https://www.intel.com/content/www/us/en/developer/articles/technical/intel-deep-learning-boost-new-instruction-bfloat16.html
3. Intel AMX documentation: https://www.intel.com/content/www/us/en/products/docs/accelerator-engines/what-is-intel-amx.html
4. Phoronix: Intel AMX Performance Review: https://www.phoronix.com/review/intel-xeon-amx
5. Wikipedia: AVX-512, Advanced Matrix Extensions, SSE4, x86 Bit Manipulation
6. Reddit r/LocalLLaMA: AVX512 vs AVX2 benchmarks, GGML_NATIVE discussions
7. justine.lol: "LLaMA Now Goes Faster on CPUs" — AVX512 performance analysis
8. Intel AVX10 specification (AVX-VNNI as part of AVX10 first release)
