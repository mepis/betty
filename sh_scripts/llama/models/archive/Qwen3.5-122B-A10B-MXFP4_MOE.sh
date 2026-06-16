#!/bin/bash
model=Qwen3.5-122B-A10B-MXFP4_MOE-00001-of-00003.gguf

# Host Configs
port=11434
host=100.106.131.63

# Hardware Configs
mainGpu=0
tensorSplit=16,12,12
splitMode=layer
threads=20

# Model Configs
context=65536
temp=0.6
topP=0.95
minP=0.00
topK=20

####################
MODEL_DIR=$HOME/.llm_models
CURRENT_DIR=$(pwd)
cd $CURRENT_DIR
cd llama.cpp/build/bin/

export CUDA_SCALE_LAUNCH_QUEUES=8x 
export LLAMA_CACHE=$modelDir
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export CUDACXX=$(which nvcc)

./llama-server -m $MODEL_DIR/$model --port $port --host $host -c $context -ngl 999 --split-mode $splitMode --tensor-split $tensorSplit --main-gpu $mainGpu --temp $temp --top-p $topP --cont-batching --min-p $minP --top-k $topK --threads $threads --prio 2 --cpu-range 0-7 --cpu-strict 1 --kv-unified --cache-type-k q4_0 --cache-type-v q4_0 --batch-size 512 --ubatch-size 256 --chat-template-kwargs '{"enable_thinking":true}' --presence-penalty 1.0 --repeat-penalty 1.0