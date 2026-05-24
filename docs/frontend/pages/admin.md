# Admin Page

**Tags:** `frontend`, `vue`, `page`, `admin`, `management`, `ui`

## Overview

The Admin page (`src/frontend/src/pages/Admin.vue`) provides an administrative interface for managing users and roles. It is only accessible to users with `admin` or `super_admin` role.

## Layout

- Header with "Admin Panel" title and "Back to Chat" button
- Tab navigation: Users / Roles & Permissions
- Content area with the active tab's component

## Tabs

| Tab | Component | Description |
|---|---|---|
| Users | `UserList` | User management (create, edit, delete) |
| Roles & Permissions | `RoleManager` | Role and permission management |

## Data Flow

1. On mount: fetches roles from `GET /api/roles`
2. Roles are passed as props to `UserList` (for role assignment dropdown)
3. `RoleManager` fetches its own data independently

## Props / Emits

| Prop | Type | Description |
|---|---|---|
| — | — | No props |

| Emit | Payload | When |
|---|---|---|
| `close` | — | When "Back to Chat" is clicked |

## Related

- [[App Component]] — Shows Admin page when `currentPage === 'admin'`
- [[UserList Component]] — User management sub-component
- [[RoleManager Component]] — Role management sub-component
- [[Users Routes]] — Backend user API
- [[Roles Routes]] — Backend role API
