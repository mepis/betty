# Betty Project

**Date:** 2026-05-24
**Tags:** web-app, chat, pi-agent, full-stack, vue, express, websocket, rbac

## Summary

Betty is a web-based chat application that provides a browser interface for the Pi coding agent. It features user authentication, role-based access control, real-time streaming chat, and an admin panel for user and role management.

## Architecture

- **Backend:** Node.js + Express + WebSocket (ws) + SQLite (better-sqlite3)
- **Frontend:** Vue 3 + Vite
- **AI Integration:** Pi coding agent SDK (`@earendil-works/pi-coding-agent`)

## Key Features

- Real-time chat with streaming responses
- JWT-based authentication with session management
- Role-based access control (4 built-in roles + custom roles)
- Admin panel for user and role management
- Message deletion from context window
- Auto-reconnect with exponential backoff
- Rate limiting and message size limits

## Documentation

Full documentation is available in `docs/`:

- [[docs/index]] — Main documentation index
- [[docs/architecture]] — Architecture deep-dive
- [[docs/qa/getting-started]] — Setup guide
