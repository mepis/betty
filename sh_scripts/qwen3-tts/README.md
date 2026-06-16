# Qwen3-TTS Service

Standalone text-to-speech service using the Qwen3-TTS-12Hz-1.7B model. Runs as an independent server on a GPU-enabled machine — not spawned by the Node.js backend.

## Hardware Requirements

| Component | Requirement |
|-----------|-------------|
| GPU | NVIDIA CUDA-compatible (min 4GB VRAM recommended) |
| RAM | 8GB+ system memory |
| Python | >= 3.9 |
| Storage | ~5GB for model weights |

## Installation

```bash
cd integrations/qwen3-tts
bash start.sh [port]
```

The script will:
1. Create a Python virtual environment (or use system Python)
2. Install dependencies from `requirements.txt`
3. Check CUDA availability
4. Start the FastAPI service on the specified port (default: 50052)

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `50052` |

The model (`Qwen/Qwen3-TTS-12Hz-1.7B-Base`) is downloaded automatically on first run from HuggingFace.

## Deployment Options

### systemd Service

Create `/etc/systemd/system/qwen-tts.service`:

```ini
[Unit]
Description=Qwen3-TTS Service
After=network.target

[Service]
Type=simple
User=tts
WorkingDirectory=/opt/qwen3-tts
ExecStart=/opt/qwen3-tts/.venv/bin/python tts_service.py --port 50052
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then: `systemctl enable --now qwen-tts`

### Direct (Development)

```bash
cd integrations/qwen3-tts && bash start.sh
```

## API Documentation

### Health Check

```bash
curl http://localhost:50052/health
# → {"status": "ok"}
```

### List Speakers

```bash
curl http://localhost:50052/speakers
# → { "default": "Ryan", "speakers": [...] }
```

### Generate Speech

```bash
curl -X POST http://localhost:50052/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "language": "English"}'
# → { "audio_base64": "<base64 WAV>", "duration_ms": 1234 }
```

#### Voice Cloning

```bash
curl -X POST http://localhost:50052/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Test clone", "speaker_audio": "<base64 WAV>", "language": "English"}'
# → { "audio_base64": "<base64 WAV>", "duration_ms": 1234 }
```

#### Custom Speaker

```bash
curl -X POST http://localhost:50052/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "speaker": "Aiden"}'
# → { "audio_base64": "<base64 WAV>", "duration_ms": 1234 }
```

## Speaker Presets

| Speaker | Language | Description |
|---------|----------|-------------|
| Ryan | English | Dynamic male, strong rhythmic drive (default) |
| Aiden | English | Sunny American male |
| Vivian | Chinese | Bright, slightly edgy young female |
| Serena | Chinese | Warm, gentle young female |
| Uncle_Fu | Chinese | Seasoned male, low mellow timbre |
| Dylan | Chinese (Beijing) | Youthful Beijing male |
| Eric | Chinese (Sichuan) | Lively Chengdu male |
| Ono_Anna | Japanese | Playful Japanese female |
| Sohee | Korean | Warm Korean female |

## Node.js Backend Integration

Configure the backend with `TTS_SERVER_URL` in `.env`:

```bash
TTS_SERVER_URL=http://<tts-host>:50052
TTS_TIMEOUT=60000
TTS_DEFAULT_SPEAKER=Ryan
```

The backend proxies TTS requests to this external service via HTTP (no gRPC, no subprocess management).
