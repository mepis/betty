#!/bin/bash
model=Qwen3.5-122B-A10B-UD-IQ2_XXS.gguf

# Host Configs
port=11434
host=100.106.131.63

# Hardware Configs
mainGpu=0
tensorSplit=16,12,12
splitMode=layer
threads=8

# Model Configs
context=131072
temp=0.6
topP=0.95
minP=0.00
topK=20

####################
MODEL_DIR=$HOME/.llm_models
CURRENT_DIR=$(pwd)
cd $CURRENT_DIR
cd llama.cpp/build/bin/

# export CUDA_SCALE_LAUNCH_QUEUES=8x 
export LLAMA_CACHE=$modelDir
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export CUDACXX=$(which nvcc)

./llama-server -m $MODEL_DIR/$model --port $port --host $host -c $context -ngl 999 --split-mode $splitMode --tensor-split $tensorSplit --main-gpu $mainGpu --temp $temp --top-p $topP --cont-batching --min-p $minP --top-k $topK --threads $threads --prio 2 --cpu-range 0-7 --cpu-strict 1 --swa-full --kv-unified --cache-type-k q2_0 --cache-type-v q2_0 --batch-size 4096 --ubatch-size 1024 --chat-template-kwargs '{"enable_thinking":false}' --presence-penalty 1 --repeat-penalty 1