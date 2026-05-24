---
scope: "Login functions - full authentication system audit"
started_at: "2026-05-24"
last_updated: "2026-05-24"
current_phase: "Phase 1"
status: "active"
---

## Codebase Map

### Project Structure
```
betty/
├── src/
│   ├── frontend/           # Vue 3 + Vite SPA
│   │   ├── src/
│   │   │   ├── App.vue             # Main app, hash-based routing
│   │   │   ├── main.js             # Vue app entry
│   │   │   ├── pages/
│   │   │   │   ├── Login.vue       # Login page
│   │   │   │   ├── Register.vue    # Registration page
│   │   │   │   └── Admin.vue       # Admin panel
│   │   │   ├── composables/
│   │   │   │   ├── useAuth.js      # Auth composable (login/logout/register/fetchUser)
│   │   │   │   └── useWebSocket.js # WebSocket composable
│   │   │   └── styles/main.css
│   │   ├── vite.config.js          # Vite config with proxy
│   │   └── index.html
│   └── backend/            # Express.js + SQLite
│       ├── server.js       # Main server (Express + WebSocket)
│       ├── routes/
│       │   ├── auth.js     # POST /register, POST /login, GET /me, POST /logout
│       │   ├── users.js    # CRUD for users (auth required)
│       │   └── roles.js    # CRUD for roles (auth required)
│       ├── auth/
│       │   ├── jwt.js      # JWT generation, verification, session management
│       │   ├── password.js # bcrypt hashing/comparison
│       │   ├── middleware.js # authMiddleware, optionalAuthMiddleware, requirePermission, etc.
│       │   └── ws-auth.js  # WebSocket token validation
│       ├── db/
│       │   ├── database.js # SQLite schema, init, cleanup
│       │   ├── repositories.js # UserRepo, SessionRepo, RoleRepo, PermissionRepo
│       │   └── seeds.js    # Built-in roles + default admin
│       └── pi-session.js   # Pi agent session management
├── package.json            # Scripts: dev, backend, frontend, build
└── .env                    # PORT=3001, NODE_ENV=development
```

### API Endpoints (Login-Related)
| Method | Path | Auth | Handler | Description |
|--------|------|------|---------|-------------|
| POST | /api/auth/register | None | routes/auth.js | Register new user |
| POST | /api/auth/login | None | routes/auth.js | Login with credentials |
| GET | /api/auth/me | Bearer JWT | routes/auth.js | Get current user |
| POST | /api/auth/logout | Bearer JWT | routes/auth.js | Revoke session |

### Frontend Routes
| Route Hash | Component | Auth Required |
|------------|-----------|---------------|
| #login | Login.vue | Yes (redirects to chat if logged in) |
| #register | Register.vue | Yes (redirects to chat if logged in) |
| #chat | App.vue (main view) | Yes |
| #admin | Admin.vue | Yes (admin role only) |

### Key Functions to Audit
1. `useAuth.login()` - Frontend login flow
2. `useAuth.register()` - Frontend registration flow
3. `useAuth.logout()` - Frontend logout
4. `useAuth.fetchUser()` - Token validation
5. `POST /api/auth/register` - Backend registration
6. `POST /api/auth/login` - Backend login
7. `GET /api/auth/me` - Current user info
8. `POST /api/auth/logout` - Session revocation
9. `authMiddleware` - Token extraction & validation
10. `createSession()` / `validateToken()` / `revokeSession()` - JWT lifecycle
11. `hashPassword()` / `comparePassword()` - Password handling
12. `extractWsToken()` / `validateWsToken()` - WebSocket auth

### Dev Server Commands
- Full dev: `npm run dev` (concurrently runs backend:3001 + frontend:5173)
- Backend only: `npm run backend`
- Frontend only: `npm run frontend`
- Default admin: admin / admin123

### Database
- SQLite via better-sqlite3
- Tables: users, roles, permissions, sessions
- WAL mode enabled, foreign keys enabled
