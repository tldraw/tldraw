---
name: issue
description: Create and research a GitHub issue in the tldraw repository from a user description. Use when the user invokes issue, asks to create an issue, report a bug, file a feature request, or add research to a new issue.
---

# Issue

Create a GitHub issue on `tldraw/tldraw` from a user description, then research it.

Use `../write-issue/SKILL.md` as the standards reference for issue titles, bodies, types, labels, and triage conventions.

## Workflow

1. Gather context:
   - User's issue description.
   - Current branch: `git branch --show-current`.
   - Recent issues: `gh issue list --repo tldraw/tldraw --limit 5 --json number,title --jq '.[] | "#\(.number) \(.title)"'`.
2. Do a quick codebase investigation:
   - Search for relevant files, functions, or patterns mentioned in the description.
   - Identify likely affected packages, apps, or examples.
   - Note obvious causes, related issues, or existing code paths.
3. For visual bugs, identify a reproduction target when possible:
   - Examples app: `localhost:5420` from `yarn dev`.
   - tldraw.com app: `localhost:3000` from `yarn dev-app`.
   - Docs site: `localhost:3001` from `yarn dev-docs`.
   - If screenshots are useful but not feasible locally, ask the user for screenshots and specific reproduction details.
4. Write the issue title and body using `../write-issue/SKILL.md`.
5. Create the issue:

```bash
gh issue create --repo tldraw/tldraw --title "..." --body "..."
```

6. Set the issue type through GitHub GraphQL when possible, since `gh issue create --type` is not reliable across versions.
7. Assign a milestone only when there is a clear fit:
   - `Improve developer resources` for examples, documentation, comments, starter kits, and `npm create tldraw`.
   - `Improve automations` for GitHub Actions, review bots, CI/CD, and automation work.
8. Share the issue URL with the user immediately after creation.
9. Do deeper research after creation:
   - Identify relevant files and line numbers.
   - Explain the root cause for bugs.
   - Summarize architecture context and related code.
   - Note edge cases, testing needs, and likely implementation risks.
10. Add the research as an issue comment:

```bash
gh issue comment <issue-number> --repo tldraw/tldraw --body "..."
```

## Rules

- Always create the issue before doing deep research so the user can track it.
- Follow `../write-issue/SKILL.md` for all issue content standards.
- Do not include AI attribution in issue titles, bodies, comments, or metadata.
