#!/bin/bash

#----------------------------
# DOCS
#----------------------------

#----------------------------
# MODEL CONFIGS
#----------------------------
MODEL=Qwen3.6-27B-Q8_0.gguf
# MODEL=Qwen3.6-27B-Q8_0.gguf
# MODEL=Qwen3.6-35B-A3B-Q8_0.gguf

#----------------------------
# BENCHMARK CONFIGS
#----------------------------

# READ THE MANUAL BEFORE PLAYING WITH SETTINGS!!!

# QUICK TEST CONFIGS
#------------------------------------------------
# MAIN_GPU=0
# T_SPLIT=16,12,12
# SPLIT_MODE=layer
# LAYER_OFFLOAD=999

# FIT_MIN_CTX=131072
# FIT_TARGET=512
# MEMORY_MAP=1

# BATCH_S=256,512,1024
# UBATCH_S=128,256,512

# EXTENSIVE TESTS CONFIGS
#------------------------------------------------
PROMPT_SIZE=256,512,1024,2048 # default=512
GEN_SIZE=256,512,1024 # default=128

MAIN_GPU=0
T_SPLIT=16,12,12
SPLIT_MODE=tensor
LAYER_OFFLOAD=999

CPU_THREADS=8
CPU_STRICT=1

BATCH_S=256,512,1024,2048,4096,8192
UBATCH_S=128,256,512,1024,2048

FLASH_ATTENTION=1

#----------------------------
# ENV VALS
#----------------------------
# llama-bench does not update these automatically while benchmarking. The benchmark must be restarted manually after changing these values

CUDA_LAUNCH_QUEUE_SIZE=4x
CUDA_UNIFIED_MEMORY=1 

#----------------------------
# BENCHMARK SCRIPT - DO NOT MODIFY UNLESS NEEDED, USE VARIABLES ABOVE
#----------------------------
export PATH=/usr/local/cuda-13.2/bin${PATH:+:${PATH}}
export CUDACXX=$(which nvcc)
# export GGML_CUDA_P2P=1
export CUDA_SCALE_LAUNCH_QUEUES=$CUDA_LAUNCH_QUEUE_SIZE
export LLAMA_CACHE=$HOME/.llama_cache
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=$CUDA_UNIFIED_MEMORY

MODEL_DIR=$HOME/.llm_models
CURRENT_DIR=$(pwd)

systemctl --user stop llama.service

cd $CURRENT_DIR
cd llama.cpp/build/bin/

# Run Benchmark
#------------------------------------------------
./llama-bench -m $MODEL_DIR/$MODEL -ngl $LAYER_OFFLOAD --split-mode $SPLIT_MODE --tensor-split $T_SPLIT --main-gpu $MAIN_GPU --batch-size $BATCH_S --ubatch-size $UBATCH_S --threads $CPU_THREADS --cpu-strict $CPU_STRICT --flash-attn $FLASH_ATTENTION
