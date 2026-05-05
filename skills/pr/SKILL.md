---
name: pr
description: Create or update a pull request for the current branch in the tldraw repository. Use when the user invokes pr, asks to create a PR, update an existing PR, push current branch changes for review, or prepare a pull request.
---

# PR

Create or update a pull request for the current branch.

Use `../write-pr/SKILL.md` as the standards reference for PR titles, descriptions, release notes, API changes, code changes tables, and human-note preservation.

## Workflow

1. Gather context:
   - Current branch: `git branch --show-current`
   - Working tree: `git status --short`
   - Existing PR: `gh pr view --json number,title,url 2>/dev/null`
   - Recent branch commits: `git log main..HEAD --oneline 2>/dev/null || git log -3 --oneline`
2. Prepare the branch:
   - If on `main`, create a new branch with a descriptive name.
   - Commit relevant changes, excluding secrets and explicitly private content.
   - Push the branch to the remote. Never force push.
3. If no PR exists, create one with `gh pr create`.
4. If a PR exists, read it with `gh pr view --json title,body,labels,number` and inspect the changed-file summary with `gh pr diff --stat`.
5. Update the title or body with `gh pr edit` if the existing PR does not match the current diff or the `write-pr` standards.
6. Search for related issues and link them in the PR description with `Closes #123` or `Relates to #123` where appropriate.
7. Share the PR URL with the user.

## Handling problems

Committing automatically runs hooks. Fix formatting, lint, type, or import issues when the fix is mechanical.

If a hook failure requires meaningful product or implementation decisions, stop and ask the user how to proceed.

Never force commit or force push.

## Rules

- Follow `../write-pr/SKILL.md` for all PR content standards.
- Do not include AI attribution in commit messages, PR titles, or PR descriptions.
- Do not add yourself or an AI tool as a co-author.
