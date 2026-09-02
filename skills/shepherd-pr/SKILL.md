---
name: shepherd-pr
description: Keep an eye on this PR. Review and resolve pull request comments and fix build failures autonomously. Use when asked to review PR feedback, address reviewer comments, fix CI failures, resolve PR threads, or handle PR maintenance tasks like "review PR comments", "fix the build", "address PR feedback", "clean up PR", or "resolve comments". Handles comment triage (resolve false positives, fix trivial issues, flag complex ones), build/lint/type errors, and e2e snapshot updates.
---

# Review PR

Autonomously review PR comments and build status, resolving what can be done with high confidence (>=80%) and flagging the rest for human review.

## Workflow

Note: this repository requires that you be using node 24. Use `nvm` to switch to node 24 before running any commands:

```bash
nvm use 24
```

### 1. Gather context

```bash
# Get PR number for current branch
gh pr view --json number,headRefName,url

# Get review threads with resolution status
gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            comments(first: 50) {
              nodes {
                body
                path
                line
                author { login }
                createdAt
                databaseId
              }
            }
          }
        }
      }
    }
  }
'
```

Filter to unresolved threads only.

### 2. Triage each unresolved comment

Read the referenced code and investigate. Classify into:

**A. False positive / already resolved** — The issue no longer exists in current code.

- Reply explaining why, citing specific code or commit.
- Resolve the thread.

**B. Trivial fix (>=80% confidence)** — Obvious, mechanical fix. No design decisions or matters of opinion. Examples: typos, missing null checks, wrong variable names, off-by-one, missing imports.

- Make the fix.
- Reply describing what was changed.
- Resolve the thread.

**C. Needs human input (<80% confidence)** — Design question, significant refactor, or ambiguous fix.

- Do NOT resolve.
- Add to end-of-session summary.

### 3. Reply and resolve threads

Reply to a comment:

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments/{comment_id}/replies \
  -f body="<your reply>"
```

Resolve a thread:

```bash
gh api graphql -f query='
  mutation($threadId: ID!) {
    resolveReviewThread(input: {threadId: $threadId}) {
      thread { isResolved }
    }
  }
' -f threadId="$THREAD_ID"
```

Always push fixes, then reply, then resolve related threads (in that order).

### 4. Check build status

```bash
gh pr checks --json name,status,conclusion
```

Investigate failures by category:

**Lint errors** — Run `yarn lint-current`. Fix if mechanical (formatting, import order, unused vars). Flag if the lint rule itself is questionable.

**Type errors** — Run `yarn typecheck` from repo root. Fix straightforward type mismatches. Flag if fix requires architectural decisions.

**Unit test failures** — Run `yarn test run` in relevant workspace. Fix if test expectation is clearly outdated due to intentional code changes. Flag if failure reveals actual bug or design concern.

**E2E snapshot failures** — Determine whether the PR's code changes _should_ cause visual differences:

- If yes (UI changes, style updates): add the `update-snapshots` label to trigger the automated update workflow:
  ```bash
  gh pr edit --add-label "update-snapshots"
  ```
- If no: flag as unintended regression for human review.

**Mysterious/unexpected failures** — Do not attempt to fix. Flag for human review with error output.

### 5. Commit and push fixes

```bash
git add <specific files>
git commit -m "Address PR review feedback

- <summary of changes>"
git push
```

Stage specific files only. Never force push. Never use `git add -A`.

### 6. End-of-session summary

Always end with:

```
## PR review summary

### Resolved
- <thread>: <what was done>

### Fixed
- <description of fix>

### Needs your input
- <thread>: <why it needs human judgment>

### Build status
- <status of each check, any actions taken>
```

Omit empty sections.

## Guidelines

- Conservative threshold: only act when >=80% confident the fix is correct and uncontroversial.
- Never resolve comments raising design questions or matters of opinion.
- Never resolve without replying first.
- Read actual code before concluding a comment is a false positive.
- Verify fixes don't break types (`yarn typecheck`) or lint (`yarn lint-current`).
- Do not modify test expectations unless change is clearly intentional.
