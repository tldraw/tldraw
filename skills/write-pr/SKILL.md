---
name: write-pr
description: Reference standards for writing pull request titles and descriptions in the tldraw repository, plus the pre-flight comment sweep over the diff. Use as supporting guidance when another skill or workflow needs PR content standards, not as the user-facing create/update PR workflow.
---

# Writing pull requests

Standards for PR titles and descriptions in tldraw/tldraw.

## Write for the reviewer (read this first)

This is the governing rule; everything below serves it. Write the description for a reviewer who knows the codebase architecture but has **not** read your code or the diff. Their time is the scarce resource. The description's job is to give them the framing they can't get from the code, then get out of the way.

**Default to short.** A few sentences of framing is the norm, not the exception. Match length to the change: a one-line fix needs a sentence; a new system needs the fuller treatment. A description that looks long and structured is not more valuable — often it's less, because it buries the framing under scaffolding. If a reviewer would need their own AI to interpret yours, it has failed.

**Order it coarse to granular.** Structure the description as an inverted pyramid, most important first. A reader should be able to stop at any point and leave with a correct, coherent understanding: a skimmer gets the goal and motivation from the opening lines; someone weighing the approach reads into the design and decisions; a close reviewer continues to the specifics. Never make someone read to the end to find out what the PR is for.

Cover the following, roughly in this order — each layer more detailed than the last, and each optional once the change no longer warrants it:

- **Goal, motivation, and use case.** Why this change, why now, what it's for. What was wrong or missing before. This comes first, always.
- **The higher-level change.** The shape of the solution — behavior and structure, not a line-by-line restatement of the diff.
- **API design and decisions.** New or changed public surface, the approach you picked, what you ruled out and why, and anything you're unsure about. A decision you don't surface is one the reviewer can't catch.
- **Example snippets and fine detail.** For anything touching an API, data shape, or usage pattern, a few lines of before/after say more than a paragraph. Keep them minimal.

**Do not:**

- Restate the diff. No file-by-file walkthrough, no narrating what a function does, no describing *how* the code works step by step. Reviewers can read code.
- Generate tables or lists that mirror the code — a `Method | Description` table that just re-says the signatures, an inventory of every changed file, a term glossary of self-explanatory names.
- Pad with ceremony. Structure that exists to look thorough is noise.

**Never invent the *why*.** The motivation and trade-offs must come from real intent — the commits, the linked issue, or the author. If you don't know why a change was made or what was considered, **ask the user; do not guess.** A confident but fabricated rationale is worse than useless: it's misleading, and it's the thing reviewers most need to trust.

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

Bug fix and improvement PRs (`bugfix` and `improvement` change types) use the before/after template below. Everything else uses this one:

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

Start with: "In order to X, this PR does Y." Follow the reviewer-first rules at the top of this skill.

- X is the **concrete situation that made this work necessary** — the real thing someone was trying to do — not a restatement of what Y does. "In order to let apps carry undo history across editor rebuilds, this adds an API to carry undo history across editor rebuilds" is circular: X just renames Y. Push X up a level to the actual goal, e.g. "so desktop can reload the editor without losing the user's place, the way HMR preserves component state across a code edit."
- Name the real driving case, not a hypothetical. If you're inventing example scenarios to illustrate the why ("e.g. if someone toggled a plugin…"), you're reverse-engineering a justification from the finished code — you haven't written down the case that actually prompted it. Work forward from that case instead.
- Beware abstract mechanism as a stand-in for motivation. A true technical fact about the SDK ("editor config is fixed at construction time") explains a constraint, not why anyone cares. Keep going until a reader can picture the specific thing that stopped working or became possible.
- Keep it specific - avoid vague phrases like "improve user experience"
- Link related issues in the first paragraph
- Don't expect readers to also read the linked issue

### Bug fix and improvement PRs

Bug fix and improvement PRs use a fixed shape instead of the description paragraph. The same reviewer-first rules apply; the structure exists so a reviewer can see what was wrong (or lacking), what it does now, and why, without reading the diff.

```md
This PR fixes a bug where <symptom a user or developer would hit>.

### Before

<what the code did and why that produced the symptom>

### After

<what the code does now>

### Implementation notes

<optional: what exactly changed and how — decisions, trade-offs, anything non-obvious>

### Change type

- [x] `bugfix` | `improvement`

### Test plan

- [x] Unit tests — the new test fails on `main` and passes with this change

### Release notes

- Fix <symptom> | Improve <behavior>

### Code changes

| Section   | LOC change |
| --------- | ---------- |
| Core code | +10 / -2   |
| Tests     | +5 / -0    |
```

- **Intro** — one sentence. For a bug: "This PR fixes a bug where X," where X is the observable symptom, not the cause or the fix. For an improvement: "This PR improves X so that Y," where Y is what a user or developer can now do. Link the issue here if there is one. If the PR does more than one thing, add a second sentence ("It also ...") rather than a list.
- **Before** — the behavior before, and the mechanism that produced it. For a bug, name the function or path at fault; this is the one place a short description of *how* the old code went wrong belongs, because it is the cause the reviewer is checking the fix against. For an improvement, describe what the user or developer had to do (or couldn't do) and what in the code made it that way.
- **After** — the behavior after. State what the code now does, at the same level of detail as Before. Note any spec or doc that was updated alongside.
- **Implementation notes** — optional. Include only when there is something the Before/After pair doesn't carry: an approach you chose over another, a subtlety in the change, a follow-up you deliberately left out. Skip the heading entirely when there is nothing to say; most small fixes have nothing.
- The `### Change type` / `### Test plan` / `### Release notes` / `### API changes` / `### Code changes` blocks follow as usual. For bug fixes, say in the test plan whether the new tests fail on `main`.

tldraw/tldraw#10117, #10118, and #10119 are worked examples of bug fixes in this shape.

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

## Concepts, examples, and FAQ (only when a reviewer genuinely needs them)

Gate these on reviewer *need*, not PR size. A large PR is not a reason to add tables — a reviewer who needs shared vocabulary or a usage example to follow the change is. Most large PRs don't clear that bar. When they do, include the relevant sections **above** the standard `### Change type` / `### Test plan` / `### Release notes` block.

Guardrail: a row only earns its place if it says something the code doesn't. A `Method | Description` table that restates signatures, or a Concepts row for a self-explanatory name, is diff-duplication — cut it. If in doubt, leave it out.

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

This table is a deliberate exception to "don't restate the diff": it's a high-level index, not prose pretending to be insight. It lets a reviewer gauge scope at a glance — how much is core code vs tests vs generated vs tooling — and decide where to look. Always include it.

Create a table that includes net LOC changes for each of the following sections. The sum of all rows must match the total PR diff. Omit rows with no changes.

- Core code — SDK packages (`packages/`) source, excluding tests and API reports
- Tests — unit tests, e2e tests (`*.test.*`, `e2e/`)
- Automated files — generated files (e.g. `api-report.api.md`, snapshots)
- Documentation — docs site and examples (`apps/docs/`, `apps/examples/`)
- Apps — application code (`apps/dotcom/`, `apps/mcp-app/`, `apps/vscode/`, etc.), excluding e2e tests
- Templates — starter templates (`templates/`)
- Config/tooling — config files, lock files, lint config, CI, build scripts (`.oxlintrc.json`, `yarn.lock`, etc.)

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

## The comment sweep

A pre-flight check on the diff, not the description: read the diff's added comments as carefully as its added code, and cut before opening the PR.

```bash
git diff origin/main...HEAD -U0 | grep -nE '^\+\s*(//|/\*|\*)'
```

Judge what that prints against **Comments** in the root `AGENTS.md`. That section is the rule and this one does not restate it — one test is worth carrying in your head as you read:

> **A good comment names a failure mode, not a mechanism.**

The mechanism is on screen already. What isn't is what goes wrong without it. A block that only describes what the code does is cuttable in full; a block that says "otherwise X" keeps that sentence and loses the paragraph explaining it twice.

**Expect length, not category, to be the defect.** Most substantial comment blocks that need editing already name a real force — they are the right kind of comment at two or three times the necessary length. So the usual edit is a trim to the load-bearing lines, not a delete.

Leave alone, or trim at most: diagrams, enumerated case lists where the list is the specification, provenance (an issue number, "we tried X and it did Y"), and anything carrying an invariant. In `packages/*`, doc comments on the `@public` surface are the API reference — hold them to the same "says something the code doesn't" bar, but they are a deliverable, not overhead.

Pre-flight rather than post-review because it is cheap now and expensive later. A comment restating its own code reads as padding, costs a review round-trip to remove, and once merged nobody goes back for it. Explaining the change is the PR body's job — the diff is not where that belongs.

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
