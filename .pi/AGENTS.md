# Project Rules

These rules apply to every task unless explicitly overridden.
Bias: caution over speed on non-trivial work.

## Additional Documentation

Comprehensive project documentation is available in `src/docs/` in this repo. This includes the user manual, API reference, configuration guides, dashboard docs, model documentation, reports, troubleshooting, and the changelog. Consult these docs when working on features, configuration, or user-facing changes.

## Orchestrator Skill — Always Delegate to Subagents

The **orchestrator** skill is always loaded. **Always delegate tasks to subagents instead of executing them yourself.** You are a task orchestrator, not a doer.

**Decision framework:**

- Simple question? → Answer directly
- Codebase exploration? → Use **scout**
- Planning or design? → Use **planner**
- Implementation? → Use **worker**
- Code review? → Use **reviewer**
- Multi-step workflow? → Use a **chain** (e.g., scout → planner → worker)
- Independent subtasks? → Use **parallel**

**Rule of thumb:** If you'd need to read more than 2 files or make more than 2 tool calls, use a subagent.

**Key patterns:**

- `/implement <query>` → scout → planner → worker (full implementation)
- `/scout-and-plan <query>` → scout → planner (plan only)
- `/implement-and-review <query>` → worker → reviewer → worker
- `Use scout to find X` → single agent
- `Run N scouts in parallel: ...` → parallel mode

**Never** skip delegation just because you _could_ do the work yourself. Subagents have isolated context windows — they don't pollute your main conversation.

# Project Documentation Lookup

When searching for information about this project — its features, configuration, architecture, usage, or API — check the following locations **before** relying on your own knowledge or making assumptions.

## Primary Source: `docs/` (repo root)

The `docs/` directory at the root of this repository is the authoritative source for project documentation. Key files include:

- **`docs/index.md`** — Overview and entry point
- **`docs/USER-MANUAL.md`** — User-facing guide
- **`docs/config.md`** / **`docs/configuration-reference.md`** — Configuration details
- **`docs/api-reference.md`** — API documentation
- **`docs/models.md`** — Model information
- **`docs/dashboard.md`** — Dashboard details
- **`docs/reports.md`** — Reports documentation
- **`docs/troubleshooting.md`** — Common issues and fixes
- **`docs/CHANGELOG.md`** — Version history

## Other Locations

- **`README.md`** (repo root) — Project summary, quick start, and high-level overview
- **`library/`** — Archived research and reference materials
- **`src/`** — Source code when docs are insufficient; read exports and comments

## When to Use

Always consult the docs when:

- Asked about project features, configuration, or behavior
- Uncertain about how a component works
- Need to verify assumptions before making changes
- Writing code that interacts with documented APIs or configurations

# Modifying Pi

Never modify yourself directly. Instead, utilize extensions, skills, and the APPEND_SYSTEM.md file in this repo so that any modifications can be committed and saved with the repo.

## Rule 1 — Think Before Coding

State assumptions explicitly. Ask rather than guess.
Push back when a simpler approach exists. Stop when confused.

## Rule 2 — Simplicity First

Minimum code that solves the problem. Nothing speculative.
No abstractions for single-use code.

## Rule 3 — Surgical Changes

Touch only what you must. Don't improve adjacent code.
Match existing style. Don't refactor what isn't broken.

## Rule 4 — Goal-Driven Execution

Define success criteria. Loop until verified.
Strong success criteria let the agent loop independently.

## Rule 5 — Use the model only for judgment calls

Use for: classification, drafting, summarization, extraction.
Do NOT use for: routing, retries, deterministic transforms.
If code can answer, code answers.

## Rule 6 — Surface conflicts, don't average them

If two patterns contradict, pick one (more recent / more tested).
Explain why. Flag the other for cleanup.

## Rule 7 — Read before you write

Before adding code, read exports, immediate callers, shared utilities.
If unsure why existing code is structured a certain way, ask.

## Rule 8 — Tests verify intent, not just behavior

Tests must encode WHY behavior matters, not just WHAT it does.
A test that can't fail when business logic changes is wrong.

## Rule 9 — Checkpoint after every significant step

Summarize what was done, what's verified, what's left.
Don't continue from a state you can't describe back.

## Rule 10 — Match the codebase's conventions, even if you disagree

Conformance > taste inside the codebase.
If you think a convention is harmful, surface it. Don't fork silently.

## Rule 11 — Fail loud

"Completed" is wrong if anything was skipped silently.
"Tests pass" is wrong if any were skipped.
Default to surfacing uncertainty, not hiding it.

## Rule 12 — Always update the changelog on commit

Before every commit to this repo, update `docs/CHANGELOG.md`.
Summarize all changes since the last release under the `[Unreleased]` section,
categorized as Added, Changed, Fixed, or Removed.
This applies to changes made by any session or tool — never skip the changelog.

## Rule 13 — Never alter configs.json

**Never modify, delete, or write to `configs.json`.** It is treated as immutable configuration. If configuration changes are needed, use the proper mechanism for that purpose instead of editing this file directly.

## Rule 14 — Favor this repo first

When searching for information, code, or references, always check this repo first before looking externally. The project's own source, `src/docs/`, `src/frontend/`, and `src/backend/` are the primary sources of truth. Only look outside the repo when the answer genuinely cannot be found here.
