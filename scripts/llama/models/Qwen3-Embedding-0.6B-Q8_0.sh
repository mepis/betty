#!/bin/bash
model=Qwen3-Embedding-0.6B-Q8_0.gguf

# Host Configs
port=11433
host=100.78.136.115

# Hardware Configs
mainGpu=0
tensorSplit=8
splitMode=layer
threads=4

# Model Configs
context=262144
temp=0.7
topP=0.95
minP=0.00
topK=20

####################
MODEL_DIR=$HOME/.llm_models
CURRENT_DIR=$(pwd)
cd $CURRENT_DIR
cd llama.cpp/build/bin/

export CUDA_SCALE_LAUNCH_QUEUES=24x 
export LLAMA_CACHE=$modelDir
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export CUDACXX=$(which nvcc)



./llama-server -m $MODEL_DIR/$model --port $port --host $host -ngl 999 --split-mode $splitMode --tensor-split $tensorSplit --main-gpu $mainGpu --embeddings --chat-template-kwargs '{"enable_thinking":true}' 


# --temp $temp --top-p $topP --cont-batching --min-p $minP --top-k $topK --threads $threads --prio 2 --cpu-range 0-3 --cpu-strict 1 --batch-size 256 --ubatch-size 256 --chat-template-kwargs '{"enable_thinking":true}' --presence-penalty 1.5 

# --repeat-penalty 1.0 -c $context