#!/bin/bash

# Host Configs
port=11433
host=10.16.2.209

MMPROJ=mmproj-BF16.gguf

# Hardware Configs
mainGpu=0
tensorSplit=16,12,12
splitMode=layer
threads=8

# Model Configs
# common contet size windows: 16384, 32768, 65536, 131072, 262144, 524288
context=65536
temp=0.6
topP=0.95
minP=0.00
topK=20

# valid values: q8_0, q4_0, q4_1, q5_0, q5_1, iq4_nl
K_CACHE_TYPE=q8_0
V_CACHE_TYPE=q8_0

####################
MODEL_CACHE=$HOME/.llama_cache
MODEL_DIR=$HOME/.llm_models
CURRENT_DIR=$(pwd)
cd $CURRENT_DIR
cd llama.cpp/build/bin/

export LLAMA_ARG_MLOCK=on
export CUDA_SCALE_LAUNCH_QUEUES=4x 
export LLAMA_CACHE=$MODEL_CACHE
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export CUDACXX=$(which nvcc)

./llama-server --models-dir $MODEL_DIR --models-autoload --models-max 2 --sleep-idle-seconds 60 --mmproj $MODEL_DIR/$MMPROJ --port $port --host $host -c $context -ngl 999 --cont-batching --temp $temp --top-p $topP  --min-p $minP --top-k $topK --batch-size 1024 --ubatch-size 256 --kv-unified --flash-attn on --reasoning on --cpu-range 0-7 --cpu-strict-batch 1 --threads-batch 8 --threads $threads --cpu-strict 1 --prio 2 --cache-type-k $K_CACHE_TYPE --cache-type-v $V_CACHE_TYPE --split-mode tensor -e --presence-penalty 0.0

