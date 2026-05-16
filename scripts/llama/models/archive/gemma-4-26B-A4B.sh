#!/bin/bash
model=gemma-4-26B-A4B-it-UD-Q8_K_XL.gguf

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
temp=1
topP=0.95
minP=0.00
topK=64

####################
MODEL_DIR=$HOME/.llm_models
CURRENT_DIR=$(pwd)
cd $CURRENT_DIR
ls -ls
cd llama.cpp/build/bin/

export CUDA_SCALE_LAUNCH_QUEUES=32x 
export LLAMA_CACHE=$modelDir
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export LLAMA_ARG_FIT=on
export LLAMA_ARG_FIT_TARGET=512
export LLAMA_ARG_FIT_CTX=131072

./llama-server -m $MODEL_DIR/$model --port $port --host $host -c $context -ngl 999 --split-mode $splitMode --tensor-split $tensorSplit --main-gpu $mainGpu --temp $temp --top-p $topP --cont-batching --min-p $minP --top-k $topK --threads $threads  --cpu-strict 1 --kv-unified --batch-size 256 --ubatch-size 256 --reasoning on --parallel 6 --cont-batching --ctx-checkpoints 16


# NCCL_DEBUG=INFO ./llama-server -m /home/jon/llm_server/integrations/llama/models/Qwen3.5-27B-IQ4_NL.gguf --port 11434 --host 100.115.205.84 -c 131072 -ngl 999 --split-mode layer --tensor-split 16,12,12 --main-gpu 0 --temp 1 --top-p 0.95 --cont-batching --min-p 0.0 --top-k 64 --threads 8 --prio 2 --cpu-range 0-7 --cpu-strict 1 --swa-full --kv-unified --cache-type-k q8_0 --cache-type-v q8_0 --batch-size 4096 --ubatch-size 1024 

# --chat-template-kwargs '{"enable_thinking":true}'  --presence-penalty 1 --repeat-penalty 1

