#!/bin/bash
model=gemma-4-31B-it-qat-UD-Q4_K_XL.gguf
mmproj=gemma-4-31b-qat-mmproj.gguf

# Host Configs
port=11434
host=100.88.77.33

# Hardware Configs
mainGpu=0
tensorSplit=16,12,12
splitMode=tensor
threads=8

# Model Configs
# common contet size windows: 16384, 32768, 65536, 131072, 262144, 524288
context=262144
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

export CUDA_SCALE_LAUNCH_QUEUES=8x
export LLAMA_CACHE=$MODEL_CACHE
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export CUDACXX=$(which nvcc)
export LLAMA_ARG_FIT=on
export LLAMA_ARG_FIT_TARGET=256
export LLAMA_ARG_FIT_CTX=131072
export GGML_CUDA_P2P=on

./llama-server -m $MODEL_DIR/$model --mmproj $MODEL_DIR/$mmproj --port $port --host $host -c $context -ngl 999 --cont-batching --temp 1.0 --top-p 0.95 --top-k 64 --batch-size 256 --ubatch-size 256 --flash-attn 1 --reasoning 1 --split-mode $splitMode --tensor-split $tensorSplit -e --presence-penalty 0.0 --reasoning-budget 2048 --reasoning-budget-message "Proceed to final answer." --cache-ram 4096 --rope-scaling yarn --rope-scale 2.0 --parallel 2


