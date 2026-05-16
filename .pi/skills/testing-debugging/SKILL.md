---
name: testing-debugging
description: "Thoroughly test and debug every function, feature, and operation in the codebase. Step through all code paths, validate inputs and outputs, test the frontend as a user, fix all bugs, and produce a comprehensive audit report. Keep testing until zero bugs remain."
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Testing & Debugging Skill

You are a **thorough QA engineer and debugger**. Your job is to systematically test every function, feature, operation, and UI element in the codebase until you are confident that **zero bugs or issues remain**. When frontend bugs are found, fix them immediately. When backend bugs are found, fix them immediately. Then re-test to confirm the fix. Repeat until clean.

## WHEN TO USE

- Before any release, merge, or deployment
- After any significant feature addition or refactor
- When the user asks to "test everything", "audit the code", "find and fix all bugs", or "do a thorough QA pass"
- When you suspect there may be hidden bugs or edge cases
- As a quality gate before marking any implementation as complete

## CORE PRINCIPLE

**Never assume code is correct.** Every function call, every input/output, every branch, every edge case, every API endpoint, every route, every UI interaction must be verified. If you find a bug, fix it and re-test. Do not stop until you are confident there are no remaining issues.

## OUTPUT LOCATION

All testing artifacts go in `.agents/testing/` (create the directory on first use):

| File | Purpose |
|---|---|
| `.agents/testing/STATE.md` | Current progress, scope, and checkpoints |
| `.agents/testing/TEST_REPORT.md` | Final comprehensive audit report |
| `.agents/testing/BUGS_FOUND.md` | Log of every bug found and fixed |
| `.agents/testing/SNAPSHOTS/` | Browser screenshots from frontend testing |

---

## WORKFLOW OVERVIEW

The testing workflow has **6 phases**. Proceed sequentially — do not skip phases.

```
Phase 1: Reconnaissance & Scope
    ↓
Phase 2: Backend Code Audit (functions, logic, data flow)
    ↓
Phase 3: Frontend Testing (user-flow testing via Playwright)
    ↓
Phase 4: Bug Fixing & Re-Testing
    ↓
Phase 5: Regression & Edge-Case Testing
    ↓
Phase 6: Final Report Generation
```

---

## PHASE 1: RECONNAISSANCE & SCOPE

**Objective:** Understand the full codebase structure and define what needs to be tested.

### Actions

1. **Map the codebase structure**
   - Run `find` or `ls` to understand the directory layout
   - Identify all major modules, packages, and directories
   - Identify entry points (main files, index files, API routes, etc.)

2. **Identify all functions and features**
   - Find all exported functions, classes, and modules
   - Identify all API endpoints (routes, controllers, handlers)
   - Identify all components (React, Vue, Svelte, etc.)
   - Identify all utility/helper functions
   - Identify all database models, schemas, and migrations

3. **Identify the frontend application**
   - Find the frontend root (e.g., `src/`, `app/`, `frontend/`, `web/`)
   - Identify the framework (React, Vue, Svelte, etc.)
   - Identify the dev server port and URL
   - Identify key pages and routes

4. **Initialize state file**

```markdown
---
scope: "Full codebase audit"
started_at: "YYYY-MM-DD HH:MM"
last_updated: "YYYY-MM-DD HH:MM"
current_phase: "Phase 1"
status: "active"
---

## Codebase Map
- Module 1: description
- Module 2: description

## Functions to Test
- Function name — file — purpose
- Function name — file — purpose

## API Endpoints to Test
- METHOD /path — description
- METHOD /path — description

## Frontend Routes to Test
- /route — description
- /route — description

## Scope
- In scope: [list]
- Out of scope: [list, or "None — everything is in scope"]
```

5. **Start the dev server** (if a frontend exists and is not already running)
   - Identify the start command from `package.json` (`npm run dev`, `yarn dev`, `pnpm dev`, etc.)
   - Start the server in the background
   - Wait for it to be ready (check logs or curl the health endpoint)
   - Record the URL for Phase 3

---

## PHASE 2: BACKEND CODE AUDIT

**Objective:** Step through every function, feature, and operation in the backend code. Verify correctness of logic, inputs, outputs, and error handling.

### Scope

- All API routes and endpoint handlers
- All controllers, services, and business logic
- All database queries, models, and migrations
- All utility functions and helpers
- All middleware and authentication/authorization logic
- All configuration and environment handling
- All external API integrations
- All file I/O operations
- All scheduled jobs and background tasks

### Per-Function Audit Checklist

For **every** function in the codebase, verify:

#### 1. Function Signature
- [ ] Parameters are well-typed and documented
- [ ] Default values are sensible
- [ ] No unexpected `any` types or loose typing
- [ ] Return type is correctly specified

#### 2. Input Validation
- [ ] All inputs are validated at the function boundary
- [ ] Null/undefined inputs are handled
- [ ] Empty strings, arrays, and objects are handled
- [ ] Type coercion or type errors are handled gracefully
- [ ] Boundary values (0, -1, max integer, etc.) are considered
- [ ] Special characters and injection attempts are considered

#### 3. Logic Correctness
- [ ] The function does what its name and documentation say it does
- [ ] All branches of conditional logic are correct
- [ ] Loop conditions are correct (no infinite loops, off-by-one errors)
- [ ] State mutations are correct (no unexpected side effects)
- [ ] Async/await patterns are correct (no unhandled promise rejections)
- [ ] Error paths return appropriate error codes/messages

#### 4. Output Correctness
- [ ] Return values match the documented/expected format
- [ ] No sensitive data is leaked in responses
- [ ] Dates/times are formatted consistently
- [ ] Numeric precision is appropriate
- [ ] Boolean logic is correct (no truthy/falsy surprises)

#### 5. Error Handling
- [ ] Errors are caught and handled (not silently swallowed)
- [ ] Error messages are informative but not exposing internals
- [ ] Database errors are handled (connection failures, constraint violations)
- [ ] Network errors are handled (timeouts, retries)
- [ ] Unexpected errors don't crash the process

#### 6. Edge Cases
- [ ] Empty inputs produce sensible outputs
- [ ] Large inputs don't cause performance issues
- [ ] Concurrent access is handled (race conditions)
- [ ] Idempotency: calling the function twice produces the same result
- [ ] Cleanup: resources are released (file handles, connections, etc.)

### Audit Method

1. **Read every function** — don't skim. Read the full implementation.
2. **Trace the execution path** — mentally (or via comments) follow every branch.
3. **Check every call site** — verify the caller passes correct arguments.
4. **Check every dependency** — verify the functions it calls are correct.
5. **Log findings** — add every issue to `.agents/testing/BUGS_FOUND.md` with:
   - File path
   - Function name
   - Issue description
   - Severity (Critical / Major / Minor / Cosmetic)
   - Suggested fix (if obvious)

### Example Audit Log Entry

```markdown
### Bug #1 — `validateUserInput` in `src/auth/validation.ts`
- **Severity:** Major
- **Issue:** Does not check for empty string input. An empty string passes validation.
- **Fix:** Add `if (input.trim().length === 0) return false;` at line 15
- **Fixed:** [ ] (mark [x] when fixed)
```

### Critical Patterns to Watch For

| Pattern | Risk |
|---|---|
| `JSON.parse()` without try/catch | Crash on invalid JSON |
| `.find()` / `.findIndex()` without null check | `.map` / `.prop` on undefined |
| `.forEach` with async | Async code runs out of order |
| `Array.map` without return | Silent no-op |
| `req.body` used without validation | Injection, type errors |
| `process.env.X` used without default | `undefined` at runtime |
| Direct string concatenation in SQL | SQL injection |
| Unsanitized user input in HTML | XSS |
| `setInterval` without cleanup | Memory leak |
| Unbounded array growth | Memory leak |
| Unhandled Promise rejection | Silent failure |
| `try/catch` with empty catch block | Swallowed errors |
| Deep object access without null checks | `Cannot read property of undefined` |
| Mutation of shared state without locking | Race conditions |
| Floating-point arithmetic for money | Precision errors |
| Regex without anchoring | Unexpected matches |
| `eval()` or `new Function()` | Code injection |
| Unescaped user input in URL params | Path traversal |
| Race condition in file I/O | Corrupted data |
| Circular dependency in module imports | Startup crash |

---

## PHASE 3: FRONTEND TESTING (User-Flow Testing via Playwright)

**Objective:** Test every page, component, and interaction as an end user would experience it.

### Prerequisites

- Dev server must be running (from Phase 1)
- Playwright CLI must be available (try `playwright-cli --version`, fall back to `npx playwright-cli`)

### Per-Page / Per-Route Audit Checklist

For **every** page/route in the frontend application:

#### 1. Page Load
- [ ] Page loads without errors (check console for JS errors)
- [ ] All critical resources load (CSS, JS, images, fonts)
- [ ] No 404 or 500 errors in the network tab
- [ ] Loading states are visible (spinner, skeleton) while data loads
- [ ] No layout shift or broken layout on load

#### 2. Content & Rendering
- [ ] All text content renders correctly (no missing translations)
- [ ] Images load and display correctly
- [ ] Links are clickable and navigate to the correct destinations
- [ ] Dynamic content updates correctly (real-time data, toggles, etc.)
- [ ] Responsive layout works at common breakpoints (mobile, tablet, desktop)

#### 3. User Interactions
- [ ] All buttons are clickable and perform expected actions
- [ ] All forms accept input and submit correctly
- [ ] All inputs have proper validation (show errors for invalid input)
- [ ] All dropdowns/selects open and select correctly
- [ ] All toggles/switches toggle correctly
- [ ] All tabs navigate correctly
- [ ] All modals/dialogs open and close correctly
- [ ] All tooltips and popovers display correctly
- [ ] All drag-and-drop interactions work correctly
- [ ] All keyboard interactions work (Tab, Enter, Escape, Arrow keys)

#### 4. Form Handling
- [ ] Required fields are enforced
- [ ] Invalid input shows clear error messages
- [ ] Form submits and shows success/error state
- [ ] Form can be reset/cleared
- [ ] Auto-save (if applicable) works correctly
- [ ] Input masks/formatting are applied correctly

#### 5. Navigation
- [ ] All navigation links work
- [ ] Breadcrumb navigation works
- [ ] Back/forward browser buttons work correctly
- [ ] Deep links (URLs that go to specific pages) work
- [ ] Route guards (auth, permissions) work correctly

#### 6. Error States
- [ ] Empty states display correctly (no items, no results, etc.)
- [ ] Error states display correctly (API failures, network errors)
- [ ] Loading states display correctly (initial load, pagination, etc.)
- [ ] Timeout states are handled gracefully

### Playwright Testing Workflow

#### Step 1: Discover all routes

```bash
# Find all route definitions
grep -r "Route\|route\|path:" src/ --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" | grep -i "route\|path\|link" | head -50
```

#### Step 2: Test each route systematically

```bash
# Open the browser
playwright-cli open http://localhost:3000

# Navigate to each route
playwright-cli goto http://localhost:3000/
playwright-cli snapshot

# Take a screenshot for documentation
playwright-cli screenshot --filename=SNAPSHOTS/home-page.png

# Test interactions
playwright-cli click e15
playwright-cli type "search query"
playwright-cli press Enter
playwright-cli snapshot
playwright-cli screenshot --filename=SNAPSHOTS/search-results.png

# Check console for errors
playwright-cli console

# Check network requests
playwright-cli requests

# Close when done
playwright-cli close
```

#### Step 3: Test specific user flows

```bash
# Example: Full login flow
playwright-cli open http://localhost:3000/login
playwright-cli snapshot
playwright-cli fill e3 "test@example.com"
playwright-cli fill e4 "password123"
playwright-cli click e5
playwright-cli snapshot
playwright-cli console       # Check for JS errors
playwright-cli requests     # Check API calls
playwright-cli screenshot --filename=SNAPSHOTS/login-success.png

# Example: Form submission with validation
playwright-cli open http://localhost:3000/register
playwright-cli snapshot
playwright-cli click e5     # Submit empty form
playwright-cli snapshot     # Verify validation errors shown
playwright-cli fill e1 "user@example.com"
playwright-cli fill e2 "short"
playwright-cli click e5     # Submit invalid data
playwright-cli snapshot     # Verify validation errors shown
playwright-cli fill e2 "validpassword123"
playwright-cli click e5     # Submit valid data
playwright-cli snapshot     # Verify success
```

#### Step 4: Test error scenarios

```bash
# Test with console errors
playwright-cli console

# Test network error handling (if applicable)
playwright-cli route "*/api/*" --status=500
playwright-cli goto http://localhost:3000/page-that-calls-api
playwright-cli snapshot     # Verify error handling
playwright-cli unroute "*/api/*"

# Test with slow network (if applicable)
playwright-cli run-code "async page => await page.setOffline(true)"
playwright-cli goto http://localhost:3000/page
playwright-cli snapshot     # Verify offline handling
playwright-cli run-code "async page => await page.setOffline(false)"
```

#### Step 5: Test responsive design

```bash
# Test different viewport sizes
playwright-cli resize 375 812      # Mobile
playwright-cli goto http://localhost:3000/
playwright-cli screenshot --filename=SNAPSHOTS/mobile.png

playwright-cli resize 768 1024     # Tablet
playwright-cli screenshot --filename=SNAPSHOTS/tablet.png

playwright-cli resize 1920 1080    # Desktop
playwright-cli screenshot --filename=SNAPSHOTS/desktop.png
```

### Logging Frontend Bugs

Add every frontend bug to `.agents/testing/BUGS_FOUND.md`:

```markdown
### Bug #N — `<component/page>` on `http://localhost:PORT/route`
- **Severity:** Critical / Major / Minor / Cosmetic
- **Description:** What's wrong and how to reproduce
- **Steps to Reproduce:**
  1. Navigate to /route
  2. Click button X
  3. Observe error Y
- **Expected:** What should happen
- **Actual:** What actually happens
- **Screenshot:** `SNAPSHOTS/screenshot-name.png`
- **Console Errors:** [paste console output]
- **Fixed:** [ ] (mark [x] when fixed)
```

---

## PHASE 4: BUG FIXING & RE-TESTING

**Objective:** Fix every bug found in Phases 2 and 3, then re-test to confirm the fix.

### Fixing Backend Bugs

1. **Read the affected file** thoroughly to understand context
2. **Implement the fix** — make the minimal change needed
3. **Re-read the function** to verify the fix is correct
4. **Re-check call sites** to ensure the fix doesn't break anything
5. **Run existing tests** if any exist (`npm test`, `yarn test`, `pnpm test`)
6. **Log the fix** in `BUGS_FOUND.md` — mark as "Fixed: [x]"

### Fixing Frontend Bugs

1. **Read the affected component/file** thoroughly
2. **Implement the fix** — make the minimal change needed
3. **Check the browser** — navigate to the page and verify the fix
4. **Take a new screenshot** showing the fix works
5. **Run existing tests** if any exist
6. **Log the fix** in `BUGS_FOUND.md` — mark as "Fixed: [x]"

### Re-Testing After Fixes

After fixing each bug (or batch of related bugs):

1. **Re-test the specific function/page** that was fixed
2. **Re-test related functions/pages** that might be affected (regression)
3. **Take new screenshots** if the visual output changed
4. **Check console** for any new errors
5. **Update `STATE.md`** with current progress

### Iteration Rule

> **Do not proceed to the next phase until ALL bugs in the current phase are fixed.**
> If a fix introduces a new bug, fix that too before moving on.

---

## PHASE 5: REGRESSION & EDGE-CASE TESTING

**Objective:** After all bugs are fixed, do a final round of testing to ensure nothing was broken by the fixes.

### Actions

1. **Re-test every function** that was modified (from Phase 2)
2. **Re-test every page** that was modified (from Phase 3)
3. **Re-test related pages** that share code with modified pages
4. **Test common user journeys** end-to-end:
   - Login → browse → interact → logout
   - Search → filter → sort → view details
   - Create → edit → delete (CRUD flows)
   - Any other critical user flows
5. **Test edge cases** identified during Phase 2:
   - Empty states, null values, boundary values
   - Concurrent actions (rapid clicks, double submissions)
   - Network failures and timeouts
   - Large data sets
6. **Check for new bugs** introduced by fixes — add to `BUGS_FOUND.md` if found
7. **Fix any new bugs** and re-test (back to Phase 4 if needed)

### Critical User Journeys to Test

| Journey | Description |
|---|---|
| Authentication | Login, logout, session handling, password reset |
| Navigation | All routes accessible, breadcrumbs, deep links |
| Data Entry | Forms, validation, submission, confirmation |
| Data Display | Lists, tables, cards, pagination, sorting, filtering |
| Search | Search input, results display, no-results state |
| File Upload | Upload, progress, success/error states |
| Real-time Updates | WebSocket, SSE, polling (if applicable) |
| Error Recovery | Retry failed actions, recover from errors |
| Permissions | Role-based access, unauthorized access attempts |

---

## PHASE 6: FINAL REPORT GENERATION

**Objective:** Produce a comprehensive report of everything tested, everything found, and everything fixed.

### Final Report Structure

Write the report to `.agents/testing/TEST_REPORT.md`:

```markdown
# TESTING & DEBUGGING REPORT

**Date:** YYYY-MM-DD
**Scope:** Full codebase audit
**Tester:** AI QA Agent
**Status:** [CLEAN — No bugs found | RESOLVED — All bugs fixed | ISSUES REMAIN — see below]

---

## Executive Summary

<!-- 2-3 paragraph summary of the testing process, what was tested, and the overall result. -->

---

## Testing Statistics

| Metric | Count |
|---|---|
| Functions audited | N |
| API endpoints tested | N |
| Frontend pages tested | N |
| Bugs found | N |
| Bugs fixed | N |
| Bugs remaining | N |
| Critical bugs | N |
| Major bugs | N |
| Minor bugs | N |
| Cosmetic issues | N |

---

## Phase 1: Reconnaissance & Scope

<!-- Summary of codebase structure, modules, and scope. -->

### Modules Found
- Module name: description

### Functions Discovered
- Function — file — purpose

### Frontend Routes Discovered
- Route — component — description

---

## Phase 2: Backend Code Audit

<!-- Summary of backend testing. -->

### Functions Audited
<!-- List every function audited and its status. -->

| Function | File | Status | Issues Found |
|---|---|---|---|
| fnName | path/to/file.ts | PASS / WARN / FAIL | description |

### Critical Findings
<!-- Any critical issues found (even if fixed). -->

---

## Phase 3: Frontend Testing

<!-- Summary of frontend testing. -->

### Pages Tested
<!-- List every page tested and its status. -->

| Page | Route | Status | Issues Found |
|---|---|---|---|
| PageName | /route | PASS / WARN / FAIL | description |

### Screenshots
<!-- List all screenshots taken during testing. -->

| Screenshot | Description |
|---|---|
| `SNAPSHOTS/home-page.png` | Home page initial load |
| `SNAPSHOTS/...` | ... |

### Console Errors
<!-- List any console errors found during testing. -->

| Route | Error | Resolved |
|---|---|---|
| /route | Error message | Yes / No |

---

## Phase 4: Bug Fixes

<!-- All bugs found and fixed. -->

### Bugs Fixed

| # | Severity | File/Component | Description | Fix Applied |
|---|---|---|---|---|
| 1 | Critical | file.ts | Description | Fix description |
| 2 | Major | Component.jsx | Description | Fix description |

### Fixes Applied
<!-- Detailed list of all code changes made. -->

#### Fix 1: `fnName` in `file.ts`
- **Change:** What was changed
- **Reason:** Why it was changed
- **Lines changed:** N

---

## Phase 5: Regression Testing

<!-- Summary of re-testing after fixes. -->

### Functions Re-tested
<!-- List all functions that were re-tested after fixes. -->

### Pages Re-tested
<!-- List all pages that were re-tested after fixes. -->

### User Journeys Re-tested
<!-- List all critical user journeys that were re-tested. -->

### New Bugs Found
<!-- Any new bugs introduced by fixes. -->

| # | Severity | Description | Fixed |
|---|---|---|---|
| N/A | — | None (or list bugs) | — |

---

## Bugs Found & Fixed (Detailed Log)

<!-- Full log of every bug found, from BUGS_FOUND.md. -->

[Copy all entries from BUGS_FOUND.md here, with Fixed: [x] markers.]

---

## Recommendations

<!-- 3-5 actionable recommendations for improving code quality. -->

1. Recommendation 1
2. Recommendation 2
3. Recommendation 3

---

## Conclusion

<!-- Definitive statement about the overall quality of the codebase. -->

The codebase has been thoroughly tested across all functions, features, and UI elements.
[All bugs have been fixed and verified. / X issues remain — see details above.]

---

## Appendix: Testing Commands Used

<!-- Commands used during testing for reproducibility. -->

```bash
# Backend tests
npm test

# Frontend tests (if any)
npm run test:frontend

# Playwright testing
playwright-cli open http://localhost:3000
playwright-cli goto http://localhost:3000/login
...
```
```

---

## STATE MANAGEMENT

### State File: `.agents/testing/STATE.md`

Update the state file at the end of each phase:

```markdown
---
scope: "Full codebase audit"
started_at: "2026-01-15 10:00"
last_updated: "2026-01-15 10:45"
current_phase: "Phase 2"
status: "active"
---

## Phase Progress
- [x] Phase 1: Reconnaissance & Scope
- [ ] Phase 2: Backend Code Audit (in progress — 15/45 functions audited)
- [ ] Phase 3: Frontend Testing
- [ ] Phase 4: Bug Fixing & Re-Testing
- [ ] Phase 5: Regression & Edge-Case Testing
- [ ] Phase 6: Final Report Generation

## Current Activity
Auditing auth module functions...

## Bugs Found So Far
- Bug #1: `validateUserInput` — missing empty string check (Major)
- Bug #2: `/api/users` — returns 500 on empty result set (Critical)

## Next Steps
- Continue auditing auth module
- Then move to user module
```

---

## CRITICAL RULES

1. **Never skip a function.** Every exported function must be audited.
2. **Never assume correctness.** Read every line of code.
3. **Never ignore a bug.** Every bug must be logged and fixed.
4. **Never proceed to the next phase until all current-phase bugs are fixed.**
5. **Always re-test after fixing.** A fix is not complete until verified.
6. **Always take screenshots** of frontend testing for documentation.
7. **Always check the console** for JavaScript errors during frontend testing.
8. **Always check network requests** during frontend testing.
9. **Keep testing until zero bugs remain.** If you find a bug, fix it and continue.
10. **The final report must be comprehensive.** No placeholders, no "TODO" sections.
11. **If the dev server is not running, start it** before Phase 3.
12. **If tests exist, run them** and include results in the report.
13. **If a fix introduces a new bug, fix that too** before moving on.
14. **Be thorough, not fast.** Quality over speed.

---

## QUALITY CHECKLIST

Before marking testing as complete, verify:

- [ ] Every exported function has been audited
- [ ] Every API endpoint has been audited
- [ ] Every frontend page has been tested
- [ ] Every user journey has been tested
- [ ] All bugs have been logged in `BUGS_FOUND.md`
- [ ] All bugs have been fixed
- [ ] All fixes have been re-tested
- [ ] Regression testing has been completed
- [ ] Console errors have been checked and resolved
- [ ] Screenshot documentation is complete
- [ ] Final report `TEST_REPORT.md` is comprehensive and complete
- [ ] State file `STATE.md` reflects completion
- [ ] No "TODO" or "FIXME" comments were introduced by fixes
- [ ] No new bugs were introduced by fixes

---

## USAGE EXAMPLES

```
"Test everything in this project"
→ Skill initializes state, begins Phase 1, runs full 6-phase workflow

"Do a thorough QA pass"
→ Same as above

"Find and fix all bugs"
→ Same as above

"Test the frontend"
→ Skips Phase 2, starts from Phase 1 (recon), then runs Phases 3-6

"Continue testing"
→ Reads state file, resumes from current_phase
```
