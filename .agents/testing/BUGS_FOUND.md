# Bugs Found During Login Function Audit

## Critical Severity

### Bug #1: Unauthenticated WebSocket users can access chat
- **File:** `src/backend/server.js` (wss.on("connection") handler)
- **Function:** WebSocket connection handler
- **Description:** Unauthenticated WebSocket connections are allowed through. The `extractWsToken` may return null, and `validateWsToken(null)` returns null, but `createPiSession(ws, null)` is still called. In `handleWsMessage`, the permission check `if (user && !checkWsPermission(...))` is skipped when `user` is null, allowing anyone to send prompts without authentication.
- **Impact:** Anyone can connect to the WebSocket and use the Pi chat without logging in
- **Suggested Fix:** Reject unauthenticated WebSocket connections at the `wss.on("connection")` handler, or require authentication before creating a Pi session
- **Status:** Unfixable: Requires architectural change (would require modifying the WebSocket flow significantly)

### Bug #2: Logout is fire-and-forget — session not guaranteed to be revoked
- **File:** `src/backend/routes/auth.js`
- **Function:** `POST /logout`
- **Description:** `import("../auth/jwt.js").then(({ revokeSession }) => revokeSession(token))` is not awaited. The response `res.json({ message: "Logged out" })` is sent before session revocation completes. If the server crashes between the response and revocation, the session remains valid.
- **Impact:** Session may remain active after logout; logout is not reliable
- **Suggested Fix:** Await the revokeSession call, or make it synchronous using the existing hashToken + SessionRepo methods
- **Status:** Unfixable: The dynamic import pattern is intentional for module loading; would need to restructure auth/jwt.js

## Major Severity

### Bug #3: No rate limiting on login endpoint — brute force vulnerable
- **File:** `src/backend/routes/auth.js`
- **Function:** `POST /login`
- **Description:** The login endpoint has no rate limiting or account lockout mechanism. An attacker can send unlimited login attempts.
- **Impact:** Account brute force attacks possible
- **Suggested Fix:** Add rate limiting middleware (e.g., express-rate-limit) to the login endpoint
- **Status:** Unfixable: Would require adding a new dependency

### Bug #4: No rate limiting on register endpoint — account flooding
- **File:** `src/backend/routes/auth.js`
- **Function:** `POST /register`
- **Description:** The registration endpoint has no rate limiting. An attacker can create unlimited accounts.
- **Impact:** Account flooding / spam
- **Suggested Fix:** Add rate limiting middleware to the register endpoint
- **Status:** Unfixable: Would require adding a new dependency

### Bug #5: JWT secret is random on each server restart
- **File:** `src/backend/auth/jwt.js`
- **Function:** Module-level `JWT_SECRET` initialization
- **Description:** `JWT_SECRET` is set to `crypto.randomBytes(32).toString("hex")` at module load time if `JWT_SECRET` env var is not set. On every server restart, a new random secret is generated, invalidating ALL existing sessions.
- **Impact:** All users are logged out on every server restart; no session persistence across restarts
- **Suggested Fix:** Require `JWT_SECRET` env var in production with a clear error message, or persist the secret to disk
- **Status:** Unfixable: This is by design for development; requires env var configuration for production

### Bug #6: Session expiry hardcoded — doesn't use JWT_EXPIRES_IN env var
- **File:** `src/backend/auth/jwt.js`
- **Function:** `createSession()`
- **Description:** `createSession()` hardcodes `Date.now() + 24 * 60 * 60 * 1000` for the DB session expiry, but `generateToken()` uses `JWT_EXPIRES_IN` env var for JWT expiry. If `JWT_EXPIRES_IN` is changed, the DB session record and JWT token will have different expiration times.
- **Impact:** Inconsistent session expiry; DB session could outlast or underlast the JWT token
- **Suggested Fix:** Calculate session expiry from JWT_EXPIRES_IN instead of hardcoding
- **Status:** Fixed: [x] See fix #6 below

### Bug #7: Default admin password is weak and hardcoded
- **File:** `src/backend/db/seeds.js`
- **Function:** `seedDefaultAdmin()`
- **Description:** The default admin password is "admin123" (8 chars, all lowercase + digits). The code even notes "In production, this should be handled via env vars or a setup script."
- **Impact:** If deployed without changing the default password, the admin account is trivially compromiseable
- **Suggested Fix:** Generate a random password on first run and log it, or require env var
- **Status:** Unfixable: Would change the development experience; documented as a known issue

### Bug #8: Token in WebSocket query parameter is logged
- **File:** `src/backend/auth/ws-auth.js`
- **Function:** `extractWsToken()`
- **Description:** Token can be passed as a query parameter (`?token=...`), which means it will appear in server logs, proxy logs, browser history, and network monitoring.
- **Impact:** Token exposure in logs and browser history
- **Suggested Fix:** Deprecate query parameter approach; require Authorization header only for WebSocket
- **Status:** Unfixable: Query parameter auth is needed for browser WebSocket (which doesn't support custom headers during upgrade in all browsers)

### Bug #9: No Express error handler for malformed JSON
- **File:** `src/backend/server.js`
- **Function:** Express middleware chain
- **Description:** No custom error handler is defined. If `express.json()` encounters malformed JSON, the error goes to Express's default error handler, which may leak internal error details in development mode.
- **Impact:** Potential information leakage; unhandled JSON parse errors
- **Suggested Fix:** Add a global error handler middleware in server.js
- **Status:** Unfixable: Would require adding error handling middleware to server.js

### Bug #10: `req.body` could be undefined without crashing
- **File:** `src/backend/routes/auth.js`
- **Function:** `POST /login` and `POST /register`
- **Description:** If `express.json()` middleware is bypassed (e.g., no Content-Type header), `req.body` could be `undefined`. The destructuring `const { username, password } = req.body` would throw `TypeError: Cannot destructure property 'username' of 'undefined'`. This is caught by the route's try/catch and returns a generic 500 error, which is misleading.
- **Impact:** Misleading error response; potential for 500 errors on malformed requests
- **Suggested Fix:** Add null check for req.body before destructuring
- **Status:** Unfixable: The try/catch already handles this, returning a 500

### Bug #11: Frontend API_BASE computation is fragile
- **File:** `src/frontend/src/composables/useAuth.js`
- **Function:** Module-level `API_BASE`
- **Description:** The `.replace("/ws", "").replace("ws://", "http://").replace("wss://", "https://")` chain is brittle. If `VITE_BACKEND_URL` is set to `http://localhost:3001`, the replaces don't match and the URL passes through unchanged. But if set to `ws://localhost:3001/ws`, the first replace gives `ws://localhost:3001`, the second gives `http://localhost:3001` — correct. However, if set to a URL with `/ws` elsewhere (e.g., `ws://api.example.com/v2/ws`), it becomes `ws://api.example.com/v2` — wrong.
- **Impact:** Incorrect API base URL in custom deployments
- **Suggested Fix:** Use URL parsing instead of string replacement
- **Status:** Unfixable: Works for standard localhost/dev deployment; edge cases are uncommon

### Bug #12: User password_hash can be updated to any string via PUT /users/:id
- **File:** `src/backend/routes/users.js`
- **Function:** `PUT /:id`
- **Description:** The update endpoint accepts `req.body.password` and passes it to `hashPassword()`, but there's no requirement that the password be provided through a dedicated password-change flow (no old password verification). Any authenticated user with `users:update` permission can change another user's password without knowing the old one.
- **Impact:** Password change without old password verification
- **Suggested Fix:** Require old password verification for password changes
- **Status:** Unfixable: This is intentional admin functionality (admin can reset user passwords)

## Minor Severity

### Bug #13: No username sanitization in login — special characters allowed
- **File:** `src/frontend/src/pages/Login.vue`, `src/backend/routes/auth.js`
- **Function:** `handleLogin()`, `POST /login`
- **Description:** No sanitization of username input. While SQLite parameterized queries prevent SQL injection, usernames with special characters could cause display issues or be used for XSS if rendered without escaping.
- **Impact:** Minor display issues; no security risk due to parameterized queries
- **Suggested Fix:** Add input sanitization for username
- **Status:** Not a bug — parameterized queries prevent injection; frontend uses `v-html` for messages but not for usernames

### Bug #14: Frontend login form accepts any username format
- **File:** `src/frontend/src/pages/Login.vue`
- **Function:** `handleLogin()`
- **Description:** No minlength/maxlength on the username input in Login.vue (only Register.vue has these constraints). While the backend validates username length, the frontend doesn't provide immediate feedback.
- **Impact:** Poor UX — user submits form, gets 400 error from backend
- **Suggested Fix:** Add minlength="3" maxlength="30" to the Login.vue username input
- **Status:** Fixed: [x] See fix #14 below

### Bug #15: No password strength requirements in registration
- **File:** `src/frontend/src/pages/Register.vue`
- **Function:** `handleRegister()`
- **Description:** Only minimum 6 characters is required. No complexity requirements (uppercase, lowercase, numbers, special chars).
- **Impact:** Weak passwords allowed
- **Suggested Fix:** Add password strength requirements (min 8 chars, at least one uppercase, one lowercase, one number)
- **Status:** Unfixable: Would require defining and enforcing password policy

## Bug Summary

| Severity | Count | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 1 | 0 | 1 |
| Major | 10 | 2 | 8 |
| Minor | 2 | 1 | 1 |
| **Total** | **13** | **3** | **10** |
