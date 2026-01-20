# Release note examples

## Minor release structure

```markdown
## v4.3.0

This month's release includes significant sync improvements, new editor APIs, and several bug fixes.

### API changes

- Add `Editor.getShapesAtPoint()` for hit testing at specific coordinates. ([#7123](https://github.com/tldraw/tldraw/pull/7123))
- Add `persistenceKey` option to `useSyncDemo` for local storage fallback. ([#7089](https://github.com/tldraw/tldraw/pull/7089))

### Improvements

- Improve arrow snapping performance when many shapes are on canvas. ([#7145](https://github.com/tldraw/tldraw/pull/7145))
- Reduce initial load time by lazy-loading shape utilities. ([#7112](https://github.com/tldraw/tldraw/pull/7112))

### Bug fixes

- Fix text selection on touch devices. ([#7134](https://github.com/tldraw/tldraw/pull/7134))
- Fix undo/redo not working after paste operations. ([#7098](https://github.com/tldraw/tldraw/pull/7098)) (contributed by [@community-user](https://github.com/community-user))

[View release on GitHub](https://github.com/tldraw/tldraw/releases/tag/v4.3.0)
```

## Featured section example

```markdown
### SQLite storage for sync ([#7320](https://github.com/tldraw/tldraw/pull/7320))

Added `SQLiteSyncStorage` - a new storage backend for `TLSocketRoom` that automatically persists room state to SQLite. This is now the recommended approach for production deployments.

Previously, you needed to implement your own storage layer:

\`\`\`tsx
// Before: manual implementation required
const room = new TLSocketRoom({ storage: new MyCustomStorage() })
\`\`\`

Now you can use the built-in SQLite storage:

\`\`\`tsx
// After: built-in SQLite support
import { SQLiteSyncStorage } from '@tldraw/sync'

const storage = new SQLiteSyncStorage({ path: './data' })
const room = new TLSocketRoom({ storage })
\`\`\`
```

## Breaking changes example

````markdown
### Breaking changes

- Remove deprecated `Editor.getShapeById()` method. Use `Editor.getShape()` instead. ([#7200](https://github.com/tldraw/tldraw/pull/7200))
- Change `TLStore.createStore()` to require explicit schema version. ([#7185](https://github.com/tldraw/tldraw/pull/7185))

  ```tsx
  // Before
  const store = createStore()

  // After
  const store = createStore({ schema: mySchema })
  ```
````

````

## index.mdx entry

When adding a new release to the index:

```markdown
## v4.x

- [v4.3.0](/releases/v4.3.0) - SQLite sync storage, new hit testing APIs
- [v4.2.0](/releases/v4.2.0) - Performance improvements, arrow binding fixes
- [v4.1.0](/releases/v4.1.0) - Collaborative cursors, undo stack improvements
- [v4.0.0](/releases/v4.0.0) - Major sync overhaul, new binding system
````

## next.mdx structure

```markdown
---
title: 'v4.4.0'
created_at: 01/15/2025
updated_at: 01/15/2025
keywords:
  - changelog
  - release
  - v4.4.0
---

# Next release

This page documents changes that will be included in the next release.

## v4.4.0

### API changes

- Add `Editor.zoomToSelection()` method. ([#7250](https://github.com/tldraw/tldraw/pull/7250))

### Improvements

### Bug fixes
```
