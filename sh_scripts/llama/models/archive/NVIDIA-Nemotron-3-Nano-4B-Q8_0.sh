#!/bin/bash
model=NVIDIA-Nemotron-3-Nano-4B-Q8_0.gguf

# Host Configs
port=11434
host=100.103.210.3

# Hardware Configs
mainGpu=0
threads=20

# Model Configs
context=131072
temp=0.6
topP=0.95

####################
MODEL_DIR=$HOME/.llm_models
CURRENT_DIR=$(pwd)
cd $CURRENT_DIR
cd llama.cpp/build/bin/

# export CUDA_SCALE_LAUNCH_QUEUES=16x 
export LLAMA_CACHE=$modelDir
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export CUDACXX=$(which nvcc)
export LLAMA_ARG_FIT=on
export LLAMA_ARG_FIT_TARGET=512
export LLAMA_ARG_FIT_CTX=131072


./llama-server -m $MODEL_DIR/$model --port $port --host $host -c $context -ngl 999 --main-gpu $mainGpu --temp $temp --top-p $topP --cont-batching  --kv-unified --cache-type-k q8_0 --cache-type-v q8_0 --batch-size 1024 --ubatch-size 256  --parallel 4 --threads $threads --cpu-range 0-7 --cpu-strict-batch 1 --threads-batch 8 --special --seed 3407

# --repeat-penalty 1.0 --chat-template-kwargs '{"enable_thinking":true}' --presence-penalty 1.5