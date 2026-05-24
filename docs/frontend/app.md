# App (Main Component)

**Tags:** `frontend`, `vue`, `app`, `routing`, `chat`, `ui`, `main`

## Overview

The App component (`src/frontend/src/App.vue`) is the root Vue component for the Betty frontend. It manages authentication state, hash-based routing, WebSocket connection, and the main chat interface.

## Routing

Uses hash-based routing (`#login`, `#register`, `#chat`, `#admin`). No Vue Router dependency.

| Hash | Page | Auth Required |
|---|---|---|
| `#login` | Login page | No |
| `#register` | Register page | No |
| `#chat` | Chat view | Yes |
| `#admin` | Admin panel | Yes (admin/super_admin) |

## Components

| Component | Source | Description |
|---|---|---|
| `Login` | `pages/Login.vue` | Login form |
| `Register` | `pages/Register.vue` | Registration form |
| `Admin` | `pages/Admin.vue` | Admin panel with tabs |

## Chat Features

### Message Display

- User messages aligned right with blue bubbles
- Assistant messages aligned left with dark bubbles
- Markdown-like formatting: code blocks, inline code, bold, italic
- Auto-scroll to bottom on new messages

### Streaming

- Real-time text streaming with a blinking cursor
- "Thinking..." indicator while waiting for first token
- Streaming content is accumulated and committed on `message_end`

### Message Management

- **Delete message:** Remove from UI and send `delete-message` to backend
- **New session:** Clear messages and send `new-session` command
- **Stop response:** Send `stop` command to abort current generation

### Welcome Screen

Shown when no messages exist. Displays four clickable prompt suggestions.

## State

| Variable | Type | Description |
|---|---|---|
| `messages` | `ref<Message[]>` | Chat message history |
| `streamingContent` | `ref<string>` | Currently streaming text |
| `inputText` | `ref<string>` | Input field value |
| `isStreaming` | `ref<boolean>` | Whether a response is streaming |
| `isThinking` | `ref<boolean>` | Waiting for first token |
| `hasStarted` | `ref<boolean>` | Whether any message has been sent |
| `showUserMenu` | `ref<boolean>` | User dropdown visibility |

## WebSocket Events

| Event | Handler |
|---|---|
| `message` | On assistant message end: commit streaming content, push to messages |
| `stream` | Append content chunk to `streamingContent` |
| `error` | Log error, reset streaming state |
| `status` | Log status changes |
| `tool-call` | Log tool invocation |
| `tool-result` | Log tool result |

## Input Handling

| Key | Action |
|---|---|
| `Enter` | Send message |
| `Shift+Enter` | Insert newline |
| Auto-resize | Textarea grows up to 150px |

## Session Restoration

On mount, checks `localStorage` for a stored token. If found, calls `/api/auth/me` to validate. On success, navigates to chat and connects WebSocket.

## Related

- [[Auth Composable]] — Manages authentication state
- [[WebSocket Composable]] — Manages WebSocket connection
- [[Login Page]] — Login form component
- [[Register Page]] — Registration form component
- [[Admin Page]] — Admin panel component
