# Register Page

**Tags:** `frontend`, `vue`, `page`, `auth`, `register`, `form`, `ui`

## Overview

The Register page (`src/frontend/src/pages/Register.vue`) provides a form for new users to create an account.

## Template

- Centered auth card with logo and "Create your account" heading
- Username input (3-30 characters)
- Email input (email format)
- Password input (minimum 6 characters)
- Confirm password input
- Submit button (disabled while loading or validation fails)
- Link to login page

## Validation

| Field | Rule |
|---|---|
| Username | Required, 3-30 characters |
| Email | Required, valid email format |
| Password | Required, minimum 6 characters |
| Confirm password | Must match password |

The `canSubmit` computed property enforces all validation rules before enabling the submit button.

## Behavior

1. On mount: focuses the username field
2. On submit: checks password match, then calls `useAuth().register()`
3. On success: emits `register-success` event to parent (App)
4. On failure: displays error message in the card

## Props / Emits

| Emit | Payload | When |
|---|---|---|
| `register-success` | `user: object` | After successful registration |

## Related

- [[Auth Composable]] — Provides `register()`, `isLoading`, `error`
- [[App Component]] — Parent that handles `register-success`
- [[Auth Routes]] — Backend `/api/auth/register` endpoint
- [[Login Page]] — Login form
