---
title: Pages
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - page
  - pages
  - multi-page
  - navigation
reviewed_by: steveruizok
status: published
date: 12/20/2024
order: 18
---

The pages system provides multiple independent sub-documents within a single tldraw document. Each page acts as a separate scene graph root with its own descendant shapes, camera position, and selection state.

When you switch pages, the editor preserves your camera position and selected shapes on the previous page and restores the state you left on the new page. The page system integrates with collaboration features, allowing users to see which pages their collaborators are viewing and follow them across page boundaries.

## How it works

Each page is a record in the store with a unique ID, a name for display, and an index for ordering. Pages belong to the document scope, meaning they persist across sessions and sync in collaborative environments. When you create a page, the editor automatically creates associated records for the camera position and instance page state.

The camera record associated with a page tracks viewport position and zoom for that page only. The editor's current camera is based on the current page: when you navigate to a different page, the editor automatically switches to using the camera for the destination page instead. This per-page camera state allows each user maintain its own view of each page, independent of other others and other pages.

The instance page state record tracks selection, editing state, focused groups, and other transient UI state that's unique to both a page and a browser session. This state belongs to the session scope, meaning it doesn't sync in collaborative environments. Each user maintains their own instance page state for each page they visit.

Pages are ordered. As with shapes, the page record's index property determines its order among other pages.

## Page methods

### Access

Get the current page or page ID:

```typescript
const currentPage = editor.getCurrentPage()
const currentPageId = editor.getCurrentPageId()
```

Access any page by ID:

```typescript
const page = editor.getPage('page:page1' as TLPageId)
const allPages = editor.getPages()
```

### Navigation

Switch to a different page using `setCurrentPage()`:

```typescript
editor.setCurrentPage('page:page2')
```

When switching pages, the editor completes any in-progress interactions and stops following other users. The camera constraints are reapplied to ensure the new page's camera respects its configured bounds.

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
editor.duplicatePage('page:main' as TLPageId)
```

The duplicated page receives a copy of all shapes from the source page, preserving their positions, properties, and bindings between copied shapes. The camera position is copied from the source page. The new page's name appends " Copy" to the original page name.

### Updating pages

Update page properties like name or metadata:

```typescript
editor.updatePage({ id: 'page:page1', name: 'Updated Name' })
```

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

## Collaboration and pages

In collaborative sessions, each user's current page is tracked through the presence system. The editor provides methods to see which pages collaborators are viewing:

```typescript
const collaboratorsOnThisPage = editor.getCollaboratorsOnCurrentPage()
```

When following the viewport of a user who switches pages, your editor switches pages automatically to maintain the follow relationship. See [User following](./user-following.md) for details on cross-page following behavior.

## Integration with other systems

The pages system interacts with several editor features

**Collaboration** - If you are on a page when a collaborator deletes that page, you will be moved to the next available page.

**Camera system** - Each page has its own camera record, preserving zoom and position independently. Camera constraints and options apply per-page.

**Bindings** - Bindings can only connect shapes on the same page. When shapes move to different pages, their bindings are automatically removed.

**History** - Undo and redo operations are document-wide, not page-specific. Undoing a page creation removes the page and all its shapes. Page changes are undoable.

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
