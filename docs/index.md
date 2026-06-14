# Betty Documentation Index

Web-based chat interface for the [pi coding agent](https://pi.dev), accessible from any browser on the network.

## Quick Links

| Page | Summary |
|------|---------|
| [[Architecture]] | System design, data flow, and component relationships |
| [[QA / Quick Start]] | Get Betty running in under 5 minutes |
| [[QA / Authentication]] | Set up users, roles, and secure access |
| [[QA / Sessions]] | Manage chat sessions, forking, and persistence |
| [[QA / Benchmark]] | Run and analyze llama.cpp benchmarks |

---

## Backend

| Page | Summary |
|------|---------|
| [[Backend / Server]] | Main Express.js server — HTTP routes, WebSocket, RPC agent, benchmark manager |
| [[Backend / Auth Middleware]] | `authenticate`, `requireAuth`, `authorize(...roles)` middleware functions |
| [[Backend / Auth Utils]] | Password hashing, JWT generation/verification, token refresh |
| [[Backend / Session Store]] | File-based session persistence in `~/.betty/sessions/` |
| [[Backend / User Store]] | File-based user persistence in `~/.betty/users/` |
| [[Backend / Auth Routes]] | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh` |
| [[Backend / Admin Routes]] | `/api/admin/users` — CRUD for user management (admin-only) |

## Frontend — Components

| Page | Summary |
|------|---------|
| [[Frontend / App]] | Root Vue component — WebSocket setup, streaming, session management |
| [[Frontend / Sidebar]] | Left sidebar — model selection, thinking level, workspace, actions |
| [[Frontend / ChatView]] | Main chat area — message list, auto-scroll, virtualization, input |
| [[Frontend / ChatMessage]] | Single message renderer — markdown, thinking blocks, tool calls |
| [[Frontend / MessageInput]] | Text input with image attachments, command palette, drag-and-drop |
| [[Frontend / CommandPalette]] | Searchable command list with keyboard navigation |
| [[Frontend / CloneModal]] | Git clone dialog with progress tracking |
| [[Frontend / FolderPicker]] | Directory browser for workspace selection |
| [[Frontend / ToastContainer]] | Toast notification system |
| [[Frontend / Tooltip]] | Hover-triggered tooltip with Vue transitions |

## Frontend — Pages

| Page | Summary |
|------|---------|
| [[Frontend / LoginPage]] | Login form with email/password, first-user notice |
| [[Frontend / RegisterPage]] | Registration form with password strength indicator |
| [[Frontend / UsersPage]] | Admin-only user management table |

## Frontend — Composables

| Page | Summary |
|------|---------|
| [[Frontend / useWebSocket]] | WebSocket connection manager with auto-reconnect and event routing |
| [[Frontend / useStreaming]] | Paced text streaming with word-boundary snapping |
| [[Frontend / useAutoScroll]] | Gesture-aware auto-scroll with grace period |
| [[Frontend / useVirtualList]] | Lightweight virtualization for variable-height message lists |
| [[Frontend / useMessageStore]] | Binary search and lookup utilities for messages |
| [[Frontend / useToast]] | Global toast notification state and dispatcher |

## Frontend — Stores

| Page | Summary |
|------|---------|
| [[Frontend / Auth Store]] | Reactive authentication state with login/register/logout/init |

## Frontend — Utilities

| Page | Summary |
|------|---------|
| [[Frontend / Utils]] | Markdown rendering with `marked` + `highlight.js`, HTML escaping, formatting helpers |

## Benchmark

| Page | Summary |
|------|---------|
| [[Benchmark / Overview]] | llama.cpp benchmark tool — automated testing, config management, reporting |
| [[Benchmark / BenchmarkManager]] | `BenchmarkManager` class — process spawning, log parsing, SSE streaming |

---

**Tags:** [[tags]]
