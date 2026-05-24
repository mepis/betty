# Auth Composable (`useAuth`)

**Tags:** `frontend`, `vue`, `composable`, `auth`, `token`, `login`, `state-management`

## Overview

The `useAuth` composable (`src/frontend/src/composables/useAuth.js`) manages authentication state across the Vue application. It provides shared reactive state for the JWT token, current user, and authentication actions.

## Shared State

The composable uses module-level refs, meaning all components calling `useAuth()` share the same state instance (singleton pattern).

| Ref | Type | Description |
|---|---|---|
| `token` | `ref<string>` | JWT token (stored in localStorage) |
| `currentUser` | `ref<object \| null>` | Current user profile |
| `isLoading` | `ref<boolean>` | Whether an auth request is in flight |
| `error` | `ref<string \| null>` | Last error message |

## API

### `isAuthenticated` (computed)

Returns `true` if a token is present.

### `login(username, password): Promise<object>`

Authenticate with the backend. Stores the token in `localStorage` and sets `currentUser`.

- Calls `POST /api/auth/login`
- Throws on failure

### `register(username, email, password): Promise<object>`

Register a new user. Auto-logs in on success.

- Calls `POST /api/auth/register`
- Throws on failure

### `logout(): Promise<void>`

Revoke the session and clear local state.

- Calls `POST /api/auth/logout`
- Removes token from `localStorage`
- Clears `currentUser`

### `fetchUser(): Promise<object \| null>`

Validate the current token and fetch user profile.

- Calls `GET /api/auth/me`
- Returns `null` if token is invalid/expired
- Clears local state on failure

### `getToken(): string`

Return the current token string. Used by the WebSocket composable.

### `hasPermission(resource, action): boolean`

Check if the current user's role has a specific permission. Uses a client-side permission matrix that mirrors the backend roles.

**Note:** `super_admin` bypasses all checks.

### `isAdmin(): boolean`

Returns `true` if the user has `admin` or `super_admin` role.

## Return Value

```js
{
  token: readonly,
  user: readonly,
  isAuthenticated: readonly,
  isLoading: readonly,
  error: readonly,
  login,
  register,
  logout,
  fetchUser,
  getToken,
  hasPermission,
  isAdmin,
}
```

State refs are exposed as `readonly` to prevent accidental mutation outside the composable.

## Backend URL Resolution

The API base URL is resolved in order:

1. `VITE_BACKEND_URL` env variable (converted from ws:// to http://)
2. Development: `http://localhost:3001`
3. Production: Same origin as the page

## Client-Side Permission Matrix

```js
const rolePermissions = {
  admin: [
    "users:create", "users:read", "users:update", "users:delete",
    "roles:create", "roles:read", "roles:update", "roles:delete",
    "sessions:create", "sessions:read", "sessions:update", "sessions:delete",
    "chat:use",
  ],
  moderator: [
    "users:read", "users:update",
    "sessions:read",
    "chat:use",
  ],
  user: [
    "sessions:create", "sessions:read", "sessions:update", "sessions:delete",
    "chat:use",
  ],
};
```

## Related

- [[App Component]] — Uses useAuth for routing and session restoration
- [[Login Page]] — Uses useAuth for login
- [[Register Page]] — Uses useAuth for registration
- [[WebSocket Composable]] — Uses getToken() for auth
- [[JWT Authentication]] — Backend token generation
