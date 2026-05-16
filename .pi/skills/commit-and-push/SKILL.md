---
name: commit-and-push
description: "Stage, commit, and push changes with thorough commit messages and a detailed merge request description in markdown."
allowed-tools: Bash, Read
---

# Commit & Push Skill

Stage all changes, write a thorough commit message, commit, push, and output a detailed merge request in markdown that the user can copy and paste.

## Workflow

1. **Inspect** — Run `git status` and `git diff` (and `git diff --stat` for a summary) to understand every change.
2. **Read key files** — Read any modified or newly created files to understand the substance of the changes.
3. **Update the changelog** — Before committing, update `docs/CHANGELOG.md` (or the project's changelog file) with entries for every change. Use the format `[Added|Changed|Fixed|Removed|Security]: Brief description`. Group related changes under a single heading if appropriate. **This is mandatory — never commit without updating the changelog.**
4. **Stage** — `git add -A` to stage everything.
5. **Write commit message** — Craft a thorough, descriptive commit message (see format below).
6. **Commit** — `git commit -m "..."` with the crafted message.
7. **Push** — `git push` to the default remote/branch.
8. **Generate MR** — Produce a detailed merge request markdown (see format below) for the user to copy and paste.

## Commit Message Format

Follow the **Conventional Commits** convention with a thorough body:

```
<type>: <short summary (≤50 chars)>

<BLANK LINE>

<motivation — why this change was made, what problem it solves or what value it adds>

<details — what specifically changed, how, and any important nuances>

- Bullet points for key changes if there are multiple
- Mention any important trade-offs or decisions
- Reference related issues/PRs with #number if applicable

Breaking changes (if any):
- List breaking changes with migration notes

Changelog: (if applicable)
- [Added|Changed|Fixed|Removed|Security]: Brief description
```

### Allowed types

| Type | When to use |
|---|---|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `docs` | Documentation-only changes |
| `refactor` | Code restructuring with no behavior change |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build, CI/CD, tooling, config changes |
| `style` | Formatting, linting, no code logic change |
| `ci` | CI configuration changes |
| `revert` | Reverting a previous commit |

### Rules

- **Summary line**: imperative mood, no capital first letter, no period at end.
- **Body**: explain **why** before **what**. Assume the reader has not seen the diff.
- **Be specific**: mention file names, functions, or modules affected.
- **No vague phrases**: avoid "minor fix", "updates", "changes", "stuff".
- If multiple unrelated changes exist, **split into separate commits** with individual messages.

## Merge Request Format

After pushing, output a merge request the user can copy and paste. Use this template:

```markdown
## Summary

<!-- One or two sentences describing what this MR does and why. -->

## Changes

### Overview

<!-- Brief description of the scope of changes. -->

### Key Changes

<!-- Bullet list of the most important changes. Be specific. -->

- **`<file-or-module>`**: What changed and why
- **`<file-or-module>`**: What changed and why

### Files Changed

| File | Type | Description |
|---|---|---|
| `.gitkeep` | Added/Deleted/Modified | What and why |

### Breaking Changes

<!-- List any breaking changes with migration notes. If none, write "None." -->

- None

## Testing

<!-- How should these changes be tested? Manual steps, automated tests, etc. -->

- [ ] Manual test step 1
- [ ] Manual test step 2
- [ ] Existing tests pass

## Screenshots / Demos

<!-- If applicable, add screenshots, GIFs, or links to demos. -->

## Notes for Reviewers

<!-- Anything reviewers should pay special attention to. Context, trade-offs, decisions. -->

## Changelog

<!--
- [Added|Changed|Fixed|Removed|Security]: Brief description of the change
-->

- [Added|Changed|Fixed|Removed|Security]: Brief description
```

## Quality Checklist

Before outputting the MR, verify:

- [ ] Changelog has been updated with all changes (mandatory)
- [ ] Commit message follows conventional commits with thorough body
- [ ] Commit message explains **why** not just **what**
- [ ] All changes are accounted for (no stray files)
- [ ] If unrelated changes exist, they are split into separate commits
- [ ] MR template is fully filled out (no placeholder text left)
- [ ] MR includes specific file references and descriptions
- [ ] Testing section is actionable
- [ ] Breaking changes are called out (or explicitly noted as "None")

## Important

- **Never** commit without reading the changes first.
- **Never** commit without updating the changelog first — this is mandatory.
- **Never** use a vague commit message.
- If the diff is large or complex, read the actual changed files — don't rely on `git diff` alone.
- If there are many unrelated changes, **split into multiple commits** with clear, individual messages.
- Always output the MR in a **code block** (` ```markdown `) so the user can easily copy it.
