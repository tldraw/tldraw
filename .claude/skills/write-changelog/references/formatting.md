# Formatting conventions

## Section order

Use these sections in order (omit empty sections):

1. **API changes** - New methods, properties, options, deprecations, and breaking changes
2. **Improvements** - Enhancements to existing functionality
3. **Bug fixes** - Fixed issues

## Headings

Use sentence case for all headings:

- "API changes" not "API Changes"
- "Bug fixes" not "Bug Fixes"

## Entry format

Start entries with a verb: "Add", "Fix", "Improve", "Remove". Keep descriptions concise but informative.

```markdown
- Add `Editor.newMethod()` for doing something useful. ([#7123](https://github.com/tldraw/tldraw/pull/7123))
```

For multiple related PRs:

```markdown
- Improve arrow snapping performance. ([#7145](https://github.com/tldraw/tldraw/pull/7145)) ([#7150](https://github.com/tldraw/tldraw/pull/7150))
```

## Breaking changes

Mark breaking API changes with a 💥 prefix. Place breaking changes at the top of the API changes section:

```markdown
## API changes

- 💥 **`ShapeUtil.canEdit()`** signature changed to accept a `TLEditStartInfo` parameter. ([#7361](https://github.com/tldraw/tldraw/pull/7361))
- 💥 **`oldMethod`** renamed to `newMethod`. ([#7400](https://github.com/tldraw/tldraw/pull/7400))
- Add `Editor.newMethod()` for doing something useful. ([#7123](https://github.com/tldraw/tldraw/pull/7123))
```

For headline features that are breaking, add 💥 to the heading:

```markdown
### 💥 Draw shape compression ([#7364](https://github.com/tldraw/tldraw/pull/7364))

Draw shapes now use base64 encoding. This is a **breaking change** if you're accessing segment data directly.
```

## Contributor attribution

Credit community contributors (not team members):

```markdown
- Fix text selection on touch devices. ([#7134](https://github.com/tldraw/tldraw/pull/7134)) (contributed by [@username](https://github.com/username))
```

Or for collaborative work:

```markdown
(thanks to [@username](https://github.com/username) for help on this one)
```

## Featured sections

For headline features, add a dedicated section with details:

```markdown
### SQLite storage for sync ([#7320](https://github.com/tldraw/tldraw/pull/7320))

Added `SQLiteSyncStorage` - a new storage backend for `TLSocketRoom` that automatically persists room state to SQLite. This is now the recommended approach for production deployments.
```

## Code examples

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

Every patch release must have a description.

## Frontmatter

```yaml
---
title: 'v4.3.0'
created_at: 12/19/2024
updated_at: 12/19/2024
keywords:
  - changelog
  - release
  - v4.3.0
  - feature-keyword
  - another-keyword
---
```

- Dates in MM/DD/YYYY format
- Always include `changelog`, `release`, and version number as keywords
- Add 2-5 content-relevant keywords (lowercase, hyphens for multi-word)

## Language

- American English spelling
- International developer audience
- Avoid complicated grammar, obscure vocabulary, jokes, or cultural idioms
