---
name: write-issue
description: Writing and maintaining GitHub issues for the tldraw repository. Use when creating new issues, editing issue titles/bodies, triaging issues, or cleaning up issue metadata (types, labels).
---

# Writing and maintaining GitHub issues

Standards for issues in tldraw/tldraw.

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

- Never include "Generated with Claude Code" unless the PR directly relates to Claude Code
- Never use title case for descriptions - use sentence case
