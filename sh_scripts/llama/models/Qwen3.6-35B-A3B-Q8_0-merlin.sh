#!/bin/bash
# model=Qwen3.6-35B-A3B-UD-Q6_K.gguf
model=Qwen3.6-27B-IQ4_NL.gguf
# mmproj=mmproj-BF16.gguf

# Host Configs
port=11433
host=10.16.2.209

# Hardware Configs
mainGpu=0

# Model Configs
# common contet size windows: 16384, 32768, 65536, 131072, 262144, 524288
context=65536
temp=0.5
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

export CUDA_SCALE_LAUNCH_QUEUES=4x 
export LLAMA_CACHE=$MODEL_CACHE
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export CUDACXX=$(which nvcc)
export LLAMA_ARG_FIT=on
export LLAMA_ARG_FIT_TARGET=256
export LLAMA_ARG_FIT_CTX=65536

./llama-server -m $MODEL_DIR/$model  --port $port --host $host -c $context -ngl 999 --cont-batching --temp $temp --top-p $topP --min-p $minP --top-k $topK --batch-size 4096 --ubatch-size 2048 --flash-attn on --reasoning on -e --presence-penalty 0.0 --main-gpu $mainGpu --cache-type-k q8_0 --cache-type-v q8_0 --metrics

# --mmproj $MODEL_DIR/$mmproj