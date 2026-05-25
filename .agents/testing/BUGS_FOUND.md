# Bugs Found During Login Page Testing

## Bug 1: Malformed ternary operator in useAuth.js (CRITICAL - FIXED)
- **File:** `src/frontend/src/composables/useAuth.js`
- **Line:** 5-8
- **Issue:** Malformed ternary operator causing `SyntaxError: Unexpected token ':'`
- **Before:**
  ```js
  const API_BASE = import.meta.env.VITE_API_BASE
    : import.meta.env.DEV
      ? "http://localhost:3001"
      : ...
  ```
- **After:**
  ```js
  const API_BASE = import.meta.env.VITE_API_BASE
    ? import.meta.env.VITE_API_BASE
    : import.meta.env.DEV
      ? "http://localhost:3001"
      : ...
  ```
- **Impact:** Entire frontend failed to load. Blank white page.
- **Status:** FIXED ✓

## Bug 2: Double /api in API URLs (MAJOR - FIXED)
- **File:** `src/frontend/.env.development`
- **Issue:** `VITE_API_BASE` was set to `http://100.105.3.99:3001/api`, but the route paths in useAuth.js already include `/api`, resulting in URLs like `/api/api/auth/login` (404).
- **Before:** `VITE_API_BASE=http://100.105.3.99:3001/api`
- **After:** `VITE_API_BASE=http://localhost:3001`
- **Impact:** Login API returned 404, login never worked.
- **Status:** FIXED ✓

## Bug 3: Login page doesn't navigate after successful login (MINOR - OBSERVED)
- **File:** `src/frontend/src/App.vue`
- **Issue:** After successful login, the page content switches to chat view correctly, but the URL remains `/login` (not updated to reflect the current page). The app uses `currentPage` state + hash routing, but the hash isn't updated after login.
- **Impact:** URL doesn't reflect current page state. Back button may not work as expected.
- **Status:** OBSERVED (not fixed - minor UX issue)

## Bug 4: Hash-based routing doesn't handle direct navigation (MINOR - OBSERVED)
- **File:** `src/frontend/src/App.vue`
- **Issue:** Navigating directly to `#/register` shows the login page because `onMounted` only runs once and doesn't handle hash changes after mount.
- **Impact:** Direct links to `#/register` don't work.
- **Status:** OBSERVED (not fixed - minor issue)
