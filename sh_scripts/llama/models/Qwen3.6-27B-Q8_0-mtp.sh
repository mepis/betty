#!/bin/bash
# model=Qwen3.6-27B-Q8.gguf
# model=Qwen3.6-27B-Q8_0.gguf
model=Qwen3.6-27B-UD-Q6_K_XL.gguf
mmproj=Qwen3.6-27B-mmprog.gguf

# Host Configs
port=11434
host=100.88.77.33

# Hardware Configs
mainGpu=0
tensorSplit=16,12,12
splitMode=tensor

# Model Configs
# common contet size windows: 16384, 32768, 65536, 131072, 262144, 524288
context=131072
temp=0.6
topP=0.95
minP=0.00
topK=20

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
export GGML_CUDA_P2P=on

./llama-server -m $MODEL_DIR/$model --mmproj $MODEL_DIR/$mmproj --port $port --host $host -c $context -ngl 999 --cont-batching --temp $temp --top-p $topP --min-p $minP --top-k $topK --batch-size 256 --ubatch-size 256 --flash-attn 1 --reasoning 1 --split-mode $splitMode --tensor-split $tensorSplit --spec-type draft-mtp --spec-draft-n-max 3 -e --presence-penalty 0.0 --reasoning-budget 1024 --reasoning-budget-message "Proceed to final answer." --cache-ram 0 --ctx-checkpoints 16 --parallel 1 --jinja --kv-unified

