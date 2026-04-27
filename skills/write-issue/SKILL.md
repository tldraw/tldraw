---
name: write-issue
description: Create, research, write, and maintain GitHub issues for the tldraw repository. Use when asked to create a new issue from a description, edit issue titles or bodies, triage issues, clean up metadata, or add issue research.
---

# Writing and maintaining GitHub issues

Standards for issues in tldraw/tldraw.

## Create and research an issue

When creating a GitHub issue from a user description:

1. Gather context:
   - User's issue description.
   - Current branch: `git branch --show-current`.
   - Recent issues: `gh issue list --repo tldraw/tldraw --limit 5 --json number,title --jq '.[] | "#\(.number) \(.title)"'`.
2. Do a quick codebase investigation:
   - Search for relevant files, functions, or patterns mentioned in the description.
   - Identify likely affected packages, apps, or examples.
   - Note obvious causes, related issues, or existing code paths.
3. For visual bugs, try to identify a reproduction target:
   - Examples app: `localhost:5420` from `yarn dev`.
   - tldraw.com app: `localhost:3000` from `yarn dev-app`.
   - Docs site: `localhost:3001` from `yarn dev-docs`.
   - If screenshots are useful but not feasible locally, ask the user for screenshots and specific reproduction details.
4. Create the issue with `gh issue create --repo tldraw/tldraw --title "..." --body "..."`.
5. Set the issue type through GitHub GraphQL when possible, since `gh issue create --type` is not reliable across versions.
6. Assign a milestone only when there is a clear fit:
   - `Improve developer resources` for examples, documentation, comments, starter kits, and `npm create tldraw`.
   - `Improve automations` for GitHub Actions, review bots, CI/CD, and automation work.
7. Share the issue URL with the user immediately after creation.
8. Do deeper research after creation:
   - Identify relevant files and line numbers.
   - Explain the root cause for bugs.
   - Summarize architecture context and related code.
   - Note edge cases, testing needs, and likely implementation risks.
9. Add the research as an issue comment with `gh issue comment <issue-number> --repo tldraw/tldraw --body "..."`.

Always create the issue before doing deep research so the user can track it.

## Title standards

- **Sentence case** - Capitalize only the first word and proper nouns
- **No type prefixes** - Use GitHub issue types, not `Bug:`, `Feature:`, `[Bug]`, etc.
- **Imperative mood for enhancements** - "Add padding option" not "Adding padding option"
- **Descriptive for bugs** - Describe the symptom: "Arrow bindings break with rotated shapes"
- **Specific** - Readable without opening the issue body

### Good titles

- `Arrow bindings break with rotated shapes`
- `Add padding option to zoomToFit method`
- `Pinch zoom resets selection on Safari`

### Bad titles

- `Bug: arrow bug` (prefix, vague)
- `[Feature] Add new feature` (prefix, vague)
- `Not working` (vague)

### Title cleanup transformations

1. Remove prefixes: `Bug: X` → `X`
2. Fix capitalization: `Add Padding Option` → `Add padding option`
3. Use imperative: `Adding feature X` → `Add feature X`
4. Be specific: `Problem` → `[Describe the actual problem]`
5. Translate non-English titles to English

## Issue types

Set via the GitHub GraphQL API after creating the issue (the `--type` flag is not reliably supported):

| Type      | Use for                             |
| --------- | ----------------------------------- |
| `Bug`     | Something isn't working as expected |
| `Feature` | New capability or improvement       |
| `Example` | Request for a new SDK example       |
| `Task`    | Internal task or chore              |

## Labels

Use sparingly (1-2 per issue) for metadata, not categorization.

### Common labels

| Label              | Use for                          |
| ------------------ | -------------------------------- |
| `good first issue` | Well-scoped issues for newcomers |
| `More Info Needed` | Requires additional information  |
| `sdk`              | Affects the tldraw SDK           |
| `dotcom`           | Related to tldraw.com            |
| `a11y`             | Accessibility                    |
| `performance`      | Performance improvement          |
| `api`              | API change                       |

### Automation labels (do not apply manually)

`keep`, `stale`, `update-snapshots`, `publish-packages`, `major`, `minor`, `skip-release`, deploy triggers

## Issue body standards

### Bug reports

1. Clear description of what's wrong
2. Steps to reproduce
3. Expected vs actual behavior
4. Environment details (browser, OS, version) when relevant
5. Screenshots/recordings when applicable

### Feature requests

1. Problem statement - What problem does this solve?
2. Proposed solution - How should it work?
3. Alternatives considered
4. Use cases

### Example requests

1. What API/pattern to demonstrate
2. Why it's useful
3. Suggested approach
4. Which example category it belongs to

## Triage workflow

### New issues

1. Verify sufficient information to act on
2. Set appropriate issue type
3. Clean up title if needed
4. Add `More Info Needed` label and comment if details missing
5. Add `good first issue` if appropriate

### Stale issues

1. Review if still relevant
2. Close if no longer applicable
3. Add `keep` label if should remain open
4. Request updates if waiting on information

## Important

- Never include AI attribution unless the issue directly relates to AI tooling
- Never use title case for descriptions - use sentence case
