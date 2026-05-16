#!/bin/bash
model=Qwen3.5-35B-A3B-MXFP4_MOE.gguf

# Host Configs
port=11434
host=100.115.205.84

# Hardware Configs
mainGpu=0
tensorSplit=8
splitMode=layer
threads=8

# Model Configs
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
export CUDA_SCALE_LAUNCH_QUEUES=16x 
export LLAMA_CACHE=$MODEL_CACHE
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export CUDACXX=$(which nvcc)
export LLAMA_ARG_FIT=on
export LLAMA_ARG_FIT_TARGET=512

./llama-server -m $MODEL_DIR/$model --port $port --host $host -c $context -ngl 999 --main-gpu $mainGpu --temp $temp --top-p $topP --cont-batching --min-p $minP --top-k $topK --kv-unified --cache-type-k iq4_nl --cache-type-v iq4_nl --parallel 1  --batch-size 256 --ubatch-size 256  --threads $threads --cpu-strict 1 --cpu-range 0-7 --cpu-strict-batch 1 --threads-batch 8 --presence-penalty 1.0 --chat-template-kwargs '{"enable_thinking":true}' -fa on 