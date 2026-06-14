# Backend / User Store

## Tags

`backend`, `users`, `persistence`, `file-storage`, `json`, `authentication`, `crud`

---

## Overview

`src/backend/user-store.js` provides file-based user persistence. Users are stored as individual JSON files in `~/.betty/users/`.

## Configuration

| Constant | Value | Description |
|----------|-------|-------------|
| `USERS_DIR` | `~/.betty/users/` | Storage directory |

## User Schema

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "passwordHash": "$2b$12$...",
  "name": "John Doe",
  "role": "user",
  "createdAt": 1718380800000,
  "lastLogin": 1718380800000,
  "updatedAt": 1718380800000
}
```

## Functions

### `createUser({ email, passwordHash, name, role })`

Create a new user with a UUID. Auto-assigns `admin` role to the first user.

- **Input:** Email, bcrypt password hash, optional name, role (defaults to `"user"`)
- **Output:** User object (includes `passwordHash`)

### `loadUser(userId)`

Load a user by ID.

- **Input:** User ID string
- **Output:** User object or `null` if not found
- **Throws:** `Error` if userId is empty

### `saveUser(user)`

Save a user to disk.

- **Input:** User object with `id` field
- **Throws:** `Error` if disk write fails

### `updateUser(userId, updates)`

Update a user with whitelisted fields.

- **Input:** User ID + updates object
- **Allowed fields:** `email`, `name`, `lastLogin`, `role` (admin/user only)
- **Auto-updated:** `updatedAt` timestamp
- **Output:** Updated user or `null` if not found

### `deleteUser(userId)`

Delete a user file.

- **Input:** User ID string
- **Output:** `true` if deleted, `false` if not found or error

### `getUserByEmail(email)`

Find a user by email (case-insensitive).

- **Input:** Email string
- **Output:** User object or `null`
- **Note:** Scans all files — not indexed

### `listUsers()`

List all users, sorted by `createdAt` descending. Excludes `passwordHash` from results.

- **Output:** Array of safe user objects

### `hasUsers()`

Check if any users exist.

- **Output:** `true` if at least one user exists

## File Layout

```
~/.betty/users/
├── a1b2c3d4-....json   ← User 1
├── e5f6g7h8-....json   ← User 2
└── ...
```

## Security

- `updateUser()` uses a whitelist to prevent privilege escalation via arbitrary field injection
- `passwordHash` is never included in `listUsers()` output
- Role changes are gated through admin routes with `authorize("admin")` middleware

## Related

- [[Backend / Auth Routes]] — Uses `createUser`, `getUserByEmail`, `updateUser`
- [[Backend / Admin Routes]] — Uses all user CRUD operations
- [[Backend / Auth Middleware]] — Uses `loadUser` for token verification
- [[Architecture]] — Security overview
