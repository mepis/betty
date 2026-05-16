#!/usr/bin/env python3
"""Qwen3-TTS FastAPI service for text-to-speech generation.

Designed to run as an independent server on a GPU-enabled machine.
Not spawned by the Node.js backend - runs separately (systemd, etc.).
"""

import argparse
import base64
import io
import logging
import os
import tempfile
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
import torch
import soundfile as sf
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Qwen3-TTS imports
from qwen_tts import Qwen3TTSModel

logging.basicConfig(level=logging.INFO, format='[qwen-tts] %(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger('qwen-tts')


class Config:
    MODEL_ID = "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"
    DEFAULT_SPEAKER = "Ryan"
    DEFAULT_LANGUAGE = "Auto"
    OUTPUT_SAMPLE_RATE = 24000
    MAX_TEXT_LENGTH = 2000

    # Available speakers for /speakers endpoint
    SPEAKERS = [
        {"name": "Ryan", "language": "English", "description": "Dynamic male, strong rhythmic drive"},
        {"name": "Aiden", "language": "English", "description": "Sunny American male"},
        {"name": "Vivian", "language": "Chinese", "description": "Bright, slightly edgy young female"},
        {"name": "Serena", "language": "Chinese", "description": "Warm, gentle young female"},
        {"name": "Uncle_Fu", "language": "Chinese", "description": "Seasoned male, low mellow timbre"},
        {"name": "Dylan", "language": "Chinese (Beijing)", "description": "Youthful Beijing male"},
        {"name": "Eric", "language": "Chinese (Sichuan)", "description": "Lively Chengdu male"},
        {"name": "Ono_Anna", "language": "Japanese", "description": "Playful Japanese female"},
        {"name": "Sohee", "language": "Korean", "description": "Warm Korean female"},
    ]


class TTSRequest(BaseModel):
    text: str
    speaker_audio: Optional[str] = None      # base64 WAV for voice cloning
    language: Optional[str] = "Auto"         # or specific language code (en, zh, etc.)
    speaker: Optional[str] = None            # preset speaker name (overrides default)


class TTSResponse(BaseModel):
    audio_base64: str
    duration_ms: int


# Global model singleton - loaded once at startup
model: Optional[Qwen3TTSModel] = None


def _load_model():
    """Load Qwen3TTSModel on CUDA with bfloat16."""
    global model
    logger.info("Loading Qwen3-TTS model...")
    try:
        model = Qwen3TTSModel.from_pretrained(
            Config.MODEL_ID,
            device_map="cuda:0",
            dtype=torch.bfloat16,
            attn_implementation="flash_attention_2",
        )
    except (ImportError, RuntimeError):
        logger.warning("flash-attn not available or failed; loading without flash attention")
        model = Qwen3TTSModel.from_pretrained(
            Config.MODEL_ID,
            device_map="cuda:0",
            dtype=torch.bfloat16,
        )
    vram_used = torch.cuda.memory_allocated() / 1024**2
    logger.info(f"Model loaded. VRAM: {vram_used:.0f} MB")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup, clean up on shutdown."""
    _load_model()
    yield
    global model
    if model is not None:
        del model
        model = None
        torch.cuda.empty_cache()
        logger.info("Model unloaded")


app = FastAPI(title="Qwen3-TTS Service", lifespan=lifespan)


def _encode_wav(waveform: np.ndarray, sample_rate: int) -> str:
    """Convert numpy waveform array to base64-encoded WAV bytes.

    Qwen3-TTS returns Tuple[List[numpy.ndarray], int] - not PyTorch tensors.
    """
    wav_int16 = (waveform * 32767).astype(np.int16)
    buffer = io.BytesIO()
    sf.write(buffer, wav_int16, sample_rate, format="WAV", subtype="PCM_16")
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')


@app.post("/tts", response_model=TTSResponse)
async def generate_tts(request: TTSRequest):
    """Generate speech from text.

    Voice modes:
      - No speaker_audio -> CustomVoice (default: Ryan, or speaker field if provided)
      - With speaker_audio -> Voice clone from reference WAV
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    text = request.text.strip()
    if len(text) == 0:
        raise HTTPException(status_code=400, detail="Text is required")
    if len(text) > Config.MAX_TEXT_LENGTH:
        logger.warning(f"Truncating text from {len(text)} to {Config.MAX_TEXT_LENGTH} chars")
        text = text[:Config.MAX_TEXT_LENGTH]

    try:
        # Voice clone mode (speaker audio provided)
        if request.speaker_audio:
            raw = base64.b64decode(request.speaker_audio)
            buf = io.BytesIO(raw)
            wav_data, sr = sf.read(buf, dtype='float32')
            tmp_path = tempfile.mktemp(suffix='.wav')
            sf.write(tmp_path, wav_data, sr, format="WAV", subtype="PCM_16")

            try:
                wavs, sr_out = model.generate_voice_clone(
                    text=text,
                    language=request.language or Config.DEFAULT_LANGUAGE,
                    ref_audio=tmp_path,  # accepts file path directly
                    ref_text="",
                    non_streaming_mode=True,  # explicit to match custom voice behavior
                )
            finally:
                os.unlink(tmp_path)

        # Custom voice mode (default speaker or specified speaker)
        else:
            selected_speaker = request.speaker or Config.DEFAULT_SPEAKER
            wavs, sr_out = model.generate_custom_voice(
                text=text,
                language=request.language or Config.DEFAULT_LANGUAGE,
                speaker=selected_speaker,
            )

        audio_base64 = _encode_wav(wavs[0] if isinstance(wavs, list) else wavs, sr_out)
        duration_ms = int(len(wavs[0] if isinstance(wavs, list) else wavs) / sr_out * 1000)

        return TTSResponse(audio_base64=audio_base64, duration_ms=duration_ms)

    except Exception as e:
        logger.error(f"Speech generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/speakers")
async def list_speakers():
    """Return available speaker presets.

    Uses the model's get_supported_speakers() instance method with
    hardcoded fallback if the model is unavailable or returns None.
    """
    speakers = []
    if model is not None:
        try:
            speakers = model.get_supported_speakers() or []
        except Exception:
            pass  # fall through to hardcoded list
    return {
        "default": Config.DEFAULT_SPEAKER,
        "speakers": speakers if speakers else Config.SPEAKERS,
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    parser = argparse.ArgumentParser(description='Qwen3-TTS FastAPI Service')
    parser.add_argument('--port', type=int, default=50052, help='HTTP server port (default: 50052)')
    args = parser.parse_args()

    uvicorn.run(app, host="0.0.0.0", port=args.port)
