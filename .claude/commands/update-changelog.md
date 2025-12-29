Update the changelog file at `apps/docs/content/changelog/next.mdx` based on PRs merged to main since the previous release.

## Style guide

Read and follow the voice and style guidelines in `.claude/skills/write-docs.md`. Key points for changelogs:

- Write in English with American spelling
- Semi-casual and confident tone, professional but not stodgy
- The audience is international developers—avoid idioms and cultural references
- Use sentence case for headings: "API changes" not "API Changes"
- Start entries with verbs: "Add", "Fix", "Improve", "Remove"
- Be appropriately concise. This is a changelog, not documentation

## Process

### 1. Determine the current and previous versions

Read `apps/docs/content/changelog/next.mdx` to find the current version from the frontmatter title (e.g., "v4.3" means current version is 4.3).

Calculate the previous release branch name:

- For v4.3, the previous branch is `v4.2.x`
- For v5.0, the previous branch is `v4.x.x` (find the highest v4.N.x branch)
- For v5.12, the previous branch is `v5.11.x`

### 2. Get PRs since the last release

Use git to find commits on main that are not on the release branch:

```bash
git log origin/main ^origin/vX.Y.x --oneline
```

Extract PR numbers from commit messages (format: `#NNNN`).

For each PR number, fetch details using:

```bash
gh pr view NNNN --json number,title,labels,author,body,mergedAt
```

### 3. Filter and categorize PRs

**Skip PRs that should not be in the changelog:**

- PRs with the `other` label (internal changes)
- PRs with the `skip-release` label
- PRs with the `chore` label
- PRs with the `dotcom` label (tldraw.com-only changes)
- PRs with titles starting with "Revert" (unless they fix something user-facing)
- PRs that only affect documentation, translations, or tests

**Categorize PRs into sections:**

1. **Breaking changes** - PRs with `major` label or breaking change indicators
2. **API changes** - PRs with `api` label, `feature` label, or that add/remove/modify public API
3. **Improvements** - PRs with `improvement` or `enhancement` label
4. **Bug fixes** - PRs with `bugfix` or `bug` label

Omit empty sections.

**Extraction from PR body:**

- Look for the "### Release notes" section in the PR body for description text
- Look for the "### API changes" section for API change details
- Check the "### Change type" checkboxes to determine category

### 4. Format entries

Format each entry as:

```markdown
- Add `Editor.newMethod()` for doing something. ([#7123](https://github.com/tldraw/tldraw/pull/7123))
```

For community contributors, add credit:

```markdown
- Fix arrow rendering issue. ([#7134](https://github.com/tldraw/tldraw/pull/7134)) (contributed by [@user](https://github.com/user))
```

**Team members (do not credit as contributors):**

- steveruizok, SomeHats, TodePond, ds300, MitjaBezensek, Taha-Hassan-Git, mimecuvalo, huppy-bot, alex-mckenna-1, kostyafarber, max-drake, AniKrisn, github-actions

### 5. Featured items

For headline features, add a dedicated section with details:

```markdown
### SQLite storage for sync ([#7320](https://github.com/tldraw/tldraw/pull/7320))

Added `SQLiteSyncStorage` - a new storage backend that persists room state to SQLite.
```

### 6. Write or update next.mdx

Update the sections in `apps/docs/content/changelog/next.mdx`. The article should be written as if the release had already been made.

Structure:

```markdown
---
title: 'v4.3'
created_at: 12/19/2024
updated_at: 12/19/2024
keywords:
  - changelog
  - release
  - v4.3
---

## v4.3.0

This release includes [brief summary].

### Breaking changes

- ...

### API changes

- ...

### Improvements

- ...

### Bug fixes

- ...

[View release on GitHub](https://github.com/tldraw/tldraw/releases/tag/v4.3.0)
```

If pull requests are already documented, you do not necessarily need to update those sections. You may need to update the introduction and summary if there have been new changes.

### 7. Review the changes

After updating, verify:

- [ ] All significant changes are documented
- [ ] PR links are correct
- [ ] Community contributors are credited
- [ ] Breaking changes include migration guidance
- [ ] Sections are in correct order (breaking → API → improvements → bug fixes)
- [ ] Entries follow sentence case and start with verbs
- [ ] No internal/dotcom-only changes leaked through

## Release workflow

The `next.mdx` file accumulates changes as PRs are merged to main. When a release is published:

1. Rename `next.mdx` to the version number (e.g., `v4.3.mdx`)
2. Create a new `next.mdx` for the following release
3. Update the frontmatter title and dates in the new file

## Notes

- Do not include Claude Code attribution or co-author lines
- The audience is developers using the tldraw SDK
- Always include `changelog`, `release`, and the version number in keywords
