---
description: Commit changes and create or update a pull request (project)
argument-hint: [description]
allowed-tools: Bash(git:*), Bash(gh:*)
model: opus
---

## Context

- User's notes: $ARGUMENTS
- Current branch: !`git branch --show-current`
- Git status: !`git status --short`
- Existing PR: !`gh pr view --json number,title,url 2>/dev/null || echo "No PR exists"`
- Recent commits: !`git log main..HEAD --oneline 2>/dev/null || git log -3 --oneline`

## Task

### Step 1: Prepare the branch

1. If on main, create a new branch with a descriptive name
2. Commit all changes (except API keys or explicitly private content)
3. Push changes to the remote

### Step 2: Create or update the PR

Important! All PRs must follow the standards in @.claude/skills/write-pr/SKILL.md

**If no PR exists:**

Create a new PR following the standards.

**If a PR already exists:**

1. Read the existing PR and understand the current changes:

   ```bash
   gh pr view --json title,body,labels,number
   gh pr diff --stat  # Summary of files changed
   ```

   If you need more detail on specific files, read them directly rather than dumping the full diff.

2. Review whether the PR content accurately reflects the current diff:
   - Does the title follow semantic format (`type(scope): description`)?
   - Does the description accurately describe all commits?
   - Is the test plan still accurate?
   - Are the release notes complete?

3. Update the PR if needed:

   ```bash
   gh pr edit <number> --title "new title" --body "new body"
   ```

4. Push any new commits (regular push, not force push)

### Step 3: Link related issues

Search for related issues and link them in the PR description using `Closes #123` or `Relates to #123`.

## Handling problems

Committing automatically runs the linter. Fix any lint/type errors unless they require meaningful code changes—in that case, notify the user:

🚨 I can't create/update this PR because [reason]. Would you like me to [suggestion]?

Never force commit or force push.

**Important**: NEVER include "Generated with Claude Code", "Co-Authored-By: Claude", or any other AI attribution in commit messages, PR titles, or PR descriptions.
