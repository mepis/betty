# Repositories

**Tags:** `backend`, `database`, `repository`, `data-access`, `sqlite`, `crud`

## Overview

The repositories module (`src/backend/db/repositories.js`) provides a data access layer for all database entities. Each repository encapsulates CRUD operations for its entity.

## Role Repository (`RoleRepo`)

| Method | Params | Returns | Description |
|---|---|---|---|
| `findAll()` | — | `Role[]` | All roles, system first |
| `findById(id)` | `number` | `Role \| undefined` | Single role by ID |
| `findByName(name)` | `string` | `Role \| undefined` | Single role by name |
| `findCustom()` | — | `Role[]` | Custom (non-system) roles only |
| `create(name, description?)` | `string, string` | `Role` | Create a new custom role |
| `update(id, { name?, description? })` | `number, object` | `Role \| null` | Update a custom role (throws for system roles) |
| `delete(id)` | `number` | `boolean` | Delete a custom role (throws if assigned to users) |

## Permission Repository (`PermissionRepo`)

### Defined Resources and Actions

```js
const ALL_RESOURCES = ["users", "roles", "sessions", "chat", "system"];
const ALL_ACTIONS = ["create", "read", "update", "delete", "use", "manage"];
```

### Methods

| Method | Params | Returns | Description |
|---|---|---|---|
| `findByRole(roleId)` | `number` | `Permission[]` | All permissions for a role |
| `hasPermission(roleId, resource, action)` | `number, string, string` | `boolean` | Check a specific permission |
| `hasAnyPermission(roleId, resource)` | `number, string` | `boolean` | Check any permission on a resource |
| `addPermission(roleId, resource, action)` | `number, string, string` | `boolean` | Add a single permission (idempotent) |
| `removePermission(roleId, resource, action)` | `number, string, string` | `void` | Remove a single permission |
| `setPermissions(roleId, permissions)` | `number, Permission[]` | `void` | Replace all permissions (transactional) |
| `getAllPossible()` | — | `Permission[]` | All 30 possible resource-action pairs |

## User Repository (`UserRepo`)

All queries that return users include a LEFT JOIN to `roles` for `role_name`.

| Method | Params | Returns | Description |
|---|---|---|---|
| `findAll()` | — | `User[]` | All users with role info |
| `findById(id)` | `number` | `User \| undefined` | Single user by ID |
| `findByUsername(username)` | `string` | `User \| undefined` | Single user by username |
| `findByEmail(email)` | `string` | `User \| undefined` | Single user by email |
| `create(username, email, passwordHash, roleId?)` | `string, string, string, number?` | `User` | Create user (defaults to `user` role) |
| `update(id, updates)` | `number, object` | `User \| null` | Update user fields |
| `delete(id)` | `number` | `boolean` | Delete user by ID |

### Update Fields

`updates` object may contain: `username`, `email`, `password_hash`, `role_id`.

## Session Repository (`SessionRepo`)

| Method | Params | Returns | Description |
|---|---|---|---|
| `create(userId, tokenHash, expiresAt)` | `number, string, string` | `{ id, user_id }` | Create a session record |
| `findByTokenHash(tokenHash)` | `string` | `Session \| undefined` | Find valid (non-expired) session by hash |
| `deleteById(id)` | `number` | `void` | Delete a single session |
| `deleteByUserId(userId)` | `number` | `void` | Delete all sessions for a user |

## Transaction Support

`PermissionRepo.setPermissions()` uses `better-sqlite3` transactions to atomically clear and re-insert all permissions for a role.

## Related

- [[Database]] — Schema and connection management
- [[Seeds]] — Uses repositories to populate initial data
- [[Auth Middleware]] — Uses PermissionRepo for authorization checks
- [[JWT Authentication]] — Uses SessionRepo for session lifecycle
- [[Auth Routes]] — Uses UserRepo for login/register
- [[Users Routes]] — Uses UserRepo for CRUD operations
- [[Roles Routes]] — Uses RoleRepo and PermissionRepo
