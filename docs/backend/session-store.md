# Backend / Session Store

## Tags

`backend`, `sessions`, `persistence`, `file-storage`, `json`, `chat`

---

## Overview

`src/backend/session-store.js` provides file-based session persistence. Sessions are stored as individual JSON files in `~/.betty/sessions/`.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSIONS_ENABLED` | `true` (set `false` to disable) | Toggle all disk I/O |
| `SESSIONS_DIR` | `~/.betty/sessions/` | Storage directory |

When `SESSIONS_ENABLED=false`, all operations become no-ops (no disk I/O).

## Session Schema

```json
{
  "id": "uuid",
  "name": "Session 2026-06-14T12:00:00.000Z",
  "createdAt": 1718380800000,
  "updatedAt": 1718380800000,
  "messageCount": 42,
  "messages": [
    { "id": "msg-1", "role": "user", "content": "...", "timestamp": "..." },
    { "id": "msg-2", "role": "assistant", "content": "...", "timestamp": "..." }
  ]
}
```

## Functions

### `createSession()`

Create a new session with a UUID and ISO timestamp name. Saves to disk.

- **Output:** Session object

### `loadSession(sessionId)`

Load a session by ID.

- **Input:** Session ID string
- **Output:** Session object or `null` if not found
- **Throws:** `Error` if sessionId is empty

### `saveSession(session)`

Save a session to disk.

- **Input:** Session object with `id` field
- **Throws:** `Error` if disk write fails

### `updateSession(sessionId, updates)`

Update a session with whitelisted fields.

- **Input:** Session ID + updates object
- **Allowed fields:** `name`, `messageCount`, `messages`
- **Auto-updated:** `updatedAt` timestamp
- **Output:** Updated session or `null` if not found

### `deleteSession(sessionId)`

Delete a session file.

- **Input:** Session ID string
- **Output:** `true` if deleted, `false` if not found or error

### `listSessions()`

List all sessions, sorted by `updatedAt` descending.

- **Output:** Array of session objects

## File Layout

```
~/.betty/sessions/
├── a1b2c3d4-....json   ← Session 1
├── e5f6g7h8-....json   ← Session 2
└── ...
```

Each file is a self-contained JSON document. No database or indexing is used.

## Security

- `updateSession()` uses a whitelist of allowed fields to prevent session corruption
- Session IDs are UUIDs — not predictable
- When `SESSIONS_ENABLED=false`, no data is written to disk

## Related

- [[Backend / Server]] — Session management in WebSocket handlers
- [[Backend / User Store]] — Similar file-based persistence for users
- [[Architecture]] — Session persistence overview
