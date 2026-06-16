#!/bin/bash
model=Qwen3.6-35B-A3B-MXFP4_MOE.gguf

# Host Configs
port=11434
host=100.83.33.20

# Hardware Configs
mainGpu=0
threads=20
tensorSplit=16,12,12
splitMode=layer

# Model Configs
context=131072
temp=0.7
topP=0.95
minP=0.00
topK=20

####################
MODEL_DIR=$HOME/.llm_models
CURRENT_DIR=$(pwd)
cd $CURRENT_DIR
cd llama.cpp/build/bin/

export CUDA_SCALE_LAUNCH_QUEUES=16x 
export LLAMA_CACHE=$modelDir
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export CUDACXX=$(which nvcc)
export LLAMA_ARG_FIT=on
export LLAMA_ARG_FIT_TARGET=512
export LLAMA_ARG_FIT_CTX=131072


./llama-server -m $MODEL_DIR/$model --port $port --host $host -c $context -ngl 999 --split-mode $splitMode --tensor-split $tensorSplit --main-gpu $mainGpu --temp $temp --top-p $topP --cont-batching --min-p $minP --top-k $topK --kv-unified --cache-type-k q8_0 --cache-type-v q8_0 --parallel 4  --reasoning on --batch-size 1024 --ubatch-size 256  --threads $threads --cpu-range 0-7 --cpu-strict-batch 1 --threads-batch 8 --jinja

# --repeat-penalty 1.0 --chat-template-kwargs '{"enable_thinking":true}' --presence-penalty 1.5