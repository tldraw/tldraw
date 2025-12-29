---
name: write-changelog
description: Guidance on writing and maintaining the changelog in `documentation/changelog/`. Use this when writing or updating the changelog.
---

# Changelog writing guidelines

This skill provides formatting and style guidance for writing changelog entries in `documentation/changelog/`.

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
