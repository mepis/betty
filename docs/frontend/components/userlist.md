# UserList Component

**Tags:** `frontend`, `vue`, `component`, `admin`, `users`, `crud`, `table`, `modal`

## Overview

The UserList component (`src/frontend/src/components/admin/UserList.vue`) displays a table of all users with inline create, edit, and delete operations via modals.

## Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `roles` | `Array` | Yes | List of roles for the role assignment dropdown |

## Features

### User Table

Displays: ID, Username, Email, Role (badge), Created date, Actions (Edit/Delete buttons).

### Create User Modal

Form fields: Username, Email, Password, Role (select from `roles` prop).

### Edit User Modal

Form fields: Username, Email, New Password (optional), Role (select).

### Delete Protection

- Self-deletion is disabled (button disabled when `user.id === currentUserId`)
- Confirmation dialog before delete

## API Calls

| Action | Method | Endpoint |
|---|---|---|
| List users | `GET` | `/api/users` |
| Create user | `POST` | `/api/users` |
| Update user | `PUT` | `/api/users/:id` |
| Delete user | `DELETE` | `/api/users/:id` |

## Exposed Methods

| Method | Description |
|---|---|
| `fetchUsers()` | Refresh the user list (called by parent) |

## Related

- [[Admin Page]] — Parent component
- [[Users Routes]] — Backend API
- [[RoleManager Component]] — Sibling component
