# Login Page

**Tags:** `frontend`, `vue`, `page`, `auth`, `login`, `form`, `ui`

## Overview

The Login page (`src/frontend/src/pages/Login.vue`) provides a form for users to authenticate with their username and password.

## Template

- Centered auth card with logo and "Sign in" heading
- Username input (text)
- Password input (password)
- Submit button (disabled while loading or inputs empty)
- Link to registration page

## Behavior

1. On mount: focuses the username field
2. On submit: calls `useAuth().login()` with form values
3. On success: emits `login-success` event to parent (App)
4. On failure: displays error message in the card

## Props / Emits

| Emit | Payload | When |
|---|---|---|
| `login-success` | `user: object` | After successful login |

## Related

- [[Auth Composable]] — Provides `login()`, `isLoading`, `error`
- [[App Component]] — Parent that handles `login-success`
- [[Auth Routes]] — Backend `/api/auth/login` endpoint
- [[Register Page]] — Registration form
