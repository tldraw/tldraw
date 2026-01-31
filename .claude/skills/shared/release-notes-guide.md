# Release notes style guide

This document defines the rules and conventions for tldraw SDK release notes articles in `apps/docs/content/releases/`.

**Prerequisite**: Read the [writing guide](./writing-guide.md) first. This document builds on those foundations with release-notes-specific patterns.

## Editorial guidance

### What to include

- Breaking changes that require user action
- New features that solve common pain points
- API additions that unlock new capabilities
- Changes that affect how developers integrate tldraw
- Bug fixes for user-reported issues

### What to omit

- Internal performance optimizations (unless user-visible)
- Fixes for bugs introduced in the same release cycle
- Implementation details that don't affect public API
- Pure code quality improvements

### When to create a featured section

Promote changes to the "What's new" section when:

- It's a breaking change requiring a migration guide
- It introduces a major new capability
- It is an interesting or significant new feature, possibly the result of multiple PRs
- Users need detailed guidance (migration guides, platform tables)

Featured sections should include:

- Clear description of what changed and why it matters
- Code examples where helpful
- Migration guides in collapsible `<details>` blocks for breaking changes
- Links to relevant documentation

## PR categorization

| Category     | Labels                       | Indicators                       |
| ------------ | ---------------------------- | -------------------------------- |
| API changes  | `api`, `feature`, `major`    | Adds/removes/modifies public API |
| Improvements | `improvement`, `enhancement` | Enhances existing functionality  |
| Bug fixes    | `bugfix`, `bug`              | Fixes issues                     |

Look for `### Release notes` and `### API changes` sections in PR bodies. Search for "breaking" to identify breaking changes.

### PRs to skip

Skip PRs with these labels:

- `other`
- `skip-release`
- `chore`
- `dotcom`

Also skip reverts unless they fix something user-facing.

## Team members (do not credit)

angrycaptain19, AniKrisn, ds300, kostyafarber, max-dra, mimecuvalo, MitjaBezensek, profdl, Siobhantldraw, steveruizok, tldrawdaniel, huppy-bot, github-actions, Somehats, todepond, Taha-Hassan-Git, alex-mckenna-1, max-drake

Credit community contributors with:

```markdown
(contributed by [@username](https://github.com/username))
```

## General notes

- Do not include Claude Code attribution
- Write as if the release has already happened
- Omit empty sections
- The release listing is maintained in `apps/docs/content/getting-started/releases.mdx`

---

## Formatting conventions

### Section order

Use these sections in order (omit empty sections):

1. **Introduction paragraph** - 1-2 sentence summary of the release highlights
2. **What's new** (`## What's new`) - Featured sections (H3s) for major features and breaking changes
3. **API changes** (`## API changes`) - New methods, properties, options, deprecations, and breaking changes
4. **Improvements** (`## Improvements`) - Enhancements to existing functionality
5. **Bug fixes** (`## Bug fixes`) - Fixed issues
6. **Patch releases** (`## Patch releases`) - Separated by `---`, contains bulleted changes for each patch version

### Introduction paragraph

Start each release with a 1-2 sentence summary highlighting the most significant changes. Lead with concrete features, then mention infrastructure and performance:

```markdown
This release introduces several significant changes: a new pattern for defining custom shape/binding typings, pluggable storage for `TLSocketRoom` with a new SQLite option, reactive `editor.inputs`, and optimized draw shape encoding. It also adds various other API improvements, performance optimizations, and bug fixes.
```

### Entry format

Start entries with a verb: "Add", "Fix", "Improve", "Remove". Keep descriptions concise but informative.

```markdown
- Add `Editor.newMethod()` for doing something useful. ([#7123](https://github.com/tldraw/tldraw/pull/7123))
```

For multiple related PRs:

```markdown
- Improve arrow snapping performance. ([#7145](https://github.com/tldraw/tldraw/pull/7145), [#7150](https://github.com/tldraw/tldraw/pull/7150))
```

With code examples:

````markdown
- Add `localStorageAtom` to `@tldraw/state`. ([#6876](https://github.com/tldraw/tldraw/pull/6876))

  ```tsx
  const myAtom = localStorageAtom('my-key', defaultValue)
  ```
````

### Breaking changes

Mark breaking API changes with a 💥 prefix. Place breaking changes at the top of the API changes section:

```markdown
## API changes

- 💥 **`ShapeUtil.canEdit()`** signature changed to accept a `TLEditStartInfo` parameter. ([#7361](https://github.com/tldraw/tldraw/pull/7361))
- 💥 **`oldMethod`** renamed to `newMethod`. ([#7400](https://github.com/tldraw/tldraw/pull/7400))
- Add `Editor.newMethod()` for doing something useful. ([#7123](https://github.com/tldraw/tldraw/pull/7123))
```

### What's new section

The `## What's new` section contains featured subsections (H3s) for headline features and major breaking changes.

**Basic structure:**

```markdown
## What's new

### Feature name ([#7320](https://github.com/tldraw/tldraw/pull/7320))

Brief description of what this feature does and why it matters.
```

**Multiple related PRs:**

```markdown
### Pluggable storage for TLSocketRoom ([#7320](https://github.com/tldraw/tldraw/pull/7320), [#7123](https://github.com/tldraw/tldraw/pull/7123))
```

**Breaking change featured sections** - add 💥 to the heading and include a migration guide:

```markdown
### 💥 Feature name ([#0000](https://github.com/tldraw/tldraw/pull/0000))

Brief description of what this feature does and why it matters.

<details>
<summary>Migration guide</summary>

Before:
\`\`\`ts
// old code
\`\`\`

After:
\`\`\`ts
// new code
\`\`\`

</details>
```

**Collapsible explanations** - use for supplementary context:

```markdown
<details>
<summary>Why SQLite?</summary>

- **Automatic persistence**: Data survives process restarts
- **Lower memory usage**: No need to keep entire documents in memory

</details>
```

**Platform support tables:**

```markdown
<details>
<summary>Platform support</summary>

| Platform                   | Wrapper                          | Library                           |
| -------------------------- | -------------------------------- | --------------------------------- |
| Cloudflare Durable Objects | `DurableObjectSqliteSyncWrapper` | Built-in `ctx.storage`            |
| Node.js/Deno               | `NodeSqliteWrapper`              | `better-sqlite3` or `node:sqlite` |

</details>
```

### GitHub release link

Add a link to the GitHub release at the end of each release section:

- **For minor releases**: Place after the last content section and before the `---` separator
- **For patch releases**: Place after the bulleted list of changes

```markdown
[View release on GitHub](https://github.com/tldraw/tldraw/releases/tag/v4.3.0)
```

### Patch releases

Add patch releases at the bottom of the minor release file, after a horizontal rule. List in chronological order:

```markdown
---

## Patch releases

### v4.2.1

- Fix text selection flakiness when clicking into text shapes. ([#3643](https://github.com/tldraw/tldraw/pull/3643))

[View release on GitHub](https://github.com/tldraw/tldraw/releases/tag/v4.2.1)

### v4.2.2

- Fix arrow binding when target shape is rotated. ([#3650](https://github.com/tldraw/tldraw/pull/3650))

[View release on GitHub](https://github.com/tldraw/tldraw/releases/tag/v4.2.2)
```

### Horizontal rules

Use `---` only before the `## Patch releases` section. Do not use horizontal rules elsewhere.

### Headings

Use sentence case: "API changes" not "API Changes", "Bug fixes" not "Bug Fixes".

### Frontmatter

```yaml
---
title: 'v4.3.0'
created_at: 12/19/2024
updated_at: 12/19/2024
keywords:
  - changelog
  - release
  - v4.3
  - v4.3.0
  - v4.3.1
  - feature-keyword
---
```

- Dates in MM/DD/YYYY format
- Always include `changelog` and `release` as keywords
- Include the minor version without patch (e.g., `v4.3`), the `.0` release, and all patch versions
- Add 2-5 content-relevant keywords (lowercase, hyphens for multi-word)
