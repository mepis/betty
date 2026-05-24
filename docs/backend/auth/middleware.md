# Auth Middleware

**Tags:** `backend`, `auth`, `middleware`, `permission`, `rbac`, `security`, `express`

## Overview

The middleware module (`src/backend/auth/middleware.js`) provides Express middleware functions for authentication and authorization. It enforces JWT-based authentication and role-based access control (RBAC).

## Middleware Functions

### `authMiddleware(req, res, next)`

Required authentication. Extracts the JWT from the `Authorization: Bearer <token>` header and validates it.

- **401** if no `Authorization` header or invalid/expired token
- Sets `req.user` on success

### `optionalAuthMiddleware(req, res, next)`

Optional authentication. Sets `req.user` if a valid token is present, but does not require it. Always calls `next()`.

### `requirePermission(resource, action)`

Factory function returning middleware that checks if the authenticated user's role has the specified permission.

- **401** if not authenticated
- **403** if the role lacks the permission (super_admin bypasses all checks)
- Calls `next()` if authorized

### `requireRole(roleName)`

Factory function returning middleware that requires the user to have a specific role name.

- **401** if not authenticated
- **403** if role doesn't match

### `requireAdmin(req, res, next)`

Requires the user to have `admin` or `super_admin` role.

- **401** if not authenticated
- **403** if not admin or super_admin

## Permission Model

The RBAC system uses a resource-action permission model:

| Resource | Actions |
|---|---|
| `users` | create, read, update, delete |
| `roles` | create, read, update, delete |
| `sessions` | create, read, update, delete |
| `chat` | use |
| `system` | manage |

### Super Admin Bypass

Users with the `super_admin` role bypass all permission checks. This is checked in `requirePermission()` by looking up the role name.

## Usage Examples

```js
// Require auth + users:read permission
router.get("/", authMiddleware, requirePermission("users", "read"), handler);

// Require admin role
router.post("/", requireAdmin, handler);

// Optional auth
router.get("/public", optionalAuthMiddleware, handler);
```

## Related

- [[JWT Authentication]] — Token generation and validation
- [[Role Repository]] — Role lookups used by middleware
- [[Permission Repository]] — Permission checks used by middleware
- [[Auth Routes]] — Uses `authMiddleware` for protected endpoints
- [[Users Routes]] — Uses `requirePermission` and `requireAdmin`
- [[Roles Routes]] — Uses `requirePermission` and `requireAdmin`
