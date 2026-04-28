---
name: take
description: Find a GitHub issue in tldraw/tldraw, assign it, implement it, verify it, and open a pull request. Use when the user invokes take, asks to take an issue, implement an issue, work on an issue number or URL, or pick up an issue from a description.
---

# Take

Find an issue in `tldraw/tldraw`, implement it, and open a pull request.

## Workflow

### 1. Find the issue

The user may reference an issue by number, URL, or description.

- For a number or URL, fetch the issue directly:

```bash
gh issue view 123 --repo tldraw/tldraw
```

- For a description, search open issues first:

```bash
gh issue list --repo tldraw/tldraw --search "dark mode" --state open --limit 10
```

- If no open issue matches, search all issues:

```bash
gh issue list --repo tldraw/tldraw --search "dark mode" --state all --limit 10
```

If there is one clear match, proceed. If several issues match, ask the user to choose from issue numbers and titles. If none match, ask whether to create a new issue using the `issue` skill.

### 2. Understand the issue

Read the full issue and comments. Identify:

- Issue type: bug, feature, enhancement, cleanup, docs, or task.
- Requested behavior and acceptance criteria.
- Technical notes and affected files.
- Relevant discussion or clarifications.

If the issue lacks detail, explore the codebase before deciding whether implementation is safe.

### 3. Assign the issue

Assign the issue to the current GitHub user. If someone else is already assigned, ask the user whether to proceed.

### 4. Plan the implementation

Create a concise implementation checklist based on:

- The issue description.
- Acceptance criteria.
- Codebase exploration.
- Existing repo patterns.

### 5. Implement

Create a new branch from `main`.

Work through the checklist:

- Read files before editing them.
- Follow existing patterns.
- Keep changes focused on the issue.
- Avoid speculative improvements.
- Update docs, examples, tests, or API reports when the issue requires it.

### 6. Verify

Run the smallest relevant checks first. Use broader checks when the change touches shared behavior.

Typical final checks:

```bash
yarn typecheck
yarn lint
```

For focused package changes, prefer the relevant workspace tests before repo-wide checks.

### 7. Create the PR

Use the `pr` skill.

- Link the issue with `Closes #<issue-number>`.
- Include relevant context from the issue discussion.
- Include a clear test plan.

### 8. Summarize

End with:

- Issue implemented.
- Key changes and files modified.
- Verification performed.
- PR link.
- Manual testing steps, if relevant.
- Any acceptance criteria that could not be met and why.

## Rules

- Ask the user when requirements are unclear.
- Do not guess at unspecified product behavior.
- Keep the implementation scoped to the issue.
- Never include AI attribution in commits, issues, or PRs.
