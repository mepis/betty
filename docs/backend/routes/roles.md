# Roles Routes

**Tags:** `backend`, `api`, `roles`, `permissions`, `rest`, `crud`, `routes`, `admin`, `rbac`

## Overview

The roles routes module (`src/backend/routes/roles.js`) exposes the role and permission management API at `/api/roles`. All routes require authentication.

## Endpoints

### `GET /api/roles`

List all roles with their permissions. Requires `roles:read` permission.

**Response:** `200` — Array of roles, each enriched with a `permissions` array.

### `GET /api/roles/:id`

Get a single role with its permissions. Requires `roles:read` permission.

**Response:** `200` — Role object or `404`.

### `GET /api/roles/permissions/available`

List all possible resource-action pairs. Requires `roles:read` permission.

**Response:** `200` — Array of 30 possible permissions (5 resources × 6 actions).

### `POST /api/roles`

Create a custom role. Requires `admin` or `super_admin`.

**Request body:**
```json
{
  "name": "editor",
  "description": "Content editor role",
  "permissions": [
    { "resource": "chat", "action": "use" },
    { "resource": "sessions", "action": "create" }
  ]
}
```

**Validation:**
- `name`: 2-30 characters, starts with a letter, lowercase + digits + underscores only
- `name` must be unique

**Response:** `201` — Created role or `400`/`409` on error.

### `PUT /api/roles/:id`

Update a custom role's name and description. Requires `admin` or `super_admin`.

- System roles cannot be modified (returns `403`)

**Response:** `200` — Updated role or `403`/`404`.

### `DELETE /api/roles/:id`

Delete a custom role. Requires `admin` or `super_admin`.

- System roles cannot be deleted (returns `403`)
- Roles assigned to users cannot be deleted (returns `403`)

**Response:** `200` — Success or `403`/`404`.

### `PUT /api/roles/:id/permissions`

Replace all permissions for a custom role. Requires `admin` or `super_admin`.

**Request body:**
```json
{
  "permissions": [
    { "resource": "users", "action": "read" },
    { "resource": "chat", "action": "use" }
  ]
}
```

- System roles cannot be modified (returns `403`)

**Response:** `200` — Updated role or `400`/`403`/`404`.

### `POST /api/roles/:id/permissions`

Add a single permission to a custom role. Requires `admin` or `super_admin`.

**Request body:**
```json
{ "resource": "users", "action": "read" }
```

**Response:** `200` — Updated role or `400`/`403`/`404`.

### `DELETE /api/roles/:id/permissions`

Remove a single permission from a custom role. Requires `admin` or `super_admin`.

**Request body:**
```json
{ "resource": "users", "action": "read" }
```

**Response:** `200` — Updated role or `400`/`403`/`404`.

## Permission Requirements

| Endpoint | Requirement |
|---|---|
| `GET /` | `roles:read` |
| `GET /:id` | `roles:read` |
| `GET /permissions/available` | `roles:read` |
| `POST /` | `admin` or `super_admin` |
| `PUT /:id` | `admin` or `super_admin` |
| `DELETE /:id` | `admin` or `super_admin` |
| `PUT /:id/permissions` | `admin` or `super_admin` |
| `POST /:id/permissions` | `admin` or `super_admin` |
| `DELETE /:id/permissions` | `admin` or `super_admin` |

## Example

```bash
# List all roles
curl http://localhost:3001/api/roles \
  -H "Authorization: Bearer <token>"

# Create a role
curl -X POST http://localhost:3001/api/roles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"viewer","description":"Read-only viewer","permissions":[{"resource":"chat","action":"use"}]}'

# Set permissions
curl -X PUT http://localhost:3001/api/roles/5/permissions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"permissions":[{"resource":"chat","action":"use"},{"resource":"sessions","action":"read"}]}'
```

## Related

- [[Auth Middleware]] — Enforces authentication and admin checks
- [[Role Repository]] — Role CRUD operations
- [[Permission Repository]] — Permission CRUD operations
- [[RoleManager Component]] — Frontend role management UI
- [[Seeds]] — Built-in roles that cannot be modified
