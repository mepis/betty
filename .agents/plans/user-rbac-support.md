# User & RBAC Support — Implementation Plan

## 1. Purpose

Add multi-user authentication and role-based access control (RBAC) to Betty so that:
- Users can register, log in, and manage their accounts
- Roles define what actions each user can perform
- The WebSocket connection is gated by authentication
- Admin users can manage other users and system settings

### Scope — In Scope
- JSON-file-based user store (no database dependency)
- Password hashing with bcrypt
- JWT-based session tokens (in-memory, no persistence between restarts)
- Three built-in roles: `admin`, `user`, `viewer`
- WebSocket authentication via token in connection URL
- Login page in the Vue frontend
- User management panel (admin-only)
- Permission-based gating of server-side commands

### Scope — Out of Scope
- Password reset / email recovery
- OAuth / SSO providers
- User session persistence across server restarts
- Audit logging
- Multi-tenant isolation (sessions are shared, only permissions differ)

## 2. Approach

### Architecture Decisions

**1. JSON File Store for Users**
- Users stored in `data/users.json` (created on first use)
- Simple key-value JSON: `{ "users": [{id, username, hashedPassword, role, createdAt}] }`
- No database dependency; works in any deployment

**2. bcrypt for Password Hashing**
- Use `bcrypt` npm package (well-maintained, battle-tested)
- Salt rounds: 12

**3. JWT for Session Tokens**
- Use `jsonwebtoken` npm package
- Tokens are in-memory only (not persisted)
- 24-hour expiry, refreshed on each request
- Secret from env var `JWT_SECRET`

**4. WebSocket Auth via URL Parameter**
- Client connects as: `ws://host:3001/ws?token=<jwt>`
- Server validates token before accepting connection
- Invalid/expired token → connection rejected

**5. Permission Model**
- Each role maps to a set of allowed command types
- Commands not in the role's allowlist → error response sent, connection not upgraded
- Admin can override everything

### Roles & Permissions

| Permission / Action | admin | user | viewer |
|---|---|---|---|
| Send messages (prompt) | ✅ | ✅ | ❌ |
| Steer / follow-up | ✅ | ✅ | ❌ |
| Bash commands | ✅ | ✅ | ❌ |
| Model switching | ✅ | ✅ | ✅ |
| Thinking level cycling | ✅ | ✅ | ✅ |
| Create new sessions | ✅ | ✅ | ❌ |
| Switch sessions | ✅ | ✅ | ✅ |
| Compact context | ✅ | ✅ | ❌ |
| Fork / clone sessions | ✅ | ✅ | ❌ |
| View sessions list | ✅ | ✅ | ✅ |
| View settings | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| System config | ✅ | ❌ | ❌ |

### Dependencies to Add
- `bcrypt` — password hashing
- `jsonwebtoken` — JWT creation/validation
- `@types/bcrypt` — TypeScript types for bcrypt
- `@types/jsonwebtoken` — TypeScript types for jsonwebtoken

## 3. Phased Plan

### Phase 1: User Store & Password Hashing

**Task 1.1: Create user store module**
- Create `src/server/userStore.ts`
- Data model: `User` interface with `{ id: string; username: string; hashedPassword: string; role: UserRole; createdAt: number }`
- `UserRole` type: `"admin" | "user" | "viewer"`
- `UserStore` class with methods:
  - `load(): void` — reads `data/users.json`
  - `save(): void` — writes to `data/users.json`
  - `createUser(username: string, password: string, role: UserRole): Promise<User>` — hashes password, creates user, persists
  - `findUser(username: string): User | undefined`
  - `findUserById(id: string): User | undefined`
  - `authenticate(username: string, password: string): Promise<User | null>` — verifies password hash
  - `getAllUsers(): User[]` — returns users without hashed passwords
  - `updateUser(id: string, updates: Partial<User>): Promise<User>`
  - `deleteUser(id: string): boolean`
  - `getUsersWithoutPassword(): Array<{id, username, role, createdAt}>`
- Seed default admin user on first run if no users exist (username: `admin`, password: `admin` — logged as warning)
- **Acceptance**: Module compiles, `createUser` + `authenticate` work, data persists to file

**Task 1.2: Add bcrypt dependency**
- `npm install bcrypt @types/bcrypt`
- **Acceptance**: Package installs, TypeScript types available

### Phase 2: JWT Authentication Module

**Task 2.1: Create JWT auth module**
- Create `src/server/auth.ts`
- Functions:
  - `generateToken(user: { id: string; username: string; role: UserRole }): string` — creates JWT
  - `verifyToken(token: string): { id: string; username: string; role: UserRole } | null` — validates and decodes
  - `getTokenExpiry(): number` — returns expiry timestamp
- Token payload: `{ id, username, role, iat, exp }`
- Secret read from `JWT_SECRET` env var (required, throw error if missing)
- Token expiry: 24 hours
- **Acceptance**: Tokens are generated and verified correctly, invalid tokens rejected

### Phase 3: Auth Middleware & WebSocket Gating

**Task 3.1: Add auth middleware to WebSocket handshake**
- Modify `wss.handleUpgrade` / `connection` handler in `server.ts`
- Extract `token` from query string: `ws://host:3001/?token=xxx`
- Validate token:
  - Missing token → send `{"type":"auth_required"}`, close connection
  - Invalid/expired token → send `{"type":"auth_error","message":"Invalid or expired token"}`, close connection
  - Valid token → proceed with normal connection, attach user info to WebSocket
- Store authenticated user on WebSocket: `ws.userData = { id, username, role }`
- **Acceptance**: Unauthenticated connections are rejected; authenticated connections proceed normally

**Task 3.2: Add REST endpoint for login**
- Add `POST /api/auth/login` route in `requestHandler`
- Request body: `{ username: string, password: string }`
- Response on success: `{ token: string, user: { id, username, role } }`
- Response on failure: `{ error: "Invalid credentials" }` with 401 status
- **Acceptance**: Login endpoint works, returns valid token

### Phase 4: Permission System & Command Gating

**Task 4.1: Define role permission maps**
- Create `src/server/permissions.ts`
- Define `RolePermissions` type mapping `UserRole` to `Set<string>` of allowed command types
- Default permissions:
  - `admin`: all commands
  - `user`: prompt, abort, set_model, set_thinking_level, cycle_model, cycle_thinking_level, get_state, get_messages, get_available_models, new_session, switch_session, set_session_name, get_commands, steer, follow_up, bash, set_steering_mode, set_follow_up_mode, set_auto_compaction, set_auto_retry, compact, get_session_stats, get_fork_messages, fork, clone, get_last_assistant_text
  - `viewer`: get_state, get_messages, get_available_models, switch_session, set_session_name, get_commands, cycle_model, cycle_thinking_level, get_session_stats, get_last_assistant_text
- Function: `hasPermission(role: UserRole, command: string): boolean`
- **Acceptance**: Permission checks correctly allow/deny commands per role

**Task 4.2: Gate commands by permission**
- In `handleClientMessage`, before executing any handler, check `hasPermission(ws.userData.role, msg.type)`
- If denied: send `{"type":"error","message":"Permission denied: insufficient privileges"}` and return
- If user not authenticated: send `{"type":"error","message":"Authentication required"}` and return
- **Acceptance**: Viewers cannot send messages; users cannot access admin features

### Phase 5: User Management REST API

**Task 5.1: Create user management endpoints**
- Add routes in `server.ts` (guarded by admin auth):
  - `GET /api/users` — list all users (admin only, no passwords)
  - `POST /api/users` — create user (admin only), body: `{ username, password, role }`
  - `PUT /api/users/:id` — update user (admin only), body: `{ password?, role? }`
  - `DELETE /api/users/:id` — delete user (admin only)
  - `GET /api/me` — get current authenticated user info
- All user management endpoints require `Authorization: Bearer <token>` header
- Admin-only check: if role !== 'admin' → 403
- **Acceptance**: Admin can CRUD users; non-admins get 403; auth required

### Phase 6: Frontend Authentication

**Task 6.1: Add auth types**
- In `src/types.ts`, add:
  - `WsLoginMessage`: `{ type: "login"; username: string; password: string }`
  - `WsLoginResponse`: `{ type: "login_success"; token: string; user: { id, username, role } }` | `{ type: "login_error"; message: string }`
  - `WsAuthRequired`: `{ type: "auth_required" }`
  - `WsAuthError`: `{ type: "auth_error"; message: string }`
  - `WsUserInfo`: `{ type: "user_info"; user: { id, username, role } }`
  - `User` interface: `{ id: string; username: string; role: UserRole; createdAt: number }`
  - `UserRole`: `"admin" | "user" | "viewer"`
  - `AuthState` interface for store
- **Acceptance**: All types compile without errors

**Task 6.2: Create auth store**
- Create `src/stores/auth.ts` (Pinia store)
- State:
  - `token: string | null`
  - `user: User | null`
  - `isAuthenticated: boolean`
- Actions:
  - `login(username: string, password: string): Promise<void>` — calls `POST /api/auth/login`, stores token in localStorage
  - `logout(): void` — clears token and user from localStorage and state
  - `loadSession(): void` — on mount, checks localStorage for existing token, validates it
  - `validateToken(token: string): Promise<boolean>` — calls `GET /api/me`, verifies token is valid
- Persistence: token stored in `localStorage` as `betty_token`
- **Acceptance**: Login persists across page reloads, logout clears state

**Task 6.3: Integrate auth into WebSocket connection**
- Modify `src/stores/chat.ts`:
  - Import auth store
  - Include token in WebSocket URL: `?token=${authStore.token}`
  - Handle `auth_required` and `auth_error` events:
    - On `auth_required` → redirect to login, disable chat
    - On `auth_error` → clear auth, redirect to login
  - Auto-reconnect should only happen if authenticated
- **Acceptance**: WebSocket connects with auth token; reconnection respects auth state

**Task 6.4: Create login page**
- Create `src/components/LoginPage.vue`
- Fields: username (text), password (password)
- Submit calls `authStore.login()`
- On success → redirect to main chat
- On error → show error message
- Auto-login check on mount (if token exists in localStorage, try to validate)
- Simple, minimal design matching Betty's dark theme
- **Acceptance**: Login page renders, login works, redirects to chat on success

**Task 6.5: Update App.vue for auth state**
- Wrap main chat UI in conditional: `<template v-if="authStore.isAuthenticated">`
- Show `<LoginPage />` when not authenticated
- In header, show user info (username + role badge)
- Add "Logout" button in settings or header
- **Acceptance**: Unauthenticated users see login; authenticated users see chat with user info

### Phase 7: Admin Panel

**Task 7.1: Create user management panel**
- Create `src/components/UserManagement.vue`
- Only visible to admin users
- Features:
  - List all users (username, role, created date)
  - Create new user form (username, password, role dropdown)
  - Edit user (change role, reset password)
  - Delete user (with confirmation)
  - Fetch user list from `GET /api/users`
  - Create/update/delete via REST calls
- **Acceptance**: Admin sees user management in settings; can CRUD users

**Task 7.2: Wire admin panel into App.vue**
- Add "Users" tab/section in settings modal (admin only)
- Show UserManagement component
- Hide for non-admin users
- **Acceptance**: Non-admin users don't see user management; admin can manage users

## 4. Validation

### Phase 1-2 (Auth Backend)
- **Manual**: Register a user via direct API call, verify user stored in JSON file
- **Manual**: Login with correct credentials → get token; login with wrong credentials → 401
- **Manual**: Token is valid for 24 hours (check exp claim)

### Phase 3 (WebSocket Gating)
- **Manual**: Connect WebSocket without token → connection rejected
- **Manual**: Connect WebSocket with invalid token → connection rejected with error
- **Manual**: Connect WebSocket with valid token → connection accepted, chat works

### Phase 4 (Permissions)
- **Manual**: Viewer connects → can get state, models, switch sessions; cannot send messages
- **Manual**: User connects → can chat, manage sessions; cannot access admin endpoints
- **Manual**: Admin connects → full access

### Phase 5 (User Management API)
- **Manual**: Admin with token → CRUD users works
- **Manual**: User with token → 403 on all user management endpoints
- **Manual**: No token → 401 on all endpoints

### Phase 6 (Frontend Auth)
- **Manual**: Open app → see login page
- **Manual**: Login with correct credentials → redirected to chat
- **Manual**: Refresh page → auto-login via stored token
- **Manual**: Logout → back to login page

### Phase 7 (Admin Panel)
- **Manual**: Admin logs in → sees user management in settings
- **Manual**: User logs in → no user management visible
- **Manual**: Admin creates user → user can log in
- **Manual**: Admin deletes user → user can no longer log in

## 5. Progress Tracker

- [x] Phase 1: User Store & Password Hashing
  - [x] Task 1.1: Create user store module (`src/server/userStore.ts`)
  - [x] Task 1.2: Add bcrypt dependency
- [x] Phase 2: JWT Authentication Module
  - [x] Task 2.1: Create JWT auth module (`src/server/auth.ts`)
- [x] Phase 3: Auth Middleware & WebSocket Gating
  - [x] Task 3.1: Add auth middleware to WebSocket handshake
  - [x] Task 3.2: Add REST endpoint for login
- [x] Phase 4: Permission System & Command Gating
  - [x] Task 4.1: Define role permission maps
  - [x] Task 4.2: Gate commands by permission
- [x] Phase 5: User Management REST API
  - [x] Task 5.1: Create user management endpoints
- [x] Phase 6: Frontend Authentication
  - [x] Task 6.1: Add auth types
  - [x] Task 6.2: Create auth store
  - [x] Task 6.3: Integrate auth into WebSocket connection
  - [x] Task 6.4: Create login page
  - [x] Task 6.5: Update App.vue for auth state
- [x] Phase 7: Admin Panel
  - [x] Task 7.1: Create user management panel
  - [x] Task 7.2: Wire admin panel into App.vue

## 6. File Changes Summary

### New Files
- `src/server/userStore.ts` — User data store (JSON file)
- `src/server/auth.ts` — JWT token generation/validation
- `src/server/permissions.ts` — Role permission maps
- `data/users.json` — User data (created at runtime)
- `src/stores/auth.ts` — Frontend auth Pinia store
- `src/components/LoginPage.vue` — Login page component
- `src/components/UserManagement.vue` — Admin user management panel

### Modified Files
- `server.ts` — Add auth middleware, REST endpoints, permission checks
- `src/types.ts` — Add auth-related TypeScript types
- `src/stores/chat.ts` — Include token in WebSocket URL, handle auth events
- `src/main.ts` — Import auth store
- `src/App.vue` — Add login conditional, user info display, logout, admin panel
- `package.json` — Add `bcrypt`, `jsonwebtoken` dependencies

### Environment Variables (new)
- `JWT_SECRET` — Required. Secret key for JWT signing (generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- `DEFAULT_ADMIN_USERNAME` — Optional, default: `admin`
- `DEFAULT_ADMIN_PASSWORD` — Optional, default: `admin`
