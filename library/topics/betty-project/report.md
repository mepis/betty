# Betty Project — Technical Report

## Executive Summary

Betty is a full-stack web application serving as a browser-based interface for the Pi coding agent. It combines an Express.js backend with WebSocket support and a Vue 3 frontend to deliver real-time AI chat with user management capabilities.

## Technology Stack

### Backend
- **Runtime:** Node.js (ES modules)
- **Framework:** Express.js 4.x
- **WebSocket:** ws 8.x
- **Database:** SQLite via better-sqlite3 (WAL mode)
- **Auth:** jsonwebtoken (HS256), bcryptjs
- **AI:** @earendil-works/pi-coding-agent SDK

### Frontend
- **Framework:** Vue 3.5 (Composition API, SFC)
- **Build:** Vite 6.x
- **Styling:** Custom CSS (dark theme, CSS variables)

## System Design

The system follows a layered architecture:

1. **Presentation Layer:** Vue 3 components with composables for state management
2. **Transport Layer:** REST API (Express) + WebSocket (ws)
3. **Business Layer:** PiSession wrapper, auth middleware, permission checks
4. **Data Layer:** SQLite with repository pattern

## Authentication Model

JWT tokens with database-backed session tracking. Token hashes are stored (never raw tokens). 24-hour expiration. Role-based access control with 5 resources × 6 actions = 30 possible permissions.

## WebSocket Protocol

JSON-based messaging protocol supporting: prompt, stop, delete-message, new-session commands. Server pushes: message, stream, status, tool-call, tool-result, error events.

## Database Schema

Four tables: roles, permissions, users, sessions. Foreign key constraints with cascading deletes. Performance indexes on frequently queried columns.

## Key Design Decisions

- **SDK over RPC:** Direct SDK integration gives access to agent state (context window manipulation)
- **In-memory sessions:** Pi agent sessions are not persisted — they live for the duration of the WebSocket connection
- **Hash-based routing:** No Vue Router dependency — simple hash-based page switching
- **Singleton composables:** Module-level refs in composables provide shared state without a global store
