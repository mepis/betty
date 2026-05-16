#!/bin/bash
# Starts the Qwen3-TTS FastAPI service as a standalone server.
# Usage: bash integrations/qwen3-tts/start.sh [port]
# Default port: 50052
export PATH=/usr/local/cuda-13.2/bin${PATH:+:${PATH}}
rm -r .venv

set -e

PORT="${1:-50052}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${SCRIPT_DIR}/.venv"

echo "[qwen-tts] Starting TTS service on port $PORT..."

# Check Python version
python3 -c "import sys; assert sys.version_info >= (3, 9), 'Python >= 3.9 required'" || { echo "ERROR: Python >= 3.9 required"; exit 1; }

# Create virtual environment if it doesn't exist
if [ ! -d "${VENV_DIR}" ]; then
    echo "[qwen-tts] Creating virtual environment..."
    python3 -m venv "${VENV_DIR}" || {
        echo "[qwen-tts] WARNING: Failed to create venv. Using system Python with --break-system-packages."
    }
fi

# Activate virtual environment if it exists
if [ -f "${VENV_DIR}/bin/activate" ]; then
    source "${VENV_DIR}/bin/activate"
    PIP_CMD="${VENV_DIR}/bin/pip"
    PYTHON_CMD="${VENV_DIR}/bin/python3"
else
    echo "[qwen-tts] VENV not found, using system Python"
    PIP_CMD="pip3"
    PYTHON_CMD="python3"
fi

# Install torch first (required for flash-attn to compile correctly), then remaining dependencies
# flash-attn is optional - install core dependencies without it
$PIP_CMD install --break-system-packages torch>=2.5.0 torchaudio

echo "[qwen-tts] Installing remaining dependencies..."
$PIP_CMD install --break-system-packages --no-deps qwen-tts 2>/dev/null || true
$PIP_CMD install --break-system-packages \
    fastapi uvicorn \
    scipy soxr numba \
    librosa soundfile \
    numpy \
    lazy-loader \
    cffi \
    transformers==4.57.3 accelerate==1.12.0 einops gradio onnxruntime sox \
    joblib pooch scikit-learn audioread decorator msgpack

# Check CUDA availability
$PYTHON_CMD -c "
import torch
if not torch.cuda.is_available():
    print('WARNING: CUDA not available. Qwen3-TTS requires a GPU.', file=__import__('sys').stderr)
" || true

# Run the service
exec $PYTHON_CMD "${SCRIPT_DIR}/tts_service.py" --port="$PORT"
