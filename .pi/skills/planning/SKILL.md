---
name: planning
description: "Create detailed implementation plans for feature requests, enhancements, and refactoring. Always use before starting any coding task. Writes the plan and then implements it automatically."
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Planning Skill

Create a detailed, actionable implementation plan for the user's request, then implement it automatically without waiting for approval.

## Workflow

1. **Research** — Understand the request, explore the codebase, and identify relevant patterns. Check for a `library/` folder if it exists.
2. **Plan** — Develop a phased implementation plan with concrete tasks. Write it to `.agents/plans/`.
3. **Review** — Self-validate: verify every step is atomic, dependencies are resolved, and acceptance criteria are clear.
4. **Implement** — Execute the plan phase by phase. Update the progress tracker as you go. Do not stop for approval — proceed directly to implementation.

## Document Structure

Write plans to `.agents/plans/` (create directories as needed). Keep notes in `.agents/notes/`.

> **You have permission to create all documentation files (plans, notes, etc.) and modify source code to implement the plan. Create documentation files first, then execute the plan.**

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
