---
tags: [feature, mmproj, multimodal, models, user]
---

# Multimodal Projector Models

Multimodal projector (mmproj) models enable vision-language capabilities in `llama-server`. Betty provides tools to download, list, and manage mmproj files.

## Overview

An mmproj file is a small model (typically a few MB) that projects visual features into the text model's embedding space. It is used alongside a base model (e.g., LLaVA, BakLLaVA) to process images.

## Download mmproj Flow

````mermaid
sequenceDiagram
    participant UI as Frontend
    participant API as API Server
    participant FS as ~/.betty/models/

    UI->>API: POST /api/mmproj/download
    API->>FS: Check if file exists
    alt File exists
        FS-->>API: File found
        API-->>UI: EXISTS:<filename> (SSE)
    else File not found
        API->>API: Download via wget
        loop Progress updates
            API-->>UI: PROGRESS:<pct>:<bytes> (SSE)
        end
        API->>FS: Save mmproj file
        API-->>UI: FILE:<filename> (SSE)
        API-->>UI: SIZE:<bytes> (SSE)
    end
````

## Download mmproj

Download an mmproj file from a URL:

```
POST /api/mmproj/download
Authorization: Bearer $TOKEN

{
  "url": "https://huggingface.co/llava-hf/llava-v1.6-vicuna-7b-gguf/resolve/main/mmproj-model-f16.gguf",
  "filename": "llava-v1.6-mmproj.gguf"
}
```

- **url**: HTTP/HTTPS URL to the mmproj file (required)
- **filename**: Target filename (optional, derived from URL if omitted)

The download uses `wget` and streams progress via SSE:

```
event: mmproj
data: PROGRESS:75:5242880

event: mmproj
data: FILE:llava-v1.6-mmproj.gguf

event: mmproj
data: SIZE:7340032
```

If the file already exists, an `EXISTS` event is returned.

## List mmproj Models

Retrieve all mmproj files in the models directory:

```
GET /api/mmproj-models
```

Returns files whose paths contain `mmproj` (case-insensitive), sorted by modification time (newest first). Each entry includes:

- `filename` — path relative to models directory
- `size` — file size in bytes
- `modified` — modification timestamp

## Delete mmproj Model

Remove an mmproj file:

```
DELETE /api/mmproj/:filename
Authorization: Bearer $TOKEN
```

## Using mmproj with llama-server

Configure the mmproj in server parameters:

```json
{
  "server_params": {
    "mmproj": {
      "enabled": true,
      "value": "llava-v1.6-mmproj.gguf"
    }
  }
}
```

When enabled, `llama-server` is launched with `--mmproj <path>`, enabling image understanding for supported models.

## Storage

mmproj files are stored in `~/.betty/models/` alongside regular model files.

## Related

- [[features/huggingface-integration]] — Download mmproj files from HuggingFace
- [[config]] — Configuring `mmproj` in server params
- [[configuration-reference]] — `server_params.mmproj` reference
