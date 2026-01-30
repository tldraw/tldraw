# Formatting conventions

## Section order

Use these sections in order (omit empty sections):

1. **Introduction paragraph** - 1-2 sentence summary of the release highlights
2. **Featured sections** - Major features and breaking changes with migration guides (separated by `---`)
3. **API changes** - New methods, properties, options, deprecations, and breaking changes
4. **Improvements** - Enhancements to existing functionality
5. **Bug fixes** - Fixed issues

## Introduction paragraph

Start each release with a 1-2 sentence summary highlighting the most significant changes. Lead with concrete features, then mention infrastructure and performance:

```markdown
This release introduces several significant changes: a new pattern for defining custom shape/binding typings, pluggable storage for `TLSocketRoom` with a new SQLite option, reactive `editor.inputs`, and optimized draw shape encoding. It also adds various other API improvements, performance optimizations, and bug fixes.
```

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

For headline features and major breaking changes, add dedicated sections with comprehensive details. Separate featured sections with horizontal rules (`---`).

### Basic structure

```markdown
### Feature name ([#7320](https://github.com/tldraw/tldraw/pull/7320))

Brief description of what this feature does and why it matters.
```

### Collapsible details

Use `<details>` for migration guides, explanations, and supplementary information:

```markdown
### New pattern for custom types (breaking change) ([#7091](https://github.com/tldraw/tldraw/pull/7091))

Brief description of the change.

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

### "Why" explanations

For major features, explain the benefits:

```markdown
<details>
<summary>Why SQLite?</summary>

- **Automatic persistence**: Data survives process restarts without manual snapshot handling
- **Lower memory usage**: No need to keep entire documents in memory
- **Faster startup**: No need to load the document into memory before accepting connections

</details>
```

### Platform support tables

When a feature has platform-specific implementations:

```markdown
<details>
<summary>Platform support</summary>

| Platform                   | Wrapper                          | Library                           |
| -------------------------- | -------------------------------- | --------------------------------- |
| Cloudflare Durable Objects | `DurableObjectSqliteSyncWrapper` | Built-in `ctx.storage`            |
| Node.js/Deno               | `NodeSqliteWrapper`              | `better-sqlite3` or `node:sqlite` |

</details>
```

### Links to documentation

Include links to relevant docs and examples:

```markdown
See the [Custom Shapes Guide](https://tldraw.dev/docs/shapes#Custom-shapes-1) and the [Pin Bindings example](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/pin-bindings) for details.
```

### Multiple related PRs

When a feature spans multiple PRs, list them in the heading:

```markdown
### Pluggable storage for TLSocketRoom ([#7320](https://github.com/tldraw/tldraw/pull/7320), [#7123](https://github.com/tldraw/tldraw/pull/7123))
```

### Breaking change featured sections

For breaking changes significant enough to warrant a featured section:

```markdown
### Optimized draw shape encoding ([#7364](https://github.com/tldraw/tldraw/pull/7364), [#7710](https://github.com/tldraw/tldraw/pull/7710))

Draw and highlight shape point data is now stored using a compact delta-encoded binary format instead of JSON arrays. This reduces storage size by approximately 80% while preserving stroke fidelity.

<details>
<summary>Breaking change details</summary>

If you were reading or writing draw shape data programatically you might need to update your code to use the new format.

- `TLDrawShapeSegment.points` renamed to `.path` and changed from `VecModel[]` to `string` (base64-encoded)
- Added `scaleX` and `scaleY` properties to draw and highlight shapes

Existing documents are automatically migrated.

</details>
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
