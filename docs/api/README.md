# API Reference

Betty provides OpenAI-compatible REST API endpoints.

## Base URL

```
http://localhost:3000/v1
```

## Authentication

When authentication is enabled (`ENABLE_AUTH=true`), include your API key or JWT token:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/v1/...
```

## Endpoints

### Core Endpoints

- [POST /v1/completions](/api/completions.html) - Text completion
- [POST /v1/chat/completions](/api/chat.html) - Chat completion
- [POST /v1/embeddings](/api/embeddings.html) - Generate embeddings
- [GET /v1/models](/api/models.html) - List models

### Health & Status

- [GET /health](/api/health.html) - Server health check
- [GET /v1/models](/api/models.html) - List available models

### RAG Endpoints

- [POST /api/documents](/api/documents.html#upload) - Upload document
- [GET /api/documents](/api/documents.html#list) - List documents
- [DELETE /api/documents/:id](/api/documents.html#delete) - Delete document
- [POST /api/search](/api/documents.html#search) - Search documents

### Authentication Endpoints

- [POST /api/auth/login](/api/auth.html#login) - User login
- [POST /api/auth/register](/api/auth.html#register) - User registration
- [POST /api/auth/logout](/api/auth.html#logout) - User logout
- [GET /api/auth/me](/api/auth.html#profile) - Get user profile

## OpenAI Compatibility

Betty implements the OpenAI API specification for:

- Text completions (`/v1/completions`)
- Chat completions (`/v1/chat/completions`)
- Embeddings (`/v1/embeddings`)
- Models listing (`/v1/models`)

You can use OpenAI's official client libraries by changing the `base_url`:

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="not-needed"
)
```

## Rate Limiting

Betty does not implement rate limiting by default. For production use, consider adding a reverse proxy with rate limiting (nginx, Caddy, etc.).

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Error description",
    "type": "invalid_request_error",
    "code": "invalid_parameter"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `invalid_request_error` | 400 | Malformed request |
| `authentication_error` | 401 | Invalid or missing auth |
| `permission_denied` | 403 | Insufficient permissions |
| `not_found` | 404 | Resource not found |
| `rate_limit_exceeded` | 429 | Too many requests |
| `server_error` | 500 | Internal server error |
| `service_unavailable` | 503 | llama.cpp not running |

## Request/Response Examples

### Successful Response

```json
{
  "id": "cmpl-1234567890",
  "object": "text_completion",
  "created": 1234567890,
  "model": "llama",
  "choices": [...],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### Error Response

```json
{
  "error": {
    "message": "Invalid parameter: temperature must be between 0 and 2",
    "type": "invalid_request_error",
    "param": "temperature",
    "code": "invalid_parameter"
  }
}
```

## Admin Endpoints

### Shutdown Endpoint

To gracefully shut down the entire server (API and llama.cpp), send a POST request to `/api/shutdown` with an admin token:

```bash
POST /api/shutdown
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_TOKEN

{"reason": "Scheduled maintenance"}
```

**Response:**

```json
{
  "message": "Server shutting down..."
}
```

This endpoint is only available to users with the `admin` role.

#### Important Notes

- This operation triggers an immediate graceful shutdown process
- The API will first stop accepting new requests
- Existing requests will complete before the server terminates
- The llama.cpp process will be terminated when no further requests are expected
- Response contains confirmation but the actual termination may take 1-2 seconds

> ℹ️ To manually shut down the server, click the **Shutdown Server** button in the Admin Menu (admin users only)

## Next Steps

- [Completions API](/api/completions.html) - Text generation
- [Chat API](/api/chat.html) - Conversational AI
- [Embeddings API](/api/embeddings.html) - Vector embeddings
- [Documents API](/api/documents.html) - RAG endpoints
