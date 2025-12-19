# How to write the changelog

This guide explains how to write changelog articles for tldraw releases. The original releases can be found at [https://github.com/tldraw/tldraw/releases](https://github.com/tldraw/tldraw/releases). Use the `write-changelog` skill if it is available to you.

## Overview

Changelog files live in `documentation/changelog/`. Each minor release gets its own markdown file (e.g., `v4.2.md`), with patch releases added at the bottom of their parent file.

The `/changelog` command automates updating the changelog by finding merged PRs and formatting them. Detailed formatting rules are in the `write-changelog` skill at `.claude/skills/changelog.md`.

## The next.md file

The `next.md` file is a working changelog for the upcoming release. It accumulates changes as PRs are merged to main.

**Workflow:**

1. During development, `next.md` contains the changelog for the next version
2. Run `/changelog` to update it with recent PRs
3. When the release is published, rename `next.md` to the version number (e.g., `v4.3.md`)
4. Create a new `next.md` for the following release

## Language and tone

- Write in English with American spelling
- The audience is international developers—avoid idioms and cultural references
- Semi-casual and confident tone, professional but not stodgy
- Lead with concrete features, then infrastructure, then performance

## Structure

### Minor releases

```markdown
## v4.3.0

This month's release includes [brief summary].

### API changes

- Add `Editor.newMethod()` for doing something. ([#7123](https://github.com/tldraw/tldraw/pull/7123))

### Improvements

- Improve performance of X. ([#7145](https://github.com/tldraw/tldraw/pull/7145))

### Bug fixes

- Fix issue with Y. ([#7134](https://github.com/tldraw/tldraw/pull/7134))

[View release on GitHub](https://github.com/tldraw/tldraw/releases/tag/v4.3.0)
```

### Sections (in order)

1. **Breaking changes** - For releases with breaking changes
2. **API changes** - New methods, properties, options, deprecations
3. **Improvements** - Enhancements to existing functionality
4. **Bug fixes** - Fixed issues

Omit empty sections.

### Featured items

For headline features, add a dedicated section with details:

```markdown
### SQLite storage for sync ([#7320](https://github.com/tldraw/tldraw/pull/7320))

Added `SQLiteSyncStorage` - a new storage backend that persists room state to SQLite.
```

### Patch releases

Add at the bottom after a horizontal rule:

```markdown
---

## Patch releases

### v4.2.1

Fix text selection flakiness. ([#3643](https://github.com/tldraw/tldraw/pull/3643))

[View release on GitHub](https://github.com/tldraw/tldraw/releases/tag/v4.2.1)
```

## Formatting

- **Sentence case** for headings: "API changes" not "API Changes"
- **Start with verbs**: "Add", "Fix", "Improve", "Remove"
- **Link PRs**: `([#6909](https://github.com/tldraw/tldraw/pull/6909))`
- **Credit contributors**: `(contributed by [@user](https://github.com/user))`

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
---
```

Always include `changelog`, `release`, and the version number. Add 2-5 content-relevant keywords.

## Checklist

Before publishing:

- [ ] All significant changes documented
- [ ] PR links are correct
- [ ] Community contributors credited
- [ ] Breaking changes have migration guidance
- [ ] Sections in correct order
- [ ] Patch releases have descriptions (not just links)
