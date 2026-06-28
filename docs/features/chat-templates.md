---
tags: [feature, chat-templates, configuration, user]
---

# Chat Templates

Chat templates define how conversations are formatted before being sent to `llama-server`. Betty supports downloading, managing, and using custom Jinja chat templates from remote URLs.

## Overview

A chat template is a Jinja2 template that formats a conversation (system, user, assistant messages) into the tokenized prompt expected by the model. Different models require different templates (e.g., Llama 3, Mistral, Phi).

Templates are stored in `~/.betty/chat_templates/` and referenced by `llama-server` via the `--chat-template-file` flag.

## Download Template Flow

````mermaid
sequenceDiagram
    participant UI as Frontend
    participant API as API Server
    participant FS as Filesystem
    participant DB as Database

    UI->>API: POST /api/chat-templates/download
    API->>API: Sanitize filename
    API->>FS: Check if file exists
    alt File exists
        FS-->>API: File found
        API-->>UI: EXISTS:<filename> (SSE)
    else File not found
        API->>API: Download via wget
        loop Progress updates
            API-->>UI: PROGRESS:<pct>:<bytes> (SSE)
        end
        API->>FS: Save to ~/.betty/chat_templates/
        API->>DB: Save template record
        API-->>UI: FILE:<filename> (SSE)
        API-->>UI: SIZE:<bytes> (SSE)
    end
````

## Download Template

Download a chat template from a URL:

```
POST /api/chat-templates/download
Authorization: Bearer $TOKEN

{
  "url": "https://example.com/llama-3-template.jinja",
  "filename": "llama-3-template.jinja"
}
```

- **url**: HTTP/HTTPS URL to the template file (required)
- **filename**: Target filename (optional, derived from URL if omitted)

The filename is sanitized — non-alphanumeric characters (except `.`, `-`, `_`) are replaced with `_`.

### Progress Streaming

The download uses `wget` under the hood and streams progress via SSE:

```
event: chat-template
data: PROGRESS:45:12345

event: chat-template
data: FILE:llama-3-template.jinja

event: chat-template
data: SIZE:2048
```

If the file already exists, an `EXISTS` event is sent instead of re-downloading.

## List Templates

Retrieve all available chat templates:

```
GET /api/chat-templates
```

Returns an array of template objects with filename, size, and modification time.

## Delete Template

Remove a chat template:

```
DELETE /api/chat-templates/:filename
Authorization: Bearer $TOKEN
```

Removes the file from `~/.betty/chat_templates/` and the database.

## Using Templates with llama-server

Set the template in the server configuration:

```json
{
  "server_params": {
    "chat_template_file": "~/chat_templates/llama-3-template.jinja"
  }
}
```

The path is resolved relative to the benchmark directory, or as an absolute path if it starts with `~` or `/`.

When enabled, `llama-server` is launched with `--chat-template-file <path>`, and the template is used for all chat completions.

## Template Storage

Templates are stored in two locations:

1. **Filesystem**: `~/.betty/chat_templates/<filename>` — used by `llama-server`
2. **Database**: Template content is saved for backup and retrieval

## Related

- [[config]] — Configuring `chat_template_file` in server params
- [[configuration-reference]] — `server_params.chat_template_file` reference
- [[features/benchmark-engine]] — Templates used during benchmark runs
