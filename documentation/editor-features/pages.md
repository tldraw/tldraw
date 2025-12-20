---
title: Pages
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - page
  - pages
  - multi-page
  - navigation
---

## Overview

The pages system provides multiple independent drawing surfaces within a single document. Each page acts as a separate canvas with its own shapes, camera position, and selection state, enabling users to organize related content into distinct sections or create multi-page presentations. Pages share the same schema and tool configuration, but maintain separate shape hierarchies and instance state, allowing users to navigate between contexts without losing their place or selections on other pages.

When you switch pages, the editor preserves your camera position and selected shapes on the previous page and restores the state you left on the new page. This per-page instance state means each page remembers what was selected, what's being edited, and where the viewport was positioned. The page system integrates with collaboration features, allowing users to see which pages their collaborators are viewing and follow them across page boundaries.

## How it works

Each page is a record in the store with a unique ID, a name for display, and an index for ordering. Pages belong to the document scope, meaning they persist across sessions and sync in collaborative environments. When you create a page, the editor automatically creates associated records for the camera position and instance page state.

The camera record tracks viewport position and zoom specific to each page. When you navigate to a different page, the editor saves your current camera position and restores the camera for the destination page. This per-page camera state allows each page to maintain its own view, independent of other pages.

The instance page state record tracks selection, editing state, focused groups, and other transient UI state that's unique to both a page and a browser session. This state belongs to the session scope, meaning it doesn't sync in collaborative environments. Each user maintains their own instance page state for each page they visit.

## Page methods

### Navigation

Switch to a different page using `setCurrentPage()`:

```typescript
editor.setCurrentPage('page:page2')
```

When switching pages, the editor completes any in-progress interactions and stops following other users. The camera constraints are reapplied to ensure the new page's camera respects its configured bounds.

Get the current page or page ID:

```typescript
const currentPage = editor.getCurrentPage()
const currentPageId = editor.getCurrentPageId()
```

Access any page by ID:

```typescript
const page = editor.getPage('page:page1')
const allPages = editor.getPages()
```

### Creating and deleting pages

Create new pages with `createPage()`, which ensures unique page names and proper index ordering:

```typescript
editor.createPage({ name: 'Wireframes' })
```

The editor enforces a maximum page count through the `maxPages` option. Attempts to create pages beyond this limit are ignored.

Delete pages with `deletePage()`:

```typescript
editor.deletePage('page:page1')
```

When deleting the current page, the editor switches to an adjacent page automatically. The last remaining page cannot be deleted. When a page is deleted, all shapes on that page are removed and the associated camera and instance page state records are cleaned up.

### Duplicating pages

Duplicate an entire page including all its shapes and camera position:

```typescript
editor.duplicatePage('page:main')
```

The duplicated page receives a copy of all shapes from the source page, preserving their positions, properties, and bindings between copied shapes. The camera position is copied from the source page. The new page's name appends " Copy" to the original page name.

### Updating pages

Update page properties like name or metadata:

```typescript
editor.updatePage({ id: 'page:page1', name: 'Updated Name' })
```

The index property determines page order in the UI. Pages are sorted by index to maintain consistent ordering across clients in collaborative sessions.

## Working with shapes across pages

### Page-specific shape queries

Each page maintains its own shape hierarchy. Get shapes on the current page:

```typescript
const shapes = editor.getCurrentPageShapes()
const shapeIds = editor.getCurrentPageShapeIds()
```

Get shapes from any page:

```typescript
const pageShapeIds = editor.getPageShapeIds('page:page2')
```

These queries return only the top-level and nested shapes that belong to the specified page. Shapes are parented to pages through their `parentId` field.

### Moving shapes between pages

Transfer shapes from one page to another using `moveShapesToPage()`:

```typescript
editor.moveShapesToPage(['shape:rect1', 'shape:circle2'], 'page:page2')
```

The operation copies the shapes to the destination page at the same position and then removes them from the source page. Bindings between moved shapes are preserved, but bindings to shapes not being moved are removed and receive isolation callbacks. The editor enforces per-page shape limits through the `maxShapesPerPage` option.

When shapes move to a new page, their camera coordinates remain the same, but the destination page's camera position may differ. After moving shapes, you typically want to switch to the destination page and adjust the camera to focus on the moved shapes.

## Collaboration and pages

In collaborative sessions, each user's current page is tracked through the presence system. The editor provides methods to see which pages collaborators are viewing:

```typescript
const collaboratorsOnThisPage = editor.getCollaboratorsOnCurrentPage()
```

When following a user who switches pages, your editor switches pages automatically to maintain the follow relationship. See [User following](./user-following.md) for details on cross-page following behavior.

## Integration with other systems

The pages system interacts with several editor features:

**Camera system** - Each page has its own camera record, preserving zoom and position independently. Camera constraints and options apply per-page.

**Bindings** - Bindings can only connect shapes on the same page. When shapes move to different pages, their bindings are automatically removed.

**History** - Undo and redo operations are document-wide, not page-specific. Undoing a page creation removes the page and all its shapes.

**Deep links** - URLs can encode specific page IDs, allowing direct navigation to a particular page when loading a document.

## Examples

- **[Disable pages](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/disable-pages)** - Disable page-related UI for single-page use cases by setting the maxPages option to 1.
- **[Deep links](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/deep-links)** - Create URLs that navigate to specific pages or parts of a document using the deep links API.

## Key files

- packages/editor/src/lib/editor/Editor.ts - Page methods (createPage, deletePage, setCurrentPage, duplicatePage, moveShapesToPage)
- packages/tlschema/src/records/TLPage.ts - Page record definition
- packages/tlschema/src/records/TLPageState.ts - Instance page state record definition
- packages/tlschema/src/records/TLCamera.ts - Camera record definition

## Related

- [Camera system](./camera-system.md)
- [Selection system](./selection-system.md)
- [User following](./user-following.md)
- [Deep links](./deep-links.md)
