# Users Routes

**Tags:** `backend`, `api`, `users`, `rest`, `crud`, `routes`, `admin`

## Overview

The users routes module (`src/backend/routes/users.js`) exposes the user management API at `/api/users`. All routes require authentication.

## Endpoints

### `GET /api/users`

List all users. Requires `users:read` permission.

**Response:** `200` — Array of users with role info.

### `GET /api/users/:id`

Get a single user by ID. Requires `users:read` permission.

**Response:** `200` — User object or `404`.

### `POST /api/users`

Create a new user. Requires `admin` or `super_admin` role.

**Request body:**
```json
{
  "username": "newuser",
  "email": "new@example.com",
  "password": "pass123",
  "role_id": 4
}
```

`role_id` is optional — defaults to the `user` role.

**Response:** `201` — Created user or `400`/`409` on error.

### `PUT /api/users/:id`

Update a user. Requires `users:update` permission.

**Request body** (all fields optional):
```json
{
  "username": "newname",
  "email": "new@example.com",
  "password": "newpass123",
  "role_id": 2
}
```

- `password` is hashed before storage
- `username` and `email` uniqueness is enforced
- `role_id` must reference an existing role

**Response:** `200` — Updated user or `404`/`409` on error.

### `DELETE /api/users/:id`

Delete a user. Requires `users:delete` permission.

- Self-deletion is blocked (returns `403`)

**Response:** `200` — Success or `403`/`404`.

## Permission Requirements

| Endpoint | Permission | Role Shortcut |
|---|---|---|
| `GET /` | `users:read` | — |
| `GET /:id` | `users:read` | — |
| `POST /` | — | `admin` or `super_admin` |
| `PUT /:id` | `users:update` | — |
| `DELETE /:id` | `users:delete` | — |

## Example

```bash
# List users
curl http://localhost:3001/api/users \
  -H "Authorization: Bearer <token>"

# Create user
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","email":"bob@example.com","password":"bob123"}'

# Update user
curl -X PUT http://localhost:3001/api/users/2 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"role_id": 2}'

# Delete user
curl -X DELETE http://localhost:3001/api/users/2 \
  -H "Authorization: Bearer <token>"
```

## Related

- [[Auth Middleware]] — Enforces authentication and permissions
- [[Password Hashing]] — Hashes passwords on create/update
- [[User Repository]] — Data access layer
- [[UserList Component]] — Frontend user management UI
- [[Seeds]] — Built-in roles referenced by role_id
