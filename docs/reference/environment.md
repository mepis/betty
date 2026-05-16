# Environment Configuration

## Summary

Betty uses environment variables to configure both the server and the frontend. Server variables are read at startup; frontend variables are baked into the build at compile time via Vite's `import.meta.env`.

## Server Environment Variables

Read from `process.env` in `server.ts`:

| Variable | Default | Description |
|----------|---------|-------------|
| `WS_PORT` | `3001` | WebSocket server port (also serves HTTP/HTTPS on the same port) |
| `HTTPS` | `false` | Enable HTTPS mode. When `true`, the server uses TLS for both HTTP and WebSocket connections |
| `HTTPS_CERT_PATH` | — | Path to TLS certificate PEM file. Required when `HTTPS=true` (unless using auto-generated certs) |
| `HTTPS_KEY_PATH` | — | Path to TLS private key PEM file. Required when `HTTPS=true` (unless using auto-generated certs) |
| `PI_PROVIDER` | — | LLM provider for the pi agent (e.g., `anthropic`, `openai`) |
| `PI_MODEL` | — | Model ID for the pi agent (e.g., `claude-sonnet-4-20250514`) |
| `PI_NO_SESSION` | `false` | Disable session persistence (`--no-session` flag) |
| `PI_SESSION_DIR` | — | Custom session storage directory for pi |
| `PI_THINKING_LEVEL` | — | Default thinking level (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`) |
| `PI_VERBOSE` | `false` | Enable verbose stderr logging from the pi process |
| `ANTHROPIC_API_KEY` | — | Anthropic API key (inherited by pi process) |
| `OPENAI_API_KEY` | — | OpenAI API key (inherited by pi process) |

### HTTPS Configuration

When `HTTPS=true`:

1. If `HTTPS_CERT_PATH` and `HTTPS_KEY_PATH` are set, the server reads those files
2. If not set, the server auto-generates a self-signed certificate in `.certs/` using the `selfsigned` package
3. The certificate and key are regenerated only if they don't already exist

```typescript
const useHttps = process.env.HTTPS === "true";
const httpsCertPath = process.env.HTTPS_CERT_PATH;
const httpsKeyPath = process.env.HTTPS_KEY_PATH;
```

## Frontend Environment Variables

Read from `import.meta.env` in `src/stores/chat.ts` and `index.html`:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_WS_URL` | `ws://localhost:3001` | WebSocket server URL. Overrides auto-detection |
| `VITE_WSS_URL` | — | Alternative WebSocket URL (for WSS connections) |
| `VITE_WS_PORT` | `3001` | WebSocket port. Used when `VITE_WS_URL` is not set |

### URL Resolution Logic

```typescript
const wsUrl = import.meta.env.VITE_WS_URL
  || import.meta.env.VITE_WSS_URL
  || `${wsProtocol}//${location.hostname}:${import.meta.env.VITE_WS_PORT || "3001"}`;
```

1. If `VITE_WS_URL` is set, use it directly
2. If `VITE_WSS_URL` is set, use it as fallback
3. Otherwise, construct from `location.hostname` and `VITE_WS_PORT`
4. Protocol (`ws:` vs `wss:`) is inferred from `location.protocol`

## Configuration Files

| File | Purpose | Tracked in Git? |
|------|---------|-----------------|
| `.env` | Frontend env variables (VITE_*) | No (in `.gitignore`) |
| `.env.local` | Local overrides | No (in `.gitignore`) |
| `.certs/cert.pem` | Generated TLS certificate | No (in `.gitignore`) |
| `.certs/key.pem` | Generated TLS private key | No (in `.gitignore`) |

### Recommended: `.env.example`

Create a `.env.example` file for template values:

```bash
# WebSocket server URL
VITE_WS_URL=ws://localhost:3001
VITE_WS_PORT=3001

# HTTPS configuration
# HTTPS=true
# HTTPS_CERT_PATH=/path/to/cert.pem
# HTTPS_KEY_PATH=/path/to/key.pem
```

## Tags

- **category**: configuration, environment
- **component**: server.ts, stores/chat.ts, vite.config.ts
- **pattern**: environment-variables, build-time-config
- **audience**: developers, engineers
