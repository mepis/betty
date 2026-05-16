---
name: testing-debugging
description: "Thoroughly test and debug every function, feature, and operation in the codebase. Step through all code paths, validate inputs and outputs, test the frontend as a user, fix all bugs, and produce a comprehensive audit report. Keep testing until zero bugs remain."
allowed-tools: Bash(subagent:*)
---

# Testing & Debugging Skill — Orchestrator Mode

You are a **task orchestrator** for QA and debugging. Your job is to **delegate all testing and debugging work to subagents**. You do NOT read files, run commands, or write code directly — you orchestrate scouts, workers, and reviewers to do the heavy lifting, then synthesize their findings.

## CORE PRINCIPLE

**Never do the testing work yourself.** Every file read, every code audit, every Playwright test, every bug fix, every re-test must be delegated to a subagent. You manage the workflow, pass context between agents, and produce the final report.

## WHEN TO USE

- Before any release, merge, or deployment
- After any significant feature addition or refactor
- When the user asks to "test everything", "audit the code", "find and fix all bugs", or "do a thorough QA pass"
- When you suspect there may be hidden bugs or edge cases
- As a quality gate before marking any implementation as complete

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

The testing workflow has **6 phases**. You orchestrate subagents for each phase sequentially — do not skip phases.

```
Phase 1: Reconnaissance & Scope
    ↓ (scout → worker)
Phase 2: Backend Code Audit (functions, logic, data flow)
    ↓ (worker × N in parallel → worker for aggregation)
Phase 3: Frontend Testing (user-flow testing via Playwright)
    ↓ (worker)
Phase 4: Bug Fixing & Re-Testing
    ↓ (worker → reviewer → worker chain)
Phase 5: Regression & Edge-Case Testing
    ↓ (worker)
Phase 6: Final Report Generation
    ↓ (worker)
```

---

## PHASE 1: RECONNAISSANCE & SCOPE

**Objective:** Understand the full codebase structure and define what needs to be tested.

### Orchestration

**Step 1:** Use a **scout** to map the codebase structure and identify all testable units.

> Task: Map the codebase. Find: (1) all major modules and directories, (2) all exported functions and classes, (3) all API routes/endpoints, (4) all frontend components and routes, (5) all database models, (6) the frontend app entry point and dev server command. Return structured findings.

**Step 2:** Use a **worker** to initialize the state file with the scout's findings.

> Task: Create `.agents/testing/` directory and write `STATE.md` with the codebase map, functions to test, API endpoints to test, frontend routes to test, and scope. Use the scout's output as context.

**Step 3:** Use a **worker** to start the dev server (if a frontend exists).

> Task: Find the dev server start command in package.json, start it in the background, wait for it to be ready, and record the URL. Update STATE.md with the URL.

### Scout Prompt Template

```
Map the full codebase structure. Return:
1. Directory layout (top 3 levels)
2. All exported functions/classes (name, file, purpose)
3. All API routes/endpoints (method, path, handler file)
4. All frontend components and routes (component file, route path)
5. All database models/schemas
6. Frontend entry point and dev server command (from package.json)
7. Any test files that already exist
```

---

## PHASE 2: BACKEND CODE AUDIT

**Objective:** Step through every function, feature, and operation in the backend code. Verify correctness of logic, inputs, outputs, and error handling.

### Orchestration

**Step 1:** Split the backend audit into **parallel worker subagents** — one per module/directory. Each worker audits all functions in its assigned module.

> For each major module found in Phase 1, spin off a **worker** with:
> "Audit every function in this module. Read every file, trace every branch, check every call site. For each function, verify: (1) function signature, (2) input validation, (3) logic correctness, (4) output correctness, (5) error handling, (6) edge cases. Log every issue found to `.agents/testing/BUGS_FOUND.md` with: file path, function name, issue description, severity (Critical/Major/Minor/Cosmetic), suggested fix. Use the checklist from the testing-debugging skill."

**Step 2:** Use a **worker** to aggregate all findings from `BUGS_FOUND.md`.

> Task: Read `.agents/testing/BUGS_FOUND.md`, summarize all bugs found, and update `STATE.md` with audit progress (X/Y functions audited).

### Per-Function Audit Checklist (passed to worker)

Every worker must verify for **every** function:

| Area | Checks |
|---|---|
| **Signature** | Well-typed, documented, sensible defaults, no loose `any`, correct return type |
| **Input Validation** | Validates at boundary, handles null/undefined/empty, type coercion, boundary values, injection attempts |
| **Logic** | Does what it promises, all branches correct, no infinite loops, correct state mutations, correct async/await |
| **Output** | Correct format, no sensitive data leaked, consistent dates, appropriate precision, correct boolean logic |
| **Error Handling** | Errors caught (not swallowed), informative messages, DB errors handled, network errors handled, unexpected errors don't crash |
| **Edge Cases** | Empty inputs, large inputs, concurrency, idempotency, resource cleanup |

### Critical Patterns to Watch For (passed to worker)

| Pattern | Risk |
|---|---|
| `JSON.parse()` without try/catch | Crash on invalid JSON |
| `.find()` without null check | `.map` / `.prop` on undefined |
| `.forEach` with async | Async code runs out of order |
| `Array.map` without return | Silent no-op |
| `req.body` used without validation | Injection, type errors |
| `process.env.X` without default | `undefined` at runtime |
| Direct string concatenation in SQL | SQL injection |
| Unsanitized user input in HTML | XSS |
| `setInterval` without cleanup | Memory leak |
| Unhandled Promise rejection | Silent failure |
| `try/catch` with empty catch | Swallowed errors |
| Deep object access without null checks | `Cannot read property of undefined` |
| Mutation of shared state without locking | Race conditions |
| Floating-point arithmetic for money | Precision errors |
| `eval()` or `new Function()` | Code injection |
| Unescaped user input in URL params | Path traversal |

---

## PHASE 3: FRONTEND TESTING (User-Flow Testing via Playwright)

**Objective:** Test every page, component, and interaction as an end user would experience it.

### Orchestration

**Step 1:** Use a **worker** to discover all frontend routes.

> Task: Find all route definitions in the frontend codebase. Return a list of routes with their associated components.

**Step 2:** Use a **worker** to run Playwright tests against every route.

> Task: For each route discovered:
> 1. Navigate to the route via Playwright
> 2. Take a screenshot (save to `.agents/testing/SNAPSHOTS/`)
> 3. Check console for JS errors
> 4. Test all interactive elements (buttons, forms, links, toggles, modals)
> 5. Test form validation (submit empty, submit invalid, submit valid)
> 6. Test error states (empty states, loading states, API failures if applicable)
> 7. Test responsive design at 375px, 768px, 1920px widths
> 8. Log every issue to `.agents/testing/BUGS_FOUND.md`

**Step 3:** Use a **worker** to test critical user journeys end-to-end.

> Task: Test these user journeys via Playwright:
> - Authentication: login, logout, session handling
> - Navigation: all routes, breadcrumbs, deep links
> - Data Entry: forms, validation, submission
> - Data Display: lists, tables, pagination, sorting, filtering
> - Search: search input, results, no-results state
> - Permissions: role-based access, unauthorized attempts
> Log every issue to `.agents/testing/BUGS_FOUND.md`

### Logging Frontend Bugs (passed to worker)

Every frontend bug must include:
- Component/page name
- Route URL
- Severity (Critical/Major/Minor/Cosmetic)
- Description and steps to reproduce
- Expected vs actual behavior
- Screenshot path
- Console errors (if any)

---

## PHASE 4: BUG FIXING & RE-TESTING

**Objective:** Fix every bug found in Phases 2 and 3, then re-test to confirm the fix.

### Orchestration

This phase uses the **Implement → Review → Fix** chain pattern.

**Step 1:** Use a **worker** to fix all bugs.

> Task: Read `.agents/testing/BUGS_FOUND.md`. For each unfixed bug:
> 1. Read the affected file(s) to understand context
> 2. Implement the minimal fix
> 3. Re-read the fixed code to verify correctness
> 4. Run existing tests if any exist (`npm test`, `yarn test`, etc.)
> 5. Mark the bug as "Fixed: [x]" in BUGS_FOUND.md
>
> If a fix introduces a new bug, fix that too before moving on.

**Step 2:** Use a **reviewer** to verify all fixes.

> Task: Review all fixes applied in BUGS_FOUND.md. For each fix:
> 1. Read the changed file(s)
> 2. Verify the fix is correct and minimal
> 3. Check that no new bugs were introduced
> 4. Check that related code (call sites, dependencies) is not broken
> 5. Return a list of issues found during review (if any)

**Step 3:** If reviewer found issues, use a **worker** to address them.

> Task: Apply the review feedback. Fix any issues the reviewer identified. Update BUGS_FOUND.md.

**Step 4:** Use a **worker** to re-test fixed functions/pages.

> Task: For each fixed bug, re-test the affected function/page:
> - Backend: re-read the function, trace execution, verify the fix
> - Frontend: navigate to the page, verify the fix visually, check console
> - Run existing tests again
> - Log re-test results to STATE.md

### Iteration Rule

> **Do not proceed to the next phase until ALL bugs are fixed.** If a fix introduces a new bug, fix that too before moving on. If the reviewer finds issues, loop back to fix them.

---

## PHASE 5: REGRESSION & EDGE-CASE TESTING

**Objective:** After all bugs are fixed, do a final round of testing to ensure nothing was broken.

### Orchestration

**Step 1:** Use **parallel workers** to re-test all modified functions and pages.

> For each module/page that was modified, spin off a **worker**:
> "Re-test all functions/pages in this module that were fixed. Verify the fix still works, check related functions for regressions, test common user journeys that touch this module. Log any new issues to BUGS_FOUND.md."

**Step 2:** Use a **worker** to test edge cases identified during Phase 2.

> Task: Test these edge cases across the codebase:
> - Empty states, null values, boundary values
> - Rapid clicks, double submissions (frontend)
> - Network failures and timeouts (frontend)
> - Large data sets
> - Concurrent actions
> Log any issues to BUGS_FOUND.md.

**Step 3:** If new bugs are found, loop back to **Phase 4** (bug fixing).

---

## PHASE 6: FINAL REPORT GENERATION

**Objective:** Produce a comprehensive report of everything tested, everything found, and everything fixed.

### Orchestration

**Step 1:** Use a **worker** to generate the final report.

> Task: Read all testing artifacts (STATE.md, BUGS_FOUND.md, any snapshots) and generate a comprehensive report at `.agents/testing/TEST_REPORT.md` with:
> 1. Executive summary (2-3 paragraphs)
> 2. Testing statistics (functions audited, endpoints tested, pages tested, bugs found/fixed/remaining by severity)
> 3. Phase 1 summary: codebase map, modules, functions, routes
> 4. Phase 2 summary: backend audit results, table of functions audited with status
> 5. Phase 3 summary: frontend testing results, table of pages tested with status, screenshots listed, console errors
> 6. Phase 4 summary: all bugs fixed, detailed fix descriptions
> 7. Phase 5 summary: regression testing results, any new bugs found
> 8. Full bugs log (from BUGS_FOUND.md, with Fixed: [x] markers)
> 9. Recommendations (3-5 actionable items)
> 10. Conclusion (definitive statement about codebase quality)
> 11. Appendix: testing commands used
>
> The report must be comprehensive — no placeholders, no "TODO" sections.

**Step 2:** Use a **worker** to update STATE.md with completion status.

> Task: Update STATE.md to mark all phases as complete, update status to "complete", and record the final bug counts.

---

## STATE MANAGEMENT

### State File: `.agents/testing/STATE.md`

Update the state file at the end of each phase by delegating to a **worker**:

```markdown
---
scope: "Full codebase audit"
started_at: "YYYY-MM-DD HH:MM"
last_updated: "YYYY-MM-DD HH:MM"
current_phase: "Phase X"
status: "active" | "complete"
---

## Phase Progress
- [x] Phase 1: Reconnaissance & Scope
- [x] Phase 2: Backend Code Audit (45/45 functions audited)
- [x] Phase 3: Frontend Testing (12/12 pages tested)
- [x] Phase 4: Bug Fixing & Re-Testing (8 bugs fixed)
- [x] Phase 5: Regression & Edge-Case Testing
- [x] Phase 6: Final Report Generation

## Bugs Found So Far
- Total: N | Fixed: N | Remaining: 0

## Final Status
All phases complete. Zero bugs remaining.
```

---

## CRITICAL RULES

1. **Never do testing work yourself.** Always delegate to subagents.
2. **Never skip a function.** Every exported function must be audited by a worker.
3. **Never assume correctness.** Pass the audit checklist to workers.
4. **Never ignore a bug.** Every bug must be logged and fixed.
5. **Never proceed to the next phase until all current-phase bugs are fixed.**
6. **Always re-test after fixing.** Use the worker → reviewer → worker chain.
7. **Always take screenshots** of frontend testing — delegate to a worker.
8. **Always check the console** for JavaScript errors — delegate to a worker.
9. **Keep testing until zero bugs remain.** If a bug is found, fix it and continue.
10. **The final report must be comprehensive.** No placeholders, no "TODO" sections.
11. **Use parallel workers** for independent testing tasks to save time.
12. **Use chains** for multi-step workflows (implement → review → fix).
13. **If a fix introduces a new bug, fix that too** before moving on.
14. **Be thorough, not fast.** Quality over speed.

---

## ORCHESTRATION PATTERNS REFERENCE

| Phase | Pattern | Agents |
|---|---|---|
| 1: Recon | Parallel scouts | scout × 2-3 |
| 2: Backend Audit | Parallel workers | worker × N (one per module) |
| 3: Frontend Testing | Sequential worker | worker |
| 4: Bug Fixing | Chain | worker → reviewer → worker |
| 5: Regression | Parallel workers | worker × N |
| 6: Report | Single worker | worker |

---

## QUALITY CHECKLIST

Before marking testing as complete, verify (by reviewing agent outputs):

- [ ] Every exported function has been audited by a worker
- [ ] Every API endpoint has been audited by a worker
- [ ] Every frontend page has been tested by a worker
- [ ] Every user journey has been tested by a worker
- [ ] All bugs have been logged in `BUGS_FOUND.md`
- [ ] All bugs have been fixed (verified by reviewer)
- [ ] All fixes have been re-tested by a worker
- [ ] Regression testing has been completed by workers
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
→ Phase 1: scout × 2-3 → worker (init STATE.md) → worker (start dev server)
→ Phase 2: worker × N (parallel backend audit)
→ Phase 3: worker (Playwright tests)
→ Phase 4: worker → reviewer → worker (fix + verify)
→ Phase 5: worker × N (parallel regression)
→ Phase 6: worker (report generation)

"Do a thorough QA pass"
→ Same full 6-phase workflow

"Find and fix all bugs"
→ Same full 6-phase workflow

"Test the frontend"
→ Phase 1: scout → worker
→ Phase 3: worker (Playwright)
→ Phase 4: worker → reviewer → worker
→ Phase 5: worker
→ Phase 6: worker

"Continue testing"
→ Read STATE.md (delegate to worker), resume from current_phase
```
