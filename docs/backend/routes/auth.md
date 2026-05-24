# Auth Routes

**Tags:** `backend`, `api`, `auth`, `rest`, `login`, `register`, `routes`

## Overview

The auth routes module (`src/backend/routes/auth.js`) exposes the authentication API at `/api/auth`. It handles user registration, login, session retrieval, and logout.

## Endpoints

### `POST /api/auth/register`

Register a new user account.

**Request body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Validation:**
- `username`: 3-30 characters, required
- `email`: valid email format, required
- `password`: minimum 6 characters, required
- Username and email must be unique

**Responses:**

| Status | Body | Description |
|---|---|---|
| `201` | `{ token, user, message }` | User created, auto-logged in |
| `400` | `{ error }` | Validation failed |
| `409` | `{ error }` | Username or email already taken |
| `500` | `{ error }` | Server error |

### `POST /api/auth/login`

Authenticate with username and password.

**Request body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Responses:**

| Status | Body | Description |
|---|---|---|
| `200` | `{ token, user }` | Login successful |
| `400` | `{ error }` | Missing credentials |
| `401` | `{ error }` | Invalid credentials |
| `500` | `{ error }` | Server error |

### `GET /api/auth/me`

Get the authenticated user's profile. Requires `Authorization: Bearer <token>`.

**Responses:**

| Status | Body | Description |
|---|---|---|
| `200` | `{ id, username, email, role, role_id, created_at }` | User profile |
| `401` | `{ error }` | Not authenticated |
| `404` | `{ error }` | User not found |

### `POST /api/auth/logout`

Revoke the current session token. Requires `Authorization: Bearer <token>`.

**Responses:**

| Status | Body | Description |
|---|---|---|
| `200` | `{ message: "Logged out" }` | Session revoked |
| `401` | `{ error }` | Not authenticated |

## User Response Format

```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@betty.local",
  "role": "super_admin",
  "role_id": 1,
  "created_at": "2024-01-15 10:30:00"
}
```

## Example Session Flow

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"pass123"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get profile
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <token>"

# Logout
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer <token>"
```

## Related

- [[Password Hashing]] — bcrypt hashing used for registration/login
- [[JWT Authentication]] — Token creation and validation
- [[Auth Middleware]] — Protects `/me` and `/logout` endpoints
- [[User Repository]] — User CRUD operations
- [[Login Page]] — Frontend login form
- [[Register Page]] — Frontend registration form
