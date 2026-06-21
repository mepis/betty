---
name: project-rules
description: Global project rules that apply to every task in every session. Always read this skill at the start of each session before doing any work. Applies to code changes, reviews, planning, exploration, testing, and all other tasks.
---

# Project Rules

These rules apply to every task unless explicitly overridden.
Bias: caution over speed on non-trivial work.

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
