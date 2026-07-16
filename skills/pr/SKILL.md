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
2. Check for overlapping work so we don't step on a teammate's toes:
   - List open PRs touching the same area: `gh pr list --state open --json number,title,url,author,headRefName,updatedAt`, and search for related work: `gh pr list --search "<keywords>" --state open`.
   - Compare their changed files against ours (`gh pr diff <number> --stat`) to judge real overlap, not just a shared filename.
   - If someone already has a PR open for this: prefer building on their work over racing it. Offer to base our branch on theirs, contribute a review or a follow-up commit, or hand our changes over. Only open a competing PR when the approaches genuinely diverge, and when we do, link to theirs and explain how ours differs so the choice is easy for reviewers.
   - Surface what you found to the user before proceeding when there's meaningful overlap.
3. Prepare the branch:
   - If on `main`, create a new branch with a descriptive name.
   - Commit relevant changes, excluding secrets and explicitly private content.
   - Push the branch to the remote. Never force push.
4. Run an initial review pass before asking a human to look. Spin out a few subagents in parallel over the diff (`git diff main...HEAD`), each with a focused lens, then fold their findings into concrete fixes:
   - Does the change actually solve the stated problem, end to end, rather than papering over a symptom?
   - Does it leave the codebase better than we found it — clearer names, no dead or duplicated code, no drive-by regressions?
   - Any weird abstractions, premature generality, or unnecessary code that a reviewer would flag? Prefer the smaller, more direct version.
   - Fix what's clearly worth fixing so the human review starts from a strong diff. If a finding needs a product or design call, raise it with the user instead of guessing.
   - Commit and push any fixes from this pass so the remote branch matches before the PR is created, updated, or shared. Never force push.
5. If no PR exists, create one with `gh pr create`.
6. If a PR exists, read it with `gh pr view --json title,body,labels,number` and inspect the changed-file summary with `gh pr diff --stat`.
7. Update the title or body with `gh pr edit` if the existing PR does not match the current diff or the `write-pr` standards.
8. Search for related issues and link them in the PR description with `Closes #123` or `Relates to #123` where appropriate.
9. Share the PR URL with the user.

## Handling problems

Committing automatically runs hooks. Fix formatting, lint, type, or import issues when the fix is mechanical.

If a hook failure requires meaningful product or implementation decisions, stop and ask the user how to proceed.

Never force commit or force push.

## Rules

- Follow `../write-pr/SKILL.md` for all PR content standards.
- Do not include AI attribution in commit messages, PR titles, or PR descriptions.
- Do not add yourself or an AI tool as a co-author.
