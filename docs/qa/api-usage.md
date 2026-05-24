# API Usage Examples

**Tags:** `qa`, `api`, `rest`, `curl`, `examples`, `authentication`, `users`, `roles`

## Authentication

### Register a New User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@example.com",
    "password": "alice123"
  }'

# Response (201):
# {
#   "message": "User created successfully",
#   "token": "eyJhbGciOiJIUzI1NiIs...",
#   "user": {
#     "id": 2,
#     "username": "alice",
#     "email": "alice@example.com",
#     "role": "user"
#   }
# }
```

### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# Save the token for later use
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')
```

### Get Current User

```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Response (200):
# {
#   "id": 1,
#   "username": "admin",
#   "email": "admin@betty.local",
#   "role": "super_admin",
#   "role_id": 1,
#   "created_at": "2024-01-15 10:30:00"
# }
```

### Logout

```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

## User Management

### List Users

```bash
curl http://localhost:3001/api/users \
  -H "Authorization: Bearer $TOKEN"
```

### Create User

```bash
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "bob",
    "email": "bob@example.com",
    "password": "bob123",
    "role_id": 4
  }'
```

### Update User

```bash
curl -X PUT http://localhost:3001/api/users/2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role_id": 2}'
```

### Delete User

```bash
curl -X DELETE http://localhost:3001/api/users/2 \
  -H "Authorization: Bearer $TOKEN"
```

## Role Management

### List Roles with Permissions

```bash
curl http://localhost:3001/api/roles \
  -H "Authorization: Bearer $TOKEN"

# Response includes built-in roles:
# [
#   {
#     "id": 1,
#     "name": "super_admin",
#     "is_system": 1,
#     "permissions": [...]
#   },
#   ...
# ]
```

### Create Custom Role

```bash
curl -X POST http://localhost:3001/api/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "viewer",
    "description": "Read-only access",
    "permissions": [
      {"resource": "chat", "action": "use"},
      {"resource": "sessions", "action": "read"}
    ]
  }'
```

### Set Role Permissions

```bash
curl -X PUT http://localhost:3001/api/roles/5/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": [
      {"resource": "users", "action": "read"},
      {"resource": "chat", "action": "use"}
    ]
  }'
```

### Get Available Permissions

```bash
curl http://localhost:3001/api/roles/permissions/available \
  -H "Authorization: Bearer $TOKEN"

# Returns all 30 possible resource-action pairs
```

## Error Responses

All endpoints return consistent error format:

```json
{ "error": "Description of what went wrong" }
```

| Status | Meaning |
|---|---|
| `400` | Bad request / validation error |
| `401` | Authentication required or invalid token |
| `403` | Permission denied |
| `404` | Resource not found |
| `409` | Conflict (duplicate username/email/role) |
| `500` | Server error |

## Related

- [[Auth Routes]] — Authentication API reference
- [[Users Routes]] — User management API reference
- [[Roles Routes]] — Role management API reference
- [[JWT Authentication]] — Token format and lifecycle
