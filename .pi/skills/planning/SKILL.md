---
name: planning
description: "Create detailed implementation plans for feature requests, enhancements, and refactoring. Always use before starting any coding task. Writes the plan and then implements it automatically."
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

> **Current year:** Run `date +%Y` to verify the current year before any web search.

# Planning Skill

Create a detailed, actionable implementation plan for the user's request, then implement it automatically without waiting for approval.

## Workflow

1. **Research** — Understand the request, explore the codebase, and identify relevant patterns. Check for a `~/.betty/library/` folder if it exists.
2. **Web Research** — Search the web for current-year best practices and common design patterns relevant to the task (see **Web Research** below).
3. **Plan** — Develop a phased implementation plan with concrete tasks. Write it to `.agents/plans/`. Incorporate findings from web research.
4. **Review** — Self-validate: verify every step is atomic, dependencies are resolved, and acceptance criteria are clear.
5. **Implement** — Execute the plan phase by phase. Update the progress tracker as you go. Do not stop for approval — proceed directly to implementation.

## Web Research

Before finalizing the plan, search the web for current-year best practices and common design patterns relevant to the task:

1. **Verify the current year** by running `date +%Y`.
2. **Use the playwright-cli skill** to perform web searches. Delegate a search task to the `playwright-cli` subagent with a prompt like:

   > Search for best practices and common design patterns for {topic} in {YEAR}. Focus on modern approaches, framework conventions, and architectural patterns. Summarize the top findings.

3. **Construct the search query** based on the task context. Include:
   - The primary technology stack (e.g., React, Node.js, Python, Docker)
   - The type of work (e.g., API design, state management, authentication, CI/CD)
   - The verified current year
4. **Incorporate findings** into the plan. If web research reveals modern patterns or anti-patterns to avoid, note them in the plan's design decisions section.
5. **Skip web research** only if the task is purely internal (e.g., renaming, minor refactoring) with no architectural implications.

## Document Structure

Write plans to `.agents/plans/` (create directories as needed). Keep notes in `.agents/notes/`.

> **You have permission to create all documentation files (plans, notes, etc.).**

Each plan must contain these sections:

### 1. Purpose

- What the change does and why
- Scope boundaries (what's in/out of scope)

### 2. Approach

- High-level architecture or design decisions
- Key technical considerations
- Alternatives considered and rejected (with reasons)

### 3. Phased Plan

- Break work into logical phases (typically 2-5)
- Each phase contains atomic tasks (5 or fewer steps per task)
- Each task has: description, acceptance criteria, and dependencies
- Max 3 levels of task nesting

### 4. Validation

- How each phase will be verified (tests, manual checks, etc.)
- L1 (unit/component), L2 (integration), L3 (system) criteria where applicable

### 5. Progress Tracker

- `[ ] Task name — status`
- Update continuously; every pause should reflect current state
- Mark completed tasks as `[x]` as you finish each one

## Task Design Rules

- **Atomic**: Each task is independently verifiable with a single clear deliverable
- **Context-independent**: Subtasks should not require knowledge beyond what's stated in the plan
- **Ordered**: Dependencies are explicit; no circular references
- **Scoped**: 5 or fewer steps per task; merge if larger, split if smaller
- **Specific**: No ambiguity — a coding agent should implement without making decisions

## Context Management

- Use `.agents/notes/` for persistent context across pauses
- Summarize and archive completed work to free context
- Use sub-agents for parallel research or deep dives into specific areas

## Execution Checklist

Before implementing, verify:

- [ ] Every task has clear acceptance criteria
- [ ] No task requires another task to be partially complete
- [ ] Scope boundaries are explicit
- [ ] Validation strategy covers all phases
- [ ] No ambiguous instructions ("investigate", "figure out", "decide")
