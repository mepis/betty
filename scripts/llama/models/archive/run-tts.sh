#!/bin/bash
# Server startup script for TTS-enabled llama.cpp server
# Requires OuteTTS-0.2 and WavTokenizer models downloaded first
# Run: ./models/download-tts.sh first, then this script

MODEL_DIR="$HOME/.llm_models"
MODEL="OuteTTS-0.2-500M-Q8_0.gguf"
VOCODER="WavTokenizer-Large-75-F16.gguf"
SPEAKER="$MODEL_DIR/en_male_1.json"

port=11434
host=0.0.0.0

CURRENT_DIR=$(pwd)
cd $CURRENT_DIR

export LLAMA_CACHE=$MODEL_DIR
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1
export CUDACXX=$(which nvcc)

./llama.cpp/build/bin/llama-server \
  -m $MODEL_DIR/$MODEL \
  --model-vocoder $MODEL_DIR/$VOCODER \
  --tts-speaker-file $SPEAKER \
  --tts-use-guide-tokens \
  --host $host --port $port \
  -c 8192 \
  -ngl 999 \
  --cont-batching \
  --threads 8 \
  --prio 2
