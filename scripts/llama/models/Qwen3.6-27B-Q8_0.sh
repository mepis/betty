#!/bin/bash
# model=Qwen3.6-27B-Q8.gguf
model=Qwen3.6-27B-NVFP4-Q4_K_M.gguf
mmproj=Qwen3.6-27B-mmprog.gguf

# Host Configs
port=11434
host=100.88.77.33

# Hardware Configs
mainGpu=0
tensorSplit=16,12,12
splitMode=layer
threads=8

# Model Configs
# common contet size windows: 16384, 32768, 65536, 131072, 262144, 524288
context=131072
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

export LLAMA_ARG_MLOCK=on
export CUDA_SCALE_LAUNCH_QUEUES=4x 
export LLAMA_CACHE=$MODEL_CACHE
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export CUDACXX=$(which nvcc)
export LLAMA_ARG_FIT=on
export LLAMA_ARG_FIT_TARGET=256
export LLAMA_ARG_FIT_CTX=131072

./llama-server -m $MODEL_DIR/$model --mmproj $MODEL_DIR/$mmproj --port $port --host $host -c $context -ngl 999 --cont-batching --temp $temp --top-p $topP  --min-p $minP --top-k $topK --batch-size 1024 --ubatch-size 256 --kv-unified --flash-attn on --reasoning on --cache-prompt --split-mode $splitMode --tensor-split $tensorSplit --main-gpu $mainGpu --cpu-range 0-7 --cpu-strict-batch 1 --threads-batch 8 --threads $threads --cpu-strict 1 --no-mmap 

# --cache-type-k q8_0 --cache-type-v q8_0 --repeat-penalty 0.0 --presence-penalty 0.0 --rope-scaling yarn --rope-scale 2.0