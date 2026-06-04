---
name: merge-request
description: "Create a merge request message in markdown covering the next batch of commits since the last MR. Stays persistent across calls — tracks covered commits and only covers new ones each time."
allowed-tools: Bash, Read
---

# Merge Request Skill

Create a merge request message in markdown covering the next batch of commits since the last MR. On subsequent calls, check the persisted state and create the next MR covering only new commits that occurred after the ones already covered.

## Important: Proceed Without Asking

**Execute this skill immediately. Do NOT ask the user for permission to proceed at any step.**

## State Persistence

This skill uses a state file to track which commits have been covered by previous MR messages:

```
.pi/skills/merge-request/last_mr_commits.txt
```

The state file contains one commit hash per line (full 40-char SHA), in chronological order (oldest first). This allows the skill to determine which commits are "new" on each invocation.

## Workflow

### 1. Determine the base branch

Run `git branch --show-current` to get the current branch. Then determine the base branch (the target of the MR):

- If the current branch is `main` or `master`, the base branch is `origin/main` (or `origin/master`).
- Otherwise, the base branch is `origin/main` (or `origin/master`).

Use `git rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo "origin/main"` to find the default remote HEAD. Fall back to `origin/main` if that fails.

### 2. Get all commits in the current branch

Run:

```bash
git log <base>..HEAD --format="%H %s" --no-merges
```

This gives full SHA + subject for every non-merge commit. The output is ordered oldest-first.

### 3. Check for previously covered commits

Read `.pi/skills/merge-request/last_mr_commits.txt` if it exists. Parse the commit hashes (one per line).

- If the file does **not** exist, all commits from step 2 are "new."
- If the file **does** exist, find commits whose SHA is **not** in the file. These are the "new" commits to cover in this MR.

### 4. Handle edge cases

- **No commits at all** (up to date with base): Output "Your branch is up to date with `<base>`. No commits to create an MR for."
- **No new commits** (all already covered): Output "All commits have already been covered by a previous MR. No new commits to cover."
- **All commits are new** (first MR): Proceed normally.

### 5. Generate the merge request message

For the new commits, produce a detailed MR in markdown. Use this template:

```markdown
# <MR Title>

## Summary

<!-- One or two sentences describing what this MR does and why. -->

## Commits Covered

<!-- List the commits this MR covers. -->

- `<short-sha>` `<subject>`
- `<short-sha>` `<subject>`

## Changes

### Overview

<!-- Brief description of the scope of changes. Infer from commit messages and diff. -->

### Key Changes

<!-- Bullet list of the most important changes. Be specific. -->

- **`<file-or-module>`**: What changed and why
- **`<file-or-module>`**: What changed and why

### Files Changed

| File | Type | Description |
|---|---|---|
| `<file>` | Added/Deleted/Modified | What and why |

### Breaking Changes

<!-- List any breaking changes with migration notes. If none, write "None." -->

- None

## Testing

<!-- How should these changes be tested? -->

- [ ] Manual test step 1
- [ ] Manual test step 2
- [ ] Existing tests pass

## Notes for Reviewers

<!-- Anything reviewers should pay special attention to. -->

## Changelog

<!--
- [Added|Changed|Fixed|Removed|Security]: [YYYY-MM-DD] Brief description
-->

- [Added|Changed|Fixed|Removed|Security]: [YYYY-MM-DD] Brief description
```

**To fill in the template:**

1. **MR Title**: Write a concise, descriptive title (one line, under 80 chars). Use imperative mood (e.g., "Add user export feature", "Fix session timeout handling"). For multi-commit MRs, synthesize the overarching theme rather than listing every change.
2. **Summary**: Derive from the commit messages and/or `git diff` between base and HEAD. What problem does this solve?
3. **Commits Covered**: List each new commit as `<short-sha> <subject>` (7-char short hash).
4. **Overview**: Brief scope description based on commit messages.
5. **Key Changes**: For each commit, identify the main file/module changed and summarize the change. Use `git diff <base> -- <file>` to understand the substance.
6. **Files Changed**: Table of all files touched, with type (Added/Deleted/Modified) and a one-line description.
7. **Breaking Changes**: Call out if any. Otherwise "None."
8. **Testing**: Suggest relevant test steps based on what changed.
9. **Notes for Reviewers**: Highlight anything unusual, trade-offs, or areas needing extra attention.
10. **Changelog**: Extract changelog entries from commit messages or diff.

**Be specific.** Mention file names, functions, modules. Explain **why** not just **what**.

### 6. Update the state file

After generating the MR, **append all new commit hashes** (full 40-char SHA) to `.pi/skills/merge-request/last_mr_commits.txt`, one per line.

- If the file doesn't exist, create it.
- Do **not** overwrite — append only the new commits.

### 7. Output the MR message

Output the merge request message in a markdown code block so the user can easily copy and paste it. Also output a summary of which commits were covered.

## Merge Request Format

```markdown
# <MR Title>

## Summary

<!-- One or two sentences describing what this MR does and why. -->

## Commits Covered

<!-- List the commits this MR covers. -->

- `<short-sha>` `<subject>`
- `<short-sha>` `<subject>`

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
| `<file>` | Added/Deleted/Modified | What and why |

### Breaking Changes

<!-- List any breaking changes with migration notes. If none, write "None." -->

- None

## Testing

<!-- How should these changes be tested? -->

- [ ] Manual test step 1
- [ ] Manual test step 2
- [ ] Existing tests pass

## Notes for Reviewers

<!-- Anything reviewers should pay special attention to. -->

## Changelog

<!--
- [Added|Changed|Fixed|Removed|Security]: [YYYY-MM-DD] Brief description
-->

- [Added|Changed|Fixed|Removed|Security]: [YYYY-MM-DD] Brief description
```

## Quality Checklist

Before outputting the MR, verify:

- [ ] Commit messages were analyzed to understand the changes
- [ ] MR title is concise, descriptive, and in imperative mood
- [ ] MR template is fully filled out (no placeholder text left)
- [ ] MR includes specific file references and descriptions
- [ ] Testing section is actionable
- [ ] Breaking changes are called out (or explicitly noted as "None")
- [ ] State file has been updated with all new commit hashes
- [ ] MR message is in a code block for easy copy-paste

## Important

- **Always** check the state file before generating the MR.
- **Never** cover commits that were already in a previous MR.
- **Always** append new commit hashes to the state file after generating the MR.
- If the diff is large or complex, read the actual changed files — don't rely on `git diff` alone.
- Always output the MR in a **code block** (` ```markdown `) so the user can easily copy it.
- If the user wants to **reset** the state (e.g., to re-cover all commits), they can delete `.pi/skills/merge-request/last_mr_commits.txt`.
