#!/bin/bash

#----------------------------
# DOCS
#----------------------------

#----------------------------
# MODEL CONFIGS
#----------------------------
MODEL=Qwen3.6-35B-A3B-MXFP4_MOE.gguf
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
PROMPT_SIZE=256,512,1024,32768 # default=512
GEN_SIZE=128,256,512,1024,8192 # default=128
TEST_REPITITIONS=3 #default=5

MAIN_GPU=0
T_SPLIT=8
SPLIT_MODE=layer
LAYER_OFFLOAD=999

# common contet size windows: 16384, 32768, 65536, 131072, 262144, 524288
FIT_MIN_CTX=131072
FIT_TARGET=512
MEMORY_MAP=0,1

CPU_THREADS=2,4,6,8,10,12,14,16,18,20
CPU_STRICT=0,1
POLL_RATE=20,50,70 # default=50

BATCH_S=256,512,1024,2048,4096,8192
UBATCH_S=128,256,512,1024,2048

FLASH_ATTENTION=0,1

# valid values: q8_0, q4_0, q4_1, q5_0, q5_1, iq4_nl
K_CACHE_TYPE=q8_0,q4_0
V_CACHE_TYPE=q8_0,q4_0


#----------------------------
# ENV VALS
#----------------------------
# llama-bench does not update these automatically while benchmarking. The benchmark must be restarted manually after changing these values

CUDA_LAUNCH_QUEUE_SIZE=4x # Do not over do this, will cause memory issues and crash the system
CUDA_UNIFIED_MEMORY=1 # set to 0 for single GPU machines

#----------------------------
# BENCHMARK SCRIPT - DO NOT MODIFY UNLESS NEEDED, USE VARIABLES ABOVE
#----------------------------
# export PATH=/usr/local/cuda-13.2/bin${PATH:+:${PATH}}
export CUDACXX=$(which nvcc)
# export CUDA_SCALE_LAUNCH_QUEUES=$CUDA_LAUNCH_QUEUE_SIZE
export LLAMA_CACHE=$HOME/.llama_cache
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=$CUDA_UNIFIED_MEMORY

MODEL_DIR=$HOME/.llm_models
CURRENT_DIR=$(pwd)

systemctl --user stop llama.service

cd $CURRENT_DIR
cd llama.cpp/build/bin/

# QUICK TEST
#------------------------------------------------
# ./llama-bench -m $MODEL_DIR/$MODEL -ngl $LAYER_OFFLOAD --split-mode $SPLIT_MODE --tensor-split $T_SPLIT --main-gpu $MAIN_GPU --batch-size $BATCH_S --ubatch-size $UBATCH_S --fit-target $FIT_TARGET --fit-ctx $FIT_MIN_CTX 

# EXTENSIVE TESTS CONFIGS
#------------------------------------------------
./llama-bench -m $MODEL_DIR/$MODEL --main-gpu $MAIN_GPU --batch-size $BATCH_S --ubatch-size $UBATCH_S --fit-target $FIT_TARGET --repetitions $TEST_REPITITIONS --threads $CPU_THREADS --cpu-strict $CPU_STRICT --flash-attn $FLASH_ATTENTION --n-prompt $PROMPT_SIZE --n-gen $GEN_SIZE --output csv > results.csv --mmap $MEMORY_MAP --poll $POLL_RATE --output-err csv > results_errors.csv --list-devices

