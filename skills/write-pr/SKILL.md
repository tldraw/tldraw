---
name: write-pr
description: Create, update, and write pull requests for the tldraw repository. Use when asked to create a PR, update an existing PR, push current branch changes for review, or write PR titles and descriptions.
---

# Writing pull requests

Standards for PR titles and descriptions in tldraw/tldraw.

## Operational workflow

When creating or updating a PR:

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
5. Update the title or body with `gh pr edit` if the existing PR does not match the current diff or the standards below.
6. Search for related issues and link them with `Closes #123` or `Relates to #123` where appropriate.

If commit hooks fail, fix formatting, lint, or type issues when the fix is mechanical. If the fix requires meaningful product or implementation decisions, stop and ask the user how to proceed.

## PR title

Use semantic PR titles (Conventional Commits format):

```
<type>(<scope>): <description>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `perf` - Performance improvement
- `test` - Adding or fixing tests
- `chore` - Maintenance tasks

### Scope (optional)

A noun describing the affected area: `fix(editor):`, `feat(sync):`, `docs(examples):`

### Examples

- `feat(editor): add snap threshold configuration option`
- `fix(arrows): correct binding behavior with rotated shapes`
- `docs: update sync documentation`
- `refactor(store): simplify migration system`

## PR body

Use this template:

```md
<description paragraph>

### Change type

- [x] `bugfix` | `improvement` | `feature` | `api` | `other`

### Test plan

1. Step to test...
2. Another step...

- [ ] Unit tests
- [ ] End to end tests

### Release notes

- Brief description of changes for users
```

### Description paragraph

Start with: "In order to X, this PR does Y."

- Keep it specific - avoid vague phrases like "improve user experience"
- Link related issues in the first paragraph
- Don't expect readers to also read the linked issue

### Change type

- Tick exactly one type with `[x]`
- Delete unticked items

### Test plan

- List manual testing steps if applicable
- Remove the numbered list if changes cannot be manually tested
- Tick checkboxes for included test types

### Release notes

- Write brief notes describing user-facing changes
- Use imperative mood: "Add...", "Fix...", "Remove..."
- Omit this section entirely for internal work (CI, tooling, tests, etc.) that has no user-facing impact

## Concepts, examples, and FAQ (for large or feature-intensive PRs)

When a PR introduces a new system, several new types/APIs, or otherwise has enough surface area that a reviewer would benefit from a glossary, include extra explanatory sections **above** the standard `### Change type` / `### Test plan` / `### Release notes` block. Skip these for small or focused PRs — they're for features and large refactors.

Pull from this menu, in roughly this order, using only what fits:

- **Concepts** — a table of the new terms/types the PR introduces, with `Term | Type | Meaning` columns. Use this when readers need a shared vocabulary to follow the rest of the description.
- **Module augmentation** — short code blocks showing how consumers extend the new types, when the PR exposes augmentable interfaces.
- **Editor API** / **Component props** — `Method | Description` and `Prop | Type | Description` tables for new public surface.
- **Per-shape / per-feature breakdown** — tables showing what each affected shape/module returns or accepts under the new system.
- **Example** — a realistic, copy-pastable code snippet showing how a default implementation uses the new system, plus a second snippet showing how a consumer would override it.
- **FAQ** — anticipated "How do I…?" questions with short code answers. Cover the obvious customization paths a downstream user will reach for first.
- **New examples** — bullet list of any new entries added under `apps/examples/src/examples/`, with a one-line description each, so reviewers know where to look for runnable demos.

Reference: tldraw/tldraw#8410 is a good worked example of all of these sections together.

These sections come **before** `### Change type`. The standard `### Change type` / `### Test plan` / `### Release notes` / `### API changes` / `### Code changes` blocks still appear at the bottom in the usual order.

## API changes section

Include when changes affect `api-report.md`:

```md
### API changes

- Added `Editor.newMethod()` for X
- Breaking! Removed `Editor.oldMethod()`
- Changed `Editor.method()` to accept optional `options` parameter
```

## Code changes table

Create a table that includes net LOC changes for each of the following sections. The sum of all rows must match the total PR diff. Omit rows with no changes.

- Core code — SDK packages (`packages/`) source, excluding tests and API reports
- Tests — unit tests, e2e tests (`*.test.*`, `e2e/`)
- Automated files — generated files (e.g. `api-report.api.md`, snapshots)
- Documentation — docs site and examples (`apps/docs/`, `apps/examples/`)
- Apps — application code (`apps/dotcom/`, `apps/mcp-app/`, `apps/vscode/`, etc.), excluding e2e tests
- Templates — starter templates (`templates/`)
- Config/tooling — config files, lock files, lint config, CI, build scripts (`eslint.config.*`, `yarn.lock`, etc.)

```md
### Code changes

| Section         | LOC change |
| --------------- | ---------- |
| Core code       | +10 / -2   |
| Tests           | +5 / -0    |
| Automated files | +0 / -1    |
| Documentation   | +2 / -0    |
| Apps            | +3 / -1    |
| Templates       | +0 / -0    |
| Config/tooling  | +1 / -0    |
```

## Related issues

Search for and link relevant issues that this PR addresses.

## Human notes (preserve exactly)

The PR author often writes a personal note at the very top of the description, prefaced with a "person" emoji such as 🅯 or 👨 (or similar). This block is human-written and readers trust it as such.

- When **updating** an existing PR description, if the body starts with a paragraph/section led by a person emoji, you MUST preserve it **byte-for-byte exactly** at the top — do not rewrite, reflow, reword, retitle, or "improve" it, even slightly.
- If the human note is longer than a single paragraph, it will be delimited at the end by a `---` horizontal rule. Preserve everything from the person emoji through (and including) that `---` exactly.
- If there is no `---`, the human note is just the leading paragraph led by the person emoji.
- Make all your edits to the content **below** the human note (and below the `---` if present).
- When **creating** a new PR, do not invent a human note — leave that for the author to add.

## Important

- Never include AI attribution unless the PR directly relates to AI tooling
- Never use title case for descriptions - use sentence case
- Never put yourself as co-author of any commits
- Always include an API changes section if the PR has changes to any api-report.md
