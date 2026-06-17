#!/bin/bash
# model=Qwen3.6-35B-A3B-UD-Q8_K_XL.gguf
# model=Qwen3.6-35B-A3B-Q8_0.gguf.1 # mtp model
# model=Qwen3.6-35B-A3B-UD-Q6_K_XL.gguf # mtp model
model=Qwen3.6-35B-A3B-Q8_0.gguf
# model=Qwen3.6-35B-A3B-MXFP4_MOE.gguf
# model=Qwen3.6-35B-A3B-UD-IQ4_NL_XL.gguf
mmproj=qwen3.6-35b-mmproj-f16.gguf

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

export CUDA_SCALE_LAUNCH_QUEUES=8x
export LLAMA_CACHE=$MODEL_CACHE
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export CUDACXX=$(which nvcc)
export LLAMA_ARG_FIT=on
export LLAMA_ARG_FIT_TARGET=256
export LLAMA_ARG_FIT_CTX=262144
export GGML_CUDA_P2P=on

# ./llama-server -m $MODEL_DIR/$model --mmproj $MODEL_DIR/$mmproj --port $port --host $host -c $context -ngl 999 --cont-batching --temp $temp --top-p $topP  --min-p $minP --top-k $topK --batch-size 1024 --ubatch-size 256 --flash-attn 1 --reasoning 1 --split-mode $splitMode --tensor-split $tensorSplit --main-gpu $mainGpu --spec-type draft-mtp --spec-draft-n-max 3 -e --cache-reuse 512 --chat-template-kwargs '{"enable_thinking":false}' --presence-penalty 0.0 --repeat-penalty 1.0 --spec-draft-p-min 0.75

./llama-server -m $MODEL_DIR/$model --mmproj $MODEL_DIR/$mmproj --port $port --host $host -c $context -ngl 999 --cont-batching --temp $temp --top-p $topP --min-p $minP --top-k $topK --batch-size 256 --ubatch-size 256 --flash-attn 1 --reasoning 1 --split-mode $splitMode --tensor-split $tensorSplit -e --presence-penalty 0.0 --reasoning-budget 1024 --reasoning-budget-message "Proceed to final answer." --cache-ram 0 --parallel 1


# --cache-type-k q8_0 --cache-type-v q8_0 --repeat-penalty 0.0 --mmproj $MODEL_DIR/$mmproj --rope-scaling yarn --rope-scale 2.0 --presence-penalty 0.0 --repeat-penalty 1.0 --jinja --no-mmap --spec-type draft-mtp --spec-draft-n-max 3 --jinja --cpu-range 0-7 --cpu-strict-batch 1 --threads-batch 8 --threads $threads --cpu-strict 1