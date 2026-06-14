# Backend / Auth Middleware

## Tags

`backend`, `authentication`, `middleware`, `express`, `security`, `jwt`, `authorization`

---

## Overview

`src/backend/auth-middleware.js` provides three middleware functions for Express.js request authentication and authorization.

## Functions

### `authenticate(req, res, next)`

Validates the access token from either the `Authorization: Bearer <token>` header or the `access_token` cookie. Sets `req.user` if valid.

**Behavior:**

1. If `AUTH_ENABLED=false`, skip verification and call `next()`
2. Extract token from Authorization header or cookie
3. If no token found:
   - For API/WebSocket requests: return 401
   - For HTML requests: call `next()` (frontend handles redirect)
4. Verify token with `verifyAccessToken()`
5. If invalid:
   - For API/WebSocket requests: return 401
   - For HTML requests: call `next()`
6. Load full user object with `loadUser(decoded.userId)`
7. If user not found: return 401 (API) or `next()` (HTML)
8. Strip `passwordHash` and attach safe user to `req.user`

### `requireAuth(req, res, next)`

Hard enforcement — returns 401 if `req.user` is not set. Use this for API endpoints that must be authenticated.

### `authorize(...roles)(req, res, next)`

Role-based authorization factory. Returns middleware that checks the user's role against the provided list.

**Usage:**

```js
// Admin-only
router.use(authorize("admin"));

// Admin or moderator
router.use(authorize("admin", "moderator"));

// All authenticated users (no args)
router.use(authorize());
```

**Behavior:**

1. If no user: return 401
2. If roles provided and user's role not in list: return 403
3. Otherwise: call `next()`

## Error Responses

| Scenario | API/WebSocket | HTML |
|----------|---------------|------|
| No token | 401 `"Authentication failed"` | `next()` (frontend redirect) |
| Invalid token | 401 `"Authentication failed"` | `next()` (frontend redirect) |
| User not found | 401 `"Authentication failed"` | `next()` (frontend redirect) |
| Insufficient role | 403 `"Insufficient permissions"` | N/A |

## Related

- [[Backend / Auth Utils]] — Token verification and generation
- [[Backend / User Store]] — User loading and persistence
- [[Backend / Server]] — Middleware registration
- [[Architecture]] — Security overview
