# RBAC User System Implementation Plan

## 1. Purpose

Add a complete user authentication and Role-Based Access Control (RBAC) system to Betty, the Pi coding agent chat app. This includes:

- User registration, login, and JWT-based authentication
- Built-in roles (super_admin, admin, moderator, user) with predefined permissions
- Custom role creation with granular permission assignment
- Protected API and WebSocket endpoints
- Frontend login/register pages and an admin panel for managing users and roles

**Scope boundaries:**
- IN: User CRUD, Role CRUD, Permission system, JWT auth, Auth middleware, Login/Register UI, Admin panel
- OUT: OAuth/social login, MFA, password reset via email, audit logging

## 2. Approach

### Architecture

- **Database**: SQLite via `better-sqlite3` (synchronous, zero-config, file-based)
- **Auth**: JWT tokens (`jsonwebtoken`) with bcrypt password hashing (`bcryptjs`)
- **Backend**: New modules under `src/backend/` — database, auth middleware, API routes
- **Frontend**: New Vue pages — Login, Register, Admin panel (Users + Roles tabs)
- **WebSocket**: Auth via query param `?token=...`, validated on connection

### Database Schema

```
roles
  id (PK), name (UNIQUE), description, is_system (BOOLEAN), created_at

permissions
  id (PK), role_id (FK→roles), resource, action, created_at

users
  id (PK), username (UNIQUE), email (UNIQUE), password_hash, role_id (FK→roles), created_at

sessions
  id (PK), user_id (FK→users), token (UNIQUE), expires_at, created_at
```

### Built-in Roles & Permissions

| Role         | Permissions                                    |
|--------------|------------------------------------------------|
| super_admin  | ALL                                            |
| admin        | users:CRUD, roles:CRUD, sessions:CRUD, chat    |
| moderator    | users:R,U, sessions:R, chat                    |
| user         | sessions:CRUD, chat                            |

### Alternatives Considered

- **PostgreSQL**: Rejected — adds external dependency and complexity
- **Session cookies**: Rejected — JWT works better with WebSocket auth
- **Fine-grained row-level permissions**: Rejected — overkill for this app

## 3. Phased Plan

### Phase 1: Database Layer
- [ ] 1.1 Install dependencies (better-sqlite3, jsonwebtoken, bcryptjs, zod)
- [ ] 1.2 Create `src/backend/db/database.js` — SQLite connection, schema creation, migrations
- [ ] 1.3 Create `src/backend/db/seeds.js` — seed built-in roles and permissions
- [ ] 1.4 Create `src/backend/db/repositories.js` — UserRepo, RoleRepo, PermissionRepo

### Phase 2: Authentication
- [ ] 2.1 Create `src/backend/auth/jwt.js` — token generation, verification, refresh
- [ ] 2.2 Create `src/backend/auth/password.js` — hash and compare passwords
- [ ] 2.3 Create `src/backend/auth/middleware.js` — HTTP auth middleware, permission checker
- [ ] 2.4 Create `src/backend/auth/ws-auth.js` — WebSocket auth middleware

### Phase 3: Auth API Routes
- [ ] 3.1 Create `src/backend/routes/auth.js` — register, login, logout, me
- [ ] 3.2 Create `src/backend/routes/users.js` — list, get, update, delete users
- [ ] 3.3 Create `src/backend/routes/roles.js` — CRUD roles, assign/list permissions
- [ ] 3.4 Wire routes into `server.js`

### Phase 4: WebSocket Integration
- [ ] 4.1 Update `server.js` WebSocket handler to validate token on connection
- [ ] 4.2 Attach user info to session data
- [ ] 4.3 Enforce permissions on WebSocket actions (e.g., new-session requires "sessions:create")

### Phase 5: Frontend — Auth Pages
- [ ] 5.1 Create `src/frontend/src/pages/Login.vue` — login form
- [ ] 5.2 Create `src/frontend/src/pages/Register.vue` — registration form
- [ ] 5.3 Create `src/frontend/src/composables/useAuth.js` — auth state, token management, API calls
- [ ] 5.4 Update `useWebSocket.js` to pass token as query param

### Phase 6: Frontend — Admin Panel
- [ ] 6.1 Create `src/frontend/src/pages/Admin.vue` — layout with Users and Roles tabs
- [ ] 6.2 Create `src/frontend/src/components/admin/UserList.vue` — list/create/edit/delete users
- [ ] 6.3 Create `src/frontend/src/components/admin/RoleManager.vue` — create/edit/delete roles with permission checkboxes
- [ ] 6.4 Create `src/frontend/src/components/admin/PermissionMatrix.vue` — role-permission grid

### Phase 7: Frontend Integration
- [ ] 7.1 Update `App.vue` — add auth guard, user menu, admin link
- [ ] 7.2 Update `main.js` — add simple routing (hash-based, no vue-router)
- [ ] 7.3 Add CSS for auth pages and admin panel

## 4. Validation

### L1 (Unit/Component)
- Database schema creates correctly and seeds built-in roles
- JWT token generation and verification round-trips
- Password hashing and comparison works
- Auth middleware rejects unauthenticated/authorized requests

### L2 (Integration)
- Register → Login → Access protected endpoint flow works end-to-end
- Custom role creation with permissions enforces access correctly
- WebSocket connection with/without token behaves correctly

### L3 (System)
- Full user journey: register, login, chat, admin manages roles
- Non-admin users cannot access admin panel or admin APIs
- Token expiration handled gracefully

## 5. Progress Tracker

- [x] 1.1 Install dependencies
- [x] 1.2 Create database module
- [x] 1.3 Create seed module
- [x] 1.4 Create repositories
- [x] 2.1 Create JWT module
- [x] 2.2 Create password module
- [x] 2.3 Create auth middleware
- [x] 2.4 Create WS auth
- [x] 3.1 Create auth routes
- [x] 3.2 Create user routes
- [x] 3.3 Create role routes
- [x] 3.4 Wire routes into server
- [x] 4.1 Update WS handler for auth
- [x] 4.2 Attach user to session
- [x] 4.3 Enforce WS permissions
- [x] 5.1 Create Login.vue
- [x] 5.2 Create Register.vue
- [x] 5.3 Create useAuth.js
- [x] 5.4 Update useWebSocket.js
- [x] 6.1 Create Admin.vue
- [x] 6.2 Create UserList.vue
- [x] 6.3 Create RoleManager.vue
- [x] 6.4 Create PermissionMatrix.vue (merged into RoleManager)
- [x] 7.1 Update App.vue
- [x] 7.2 Update main.js with routing (hash-based routing in App.vue)
- [x] 7.3 Add CSS for new pages
