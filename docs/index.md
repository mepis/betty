# Betty Documentation

Web-based chat application for the Pi coding agent. Provides a browser interface for interacting with Pi, with user authentication, role-based access control, and an admin panel.

## Quick Links

- [[Getting Started]] — Installation and first run
- [[Architecture]] — System design and data flow
- [[API Usage Examples]] — REST API with curl examples
- [[WebSocket Usage Examples]] — Real-time chat protocol

---

## Backend

### Server & Sessions

- [[Server]] — Express + WebSocket server entry point. Manages HTTP routes, WebSocket connections, rate limiting, and PiSession lifecycle.
- [[PiSession]] — EventEmitter wrapper around the Pi SDK. Handles agent sessions, streaming, prompt sending, and context window management.

### Authentication

- [[JWT Authentication]] — Token generation, verification, and session lifecycle for HTTP API auth.
- [[Auth Middleware]] — Express middleware for authentication and role-based access control (RBAC).
- [[Password Hashing]] — bcrypt-based password hashing and comparison.
- [[WebSocket Auth]] — Token extraction and validation for WebSocket connections.

### Database

- [[Database]] — SQLite schema, tables, indexes, and connection management via better-sqlite3.
- [[Repositories]] — Data access layer for roles, permissions, users, and sessions.
- [[Seeds]] — Built-in roles, permissions, and default admin user population.

### API Routes

- [[Auth Routes]] — `/api/auth` — Registration, login, profile, logout.
- [[Users Routes]] — `/api/users` — User CRUD operations.
- [[Roles Routes]] — `/api/roles` — Role and permission management.

---

## Frontend

### Core

- [[App Component]] — Root Vue component. Manages routing, WebSocket connection, chat UI, and message display.

### Composables

- [[Auth Composable]] — `useAuth()` — Shared authentication state, login/register/logout, token management.
- [[WebSocket Composable]] — `useWebSocket()` — WebSocket connection lifecycle, reconnection, event dispatching.

### Pages

- [[Login Page]] — Username/password login form.
- [[Register Page]] — New user registration form with validation.
- [[Admin Page]] — Admin panel with Users and Roles tabs.

### Components

- [[UserList Component]] — User management table with create/edit/delete modals.
- [[RoleManager Component]] — Role and permission management with permission grid.

---

## QA & Examples

- [[Getting Started]] — Step-by-step setup and first run guide.
- [[API Usage Examples]] — Complete curl examples for all REST endpoints.
- [[WebSocket Usage Examples]] — JavaScript and wscat examples for the WebSocket protocol.

---

## Reference

- [[Tags]] — Cross-reference index organized by category
- [[Changelog]] — Version history and notable changes
