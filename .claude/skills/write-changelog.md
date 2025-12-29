---
name: write-changelog
description: Guidance on writing and maintaining the changelog in `apps/docs/content/changelog/`. Use this when writing or updating the changelog.
---

# Changelog writing guidelines

This skill provides guidance for writing, maintaining, and understanding the changelog in `apps/docs/content/changelog/`.

## Changelog structure

The changelog lives in `apps/docs/content/changelog/` and consists of:

### `index.mdx` - The changelog landing page

The index file serves as the entry point and table of contents for all releases. It:

- Lists all releases grouped by major version (v4.x, v3.x, v2.x)
- Provides brief one-line descriptions for each release
- Links to individual release pages
- Has a "Next" section at the top pointing to unreleased changes

When a new release is published, add it to the appropriate version group with a brief description of its highlights.

### `next.mdx` - The upcoming release

The `next.mdx` file accumulates changes as PRs are merged to main. It:

- Has frontmatter with the upcoming version number (e.g., `title: 'v4.3'`)
- Contains all changelog-worthy changes since the last release
- Is written as if the release has already happened
- Gets renamed to `vX.Y.mdx` when published

Check the frontmatter `title` to determine the current upcoming version.

### `vX.Y.mdx` - Historical releases

Each minor release has its own file (e.g., `v4.2.mdx`, `v3.15.mdx`). These files:

- Document all changes in that minor release
- Include patch releases at the bottom after a horizontal rule
- Are immutable once published (except for patch release additions)

### Release workflow

1. Changes accumulate in `next.mdx` as PRs merge to main
2. When a release is published:
   - Rename `next.mdx` to the version number (e.g., `v4.3.mdx`)
   - Update `order` in frontmatter (increment by 1)
   - Create a new `next.mdx` for the following version
   - Update `index.mdx` to add the new release and update the "Next" section

## Finding the previous release

To determine what's new since the last release:

1. Read `next.mdx` frontmatter to get the current version (e.g., "v4.3")
2. Calculate the previous release branch:
   - For v4.3, the previous branch is `v4.2.x`
   - For v5.0, find the highest v4.N.x branch
   - For v5.12, the previous branch is `v5.11.x`
3. Use git to find commits on main not on the release branch:
   ```bash
   git log origin/main ^origin/vX.Y.x --oneline
   ```

## Evaluating PRs for the changelog

### PRs to skip

- PRs with `other`, `skip-release`, `chore`, or `dotcom` labels
- PRs with titles starting with "Revert" (unless fixing something user-facing)
- PRs that only affect documentation, translations, or tests

### Categorizing PRs

1. **Breaking changes** - `major` label or breaking change indicators
2. **API changes** - `api` or `feature` label, or adds/removes/modifies public API
3. **Improvements** - `improvement` or `enhancement` label
4. **Bug fixes** - `bugfix` or `bug` label

### Extracting information from PRs

Use `gh pr view NNNN --json number,title,labels,author,body,mergedAt` to fetch PR details.

Look for in the PR body:

- `### Release notes` section for description text
- `### API changes` section for API change details
- `### Change type` checkboxes to determine category

### Team members (do not credit as contributors)

steveruizok, SomeHats, TodePond, ds300, MitjaBezensek, Taha-Hassan-Git, mimecuvalo, huppy-bot, alex-mckenna-1, kostyafarber, max-drake, AniKrisn, github-actions

## Language

- Write in English with American spelling
- The audience is international developers using the tldraw SDK
- Avoid complicated grammar, obscure vocabulary, jokes, or cultural idioms

## Tone

Semi-casual and confident. Professional but not stodgy—intelligent and focused. Be appropriately excited about releases without being salesy.

- "significant performance improvements" not "loads of performance improvements"
- "an overhaul to our migration system" not "big changes to migrations"
- "This release introduces..." not "We're excited to announce..."

Lead with concrete features, then infrastructure changes, then performance.

## Formatting conventions

### Sentence case

Use sentence case for all headings (not Title Case):

- "API changes" not "API Changes"
- "Bug fixes" not "Bug Fixes"

### PR links

Always link to the relevant PR:

```markdown
([#6909](https://github.com/tldraw/tldraw/pull/6909))
```

For multiple related PRs:

```markdown
([#6909](https://github.com/tldraw/tldraw/pull/6909)) ([#7134](https://github.com/tldraw/tldraw/pull/7134))
```

### Contributor attribution

Credit community contributors (not team members):

```markdown
(contributed by [@username](https://github.com/username))
```

Or for collaborative work:

```markdown
(thanks to [@username](https://github.com/username) for help on this one)
```

### Entry format

- Start entries with a verb: "Add", "Fix", "Improve", "Remove"
- Keep descriptions concise but informative
- Focus on what changed and why it matters to users

## Section structure

Use these sections in order (omit empty sections):

1. **Breaking changes** - For releases with breaking changes
2. **API changes** - New methods, properties, options, or deprecations
3. **Improvements** - Enhancements to existing functionality
4. **Bug fixes** - Fixed issues

## Minor release structure

```markdown
## v4.3.0

This month's release includes [brief summary of highlights].

### API changes

- Add `Editor.newMethod()` for doing something useful. ([#7123](https://github.com/tldraw/tldraw/pull/7123))

### Improvements

- Improve arrow snapping performance. ([#7145](https://github.com/tldraw/tldraw/pull/7145))

### Bug fixes

- Fix text selection on touch devices. ([#7134](https://github.com/tldraw/tldraw/pull/7134))

[View release on GitHub](https://github.com/tldraw/tldraw/releases/tag/v4.3.0)
```

## Featured sections

For headline features or important upgrades, add a dedicated section with details:

```markdown
### SQLite storage for sync ([#7320](https://github.com/tldraw/tldraw/pull/7320))

Added `SQLiteSyncStorage` - a new storage backend for `TLSocketRoom` that automatically persists room state to SQLite. This is now the recommended approach for production deployments.
```

Include code examples when helpful for API changes:

````markdown
- Add `localStorageAtom` to `@tldraw/state`. ([#6876](https://github.com/tldraw/tldraw/pull/6876))

  ```tsx
  const myAtom = localStorageAtom('my-key', defaultValue)
  ```
````

## Patch releases

Add patch releases at the bottom of the minor release file, after a horizontal rule:

```markdown
---

## Patch releases

### v4.2.1

Fix text selection flakiness when clicking into text shapes. ([#3643](https://github.com/tldraw/tldraw/pull/3643))

[View release on GitHub](https://github.com/tldraw/tldraw/releases/tag/v4.2.1)
```

Every patch release must have a description—never just a GitHub link.

## Frontmatter

```yaml
---
title: 'v4.3'
created_at: 12/19/2024
updated_at: 12/19/2024
keywords:
  - changelog
  - release
  - v4.3
  - feature-keyword
  - another-keyword
---
```

- Dates in MM/DD/YYYY format
- Always include `changelog`, `release`, and version number as keywords
- Add 2-5 content-relevant keywords (lowercase, hyphens for multi-word)
