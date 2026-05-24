# RoleManager Component

**Tags:** `frontend`, `vue`, `component`, `admin`, `roles`, `permissions`, `crud`, `table`, `modal`

## Overview

The RoleManager component (`src/frontend/src/components/admin/RoleManager.vue`) displays a table of all roles with their permissions, and provides modals for creating and editing custom roles.

## Features

### Role Table

Displays: Name, Description, Permissions (chips), Type (System/Custom badge), Actions (Edit/Delete for custom roles only).

### Create Role Modal

Form fields:
- **Name:** Lowercase letters, digits, underscores (must start with a letter)
- **Description:** Free text
- **Permissions:** Grid of checkboxes (5 resources × 6 actions)

### Edit Role Modal

Same fields as create. Permissions are toggled individually.

### Permission Grid

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ Resource │ create   │ read     │ update   │ delete   │ use      │ manage   │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ users    │ ☐        │ ☐        │ ☐        │ ☐        │ ☐        │ ☐        │
│ roles    │ ☐        │ ☐        │ ☐        │ ☐        │ ☐        │ ☐        │
│ sessions │ ☐        │ ☐        │ ☐        │ ☐        │ ☐        │ ☐        │
│ chat     │ ☐        │ ☐        │ ☐        │ ☐        │ ☐        │ ☐        │
│ system   │ ☐        │ ☐        │ ☐        │ ☐        │ ☐        │ ☐        │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

## API Calls

| Action | Method | Endpoint |
|---|---|---|
| List roles | `GET` | `/api/roles` |
| Create role | `POST` | `/api/roles` |
| Update role | `PUT` | `/api/roles/:id` |
| Delete role | `DELETE` | `/api/roles/:id` |
| Update permissions | `PUT` | `/api/roles/:id/permissions` |

## Exposed Methods

| Method | Description |
|---|---|
| `fetchRoles()` | Refresh the role list (called by parent) |

## Related

- [[Admin Page]] — Parent component
- [[Roles Routes]] — Backend API
- [[UserList Component]] — Sibling component
- [[Seeds]] — Built-in roles displayed as "System"
