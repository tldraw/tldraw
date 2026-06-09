---
name: commit-changes
description: Create a git commit for the current changes. Use when asked to commit changes, make a commit, generate a commit message, or commit the current worktree with optional user-provided context.
---

# Commit changes

Create a focused git commit for the current changes.

## Workflow

1. Gather context:
   - User notes, if provided.
   - Current branch: `git branch --show-current`.
   - Working tree: `git status --short`.
   - Staged changes: `git diff --cached --stat`.
   - Unstaged changes: `git diff --stat`.
   - Recent commits for style reference: `git log -5 --oneline`.
2. Review the changed files.
3. If there are no changes to commit, tell the user and stop.
4. If there are unstaged changes, stage the relevant files with `git add`.
5. Do not stage files that look like secrets, credentials, API keys, or private environment files.
6. Write a conventional commit message:

```text
type(scope): brief description

Optional longer explanation if the changes are complex.
```

Allowed types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`, `build`, `ci`.

## Message guidelines

- Keep the first line under 72 characters.
- Use imperative mood, for example `add feature`, not `added feature`.
- Be specific about what changed and why.
- Incorporate user-provided context when it clarifies intent.

## Commit rules

- Use `git commit -m "message"`.
- Do not push.
- Do not amend unless explicitly requested.
- Do not use `--no-verify`.
- Do not include AI attribution.

If the commit fails because of hooks, fix mechanical formatting, lint, or import issues and retry. If the hook failure reveals a meaningful product or implementation issue, stop and ask the user how to proceed.
