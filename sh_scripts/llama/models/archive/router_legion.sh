#!/bin/bash
export CUDA_SCALE_LAUNCH_QUEUES=2x 
export LLAMA_CACHE=$HOME/.llm_models
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export CUDACXX=$(which nvcc)
export LLAMA_ARG_FIT=on
export LLAMA_ARG_FIT_TARGET=512
export LLAMA_ARG_FIT_CTX=65536

# Host Configs
port=11434
host=100.103.210.3

# Hardware Configs
mainGpu=0
splitMode=layer
threads=8
PARALLEL=2

# Model Configs
context=65536
temp=0.6
topP=0.95
minP=0.00
topK=20
BATCH=128
UBATCH=256

####################
MODEL_DIR=$HOME/.llm_models
CACHE=$HOME/.llama_cache
CURRENT_DIR=$(pwd)
cd $CURRENT_DIR
cd llama.cpp/build/bin/

./llama-server --models-dir $MODEL_DIR --models-autoload --models-max 1 --sleep-idle-seconds 30 --port $port --host $host -c $context -ngl 999 --split-mode $splitMode --main-gpu $mainGpu --temp $temp --top-p $topP --cont-batching --min-p $minP --top-k $topK --threads $threads --kv-unified --cache-type-k q8_0 --cache-type-v q8_0 --batch-size $BATCH --ubatch-size $UBATCH --chat-template-kwargs '{"enable_thinking":true}' --parallel $PARALLEL --presence-penalty 1.5 --fit-target 512 --fit-ctx 65536

# --repeat-penalty 1.0 --presence-penalty 1.5 (1.0 - 1.5)  Use if looping is a problem