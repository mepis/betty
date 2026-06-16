#!/bin/bash

# Host Configs
PORT=11434
HOST=100.105.3.99

MMPROJ=mmproj-BF16.gguf

# Hardware Configs
THREADS=18
CPU_STRICT=0
CPU_RANGE=0-17
PARALLEL=4
LAYERS=999
MOE_CPU_LAYERS=24

# Model Configs
CONTEXT=65536
TEMP=0.6
TOP_P=0.95
MIN_P=0.00
TOP_K=20
REASONING=on
FA=on
BATCH=1024
UBATCH=256
PRESENCE_PENALTY=1.0

# valid values: q8_0, q4_0, q4_1, q5_0, q5_1, iq4_nl
K_CACHE_TYPE=q8_0
V_CACHE_TYPE=q8_0

####################
MODEL_CACHE=$HOME/.llama_cache
MODEL_DIR=$HOME/.llm_models
CURRENT_DIR=$(pwd)
cd $CURRENT_DIR
cd llama.cpp/build/bin/

# export LLAMA_ARG_MLOCK=on
export CUDA_SCALE_LAUNCH_QUEUES=4x 
export LLAMA_CACHE=$MODEL_CACHE
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export CUDACXX=$(which nvcc)
export PATH=/opt/intel/oneapi/2025.2/bin:/opt/intel/oneapi/compiler/latest/lib/${PATH:+:${PATH}}
source /opt/intel/oneapi/setvars.sh

####################
MODEL_DIR=$HOME/.llm_models
CURRENT_DIR=$(pwd)
cd $CURRENT_DIR
cd llama.cpp/build/bin/

# export LLAMA_ARG_MLOCK=on
export LLAMA_CACHE=$modelDir
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export CUDACXX=$(which nvcc)
# export LLAMA_ARG_FIT=on
# export LLAMA_ARG_FIT_TARGET=512
# export LLAMA_ARG_FIT_CTX=131072

./llama-server --models-dir $MODEL_DIR --models-autoload --models-max 2 --mmproj $MODEL_DIR/$MMPROJ --sleep-idle-seconds 300 --port $PORT --host $HOST -c $CONTEXT -ngl $LAYERS --temp $TEMP --top-p $TOP_P --cont-batching --min-p $MIN_P --kv-unified  --parallel $PARALLEL  --batch-size $BATCH --ubatch-size $UBATCH --threads $THREADS --cpu-strict $CPU_STRICT --cpu-range $CPU_RANGE --cpu-strict-batch $CPU_STRICT --threads-batch $THREADS --presence-penalty $PRESENCE_PENALTY --reasoning $REASONING -fa $FA  --cache-type-k $K_CACHE_TYPE --cache-type-v $V_CACHE_TYPE --n-cpu-moe $MOE_CPU_LAYERS --no-mmap 