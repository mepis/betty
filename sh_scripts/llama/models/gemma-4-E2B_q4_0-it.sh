#!/bin/bash
model=gemma-4-E2B_q4_0-it.gguf
mmproj=mmproj-F16.gguf

# Host Configs
port=11434
host=100.105.3.99

# Model Configs
# common contet size windows: 16384, 32768, 65536, 131072, 262144, 524288
context=65536
temp=1.0
topP=0.95
minP=0.00
topK=64

####################
MODEL_CACHE=$HOME/.llama_cache
MODEL_DIR=$HOME/.llm_models
CURRENT_DIR=$(pwd)
cd $CURRENT_DIR
cd llama.cpp/build/bin/

export CUDA_SCALE_LAUNCH_QUEUES=4
export LLAMA_CACHE=$MODEL_CACHE
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export CUDACXX=$(which nvcc)
export LLAMA_ARG_FIT=on

./llama-server -m $MODEL_DIR/$model --port $port --host $host -c $context -ngl 999 --cont-batching --temp $temp --top-p $topP --min-p $minP --top-k $topK --batch-size 256 --ubatch-size 256 --flash-attn 1 --reasoning 1 -e --presence-penalty 0.0 --reasoning-budget 2048 --reasoning-budget-message "Proceed to final answer." --cache-ram 0 --rope-scaling yarn --parallel 1


