# Backend / Auth Routes

## Tags

`backend`, `authentication`, `routes`, `express`, `api`, `login`, `register`, `security`

---

## Overview

`src/backend/routes/auth.js` defines the authentication endpoints mounted at `/api/auth`.

## Rate Limiting

Simple in-memory rate limiter with periodic pruning (every 60 seconds).

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/login` | 10 attempts | 1 minute |
| `/api/auth/register` | 3 attempts | 1 minute |

## Endpoints

### `POST /api/auth/register`

Create a new user account.

**Request body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Validation:**

- Email: required, valid format (RFC 5321 regex), max 254 characters
- Password: required, min 6 characters, max 72 bytes (bcrypt limit)
- Name: optional, max 100 characters

**Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 201 | Success | `{ user, expiresIn, message }` + cookies |
| 400 | Validation error | `{ error }` |
| 409 | Email already exists | `{ error }` |
| 429 | Rate limited | `{ error }` |

**Behavior:**

- First user is automatically assigned `admin` role
- Sets `access_token` (24h) and `refresh_token` (7d) as httpOnly cookies
- Updates `lastLogin` timestamp

### `POST /api/auth/login`

Authenticate with email and password.

**Request body:**

```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Validation:**

- Email: required, valid format
- Password: required, max 72 bytes

**Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 200 | Success | `{ user, expiresIn }` + cookies |
| 401 | Invalid credentials | `{ error: "Invalid email or password" }` |
| 400 | Validation error | `{ error }` |
| 429 | Rate limited | `{ error }` |

**Security:**

- Timing attack mitigation: when user is not found, still performs bcrypt comparison against a dummy hash to prevent user enumeration via response timing

### `POST /api/auth/logout`

Clear authentication cookies.

**Responses:**

| Status | Body |
|--------|------|
| 200 | `{ message: "Logged out successfully" }` |

### `POST /api/auth/refresh`

Refresh the access token using the refresh token cookie.

**Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 200 | Success | `{ expiresIn: "24h" }` + new cookie |
| 401 | No/invalid refresh token | Clears all cookies |

### `GET /api/auth/me`

Return the current authenticated user.

**Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 200 | Authenticated | `{ user }` |
| 401 | Not authenticated | `{ error }` |

## Cookie Configuration

| Cookie | httpOnly | secure | sameSite | maxAge |
|--------|----------|--------|----------|--------|
| `access_token` | `true` | `NODE_ENV === "production"` | `lax` | 24 hours |
| `refresh_token` | `true` | `NODE_ENV === "production"` | `lax` | 7 days |

## Related

- [[Backend / Auth Utils]] — Token generation, password hashing
- [[Backend / Auth Middleware]] — Request authentication
- [[Backend / User Store]] — User CRUD operations
- [[Backend / Server]] — Route mounting
