#!/bin/bash
# TTS Models Download Script
# Downloads OuteTTS-0.2 TTS model and WavTokenizer vocoder model

MODEL_DIR="$HOME/.llm_models"
mkdir -p "$MODEL_DIR"

echo "Downloading OuteTTS-0.2 TTS model..."
curl --fail -sL "https://huggingface.co/OuteAI/OuteTTS-0.2-500M-GGUF/resolve/main/OuteTTS-0.2-500M-Q8_0.gguf" \
  -o "$MODEL_DIR/OuteTTS-0.2-500M-Q8_0.gguf"

echo "Downloading WavTokenizer vocoder model..."
curl --fail -sL "https://huggingface.co/ggml-org/WavTokenizer/resolve/main/WavTokenizer-Large-75-F16.gguf" \
  -o "$MODEL_DIR/WavTokenizer-Large-75-F16.gguf"

echo ""
echo "Done. Files in $MODEL_DIR:"
ls -lh "$MODEL_DIR/"
