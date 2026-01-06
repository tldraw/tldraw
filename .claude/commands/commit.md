---
description: Commit the current changes with an auto-generated message
argument-hint: [optional message or context]
allowed-tools: Bash(git:*)
model: haiku
---

## Context

- User's notes: $ARGUMENTS
- Current branch: !`git branch --show-current`
- Git status: !`git status --short`
- Staged changes: !`git diff --cached --stat`
- Unstaged changes: !`git diff --stat`
- Recent commits (for style reference): !`git log -5 --oneline`

## Task

Create a git commit for the current changes.

### Step 1: Review changes

1. Check what files have changed using the context above
2. If there are no changes to commit, inform the user and stop
3. If there are unstaged changes, stage them with `git add`

### Step 2: Generate commit message

Write a commit message following conventional commit format:

```
type(scope): brief description

Optional longer explanation if the changes are complex.
```

**Types**: feat, fix, refactor, test, docs, chore, perf, style, build, ci

**Guidelines**:

- Keep the first line under 72 characters
- Use imperative mood ("add feature" not "added feature")
- Reference the user's notes if provided
- Be specific about what changed and why

### Step 3: Commit

```bash
git commit -m "message"
```

Do NOT:

- Push to remote (user will do this separately)
- Use `--amend` unless explicitly requested
- Skip hooks with `--no-verify`
- Commit files that look like secrets (.env, credentials, API keys)
- Include "Generated with Claude Code", "Co-Authored-By: Claude", or any AI attribution

If the commit fails due to pre-commit hooks, fix the issues and try again.
