#!/bin/bash
model=Nemotron-3-Nano-30B-A3B-Q8_0.gguf

# Host Configs
port=11434
host=100.106.131.63

# Hardware Configs
mainGpu=0
tensorSplit=16,12,12
splitMode=layer
threads=20

# Model Configs
context=262144
temp=0.6
topP=0.95
minP=0.01
topK=20

####################
MODEL_DIR=$HOME/.llm_models
CURRENT_DIR=$(pwd)
cd $CURRENT_DIR
cd llama.cpp/build/bin/

export CUDA_SCALE_LAUNCH_QUEUES=32x 
export LLAMA_CACHE=$modelDir
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export CUDACXX=$(which nvcc)
export LLAMA_ARG_FIT=on
export LLAMA_ARG_FIT_TARGET=512
export LLAMA_ARG_FIT_CTX=262144

./llama-server -m $MODEL_DIR/$model --port $port --host $host -c $context -ngl 999 --split-mode $splitMode --tensor-split $tensorSplit --main-gpu $mainGpu --temp $temp --top-p $topP  --min-p $minP --top-k $topK --threads $threads --swa-full --kv-unified --cache-type-k q8_0 --cache-type-v q8_0 --batch-size 256 --ubatch-size 256  --presence-penalty 1 --repeat-penalty 1 --rope-scaling yarn --fit on --fit-target 512 --fit-ctx 262144 --parallel 8 --cont-batching --ctx-checkpoints 16 --reasoning on  --special --special

# --chat-template-kwargs '{"enable_thinking":true}'