---
title: Selection system
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - selection
  - select
  - bounds
  - rotation
  - group
---

## Overview

The selection system manages which shapes are currently selected in the editor. It provides computed properties for retrieving selected shapes and their collective properties (like bounds and rotation), enforces selection rules to maintain consistency, and exposes methods for programmatically changing the selection. The system ensures that ancestors and descendants are never selected simultaneously, automatically manages focus groups when selecting grouped shapes, and filters out locked shapes from bulk operations.

## Selected shape IDs

The editor tracks selection through the `selectedShapeIds` array in the current page's instance state. This array stores the IDs of all currently selected shapes and serves as the source of truth for selection state.

```typescript
// Get currently selected shape IDs
const selectedIds = editor.getSelectedShapeIds()

// Get the actual shape objects
const selectedShapes = editor.getSelectedShapes()
```

The `getSelectedShapes()` method resolves the IDs to actual shape records, filtering out any IDs that no longer exist in the store.

## Selection methods

### Basic selection

The editor provides several methods for changing the selection:

```typescript
// Select specific shapes (replaces current selection)
editor.select(shapeId1, shapeId2)
editor.setSelectedShapes([shapeId1, shapeId2])

// Deselect specific shapes (removes from current selection)
editor.deselect(shapeId1)

// Clear all selection
editor.selectNone()
```

Both `select()` and `setSelectedShapes()` replace the current selection entirely. Use `deselect()` to remove specific shapes while keeping others selected.

### Select all

The `selectAll()` method selects all unlocked shapes, with smart scoping based on the current selection:

```typescript
editor.selectAll()
```

The behavior adapts to context:

- If nothing is selected, it selects all page-level shapes
- If shapes are selected that share a common parent (like shapes inside a group), it selects all shapes within that parent
- If the selected shapes have different parents, it does nothing

This allows users to progressively select "outward" by calling `selectAll()` multiple times.

### Adjacent selection

Select the next or previous shape in reading order, or navigate by cardinal direction:

```typescript
editor.selectAdjacentShape('next')
editor.selectAdjacentShape('prev')
editor.selectAdjacentShape('left')
editor.selectAdjacentShape('right')
```

When selecting by cardinal direction, the system uses geometric distance and directional scoring to find the most appropriate adjacent shape.

### Hierarchical selection

Navigate the shape hierarchy:

```typescript
// Select the parent of the currently selected shape
editor.selectParentShape()

// Select the first child of the currently selected shape
editor.selectFirstChildShape()
```

These methods automatically zoom to the selected shape if it's offscreen.

## Single shape helpers

When you need to work with exactly one selected shape, use these convenience methods:

```typescript
// Get the ID if exactly one shape is selected, null otherwise
const id = editor.getOnlySelectedShapeId()

// Get the shape if exactly one shape is selected, null otherwise
const shape = editor.getOnlySelectedShape()
```

These return `null` if zero shapes or multiple shapes are selected.

## Selection bounds

The editor computes bounds for the current selection in two ways: axis-aligned and rotated.

### Axis-aligned bounds

The `getSelectionPageBounds()` method returns the axis-aligned bounding box that contains all selected shapes:

```typescript
const bounds = editor.getSelectionPageBounds()
if (bounds) {
  console.log(bounds.x, bounds.y, bounds.width, bounds.height)
}
```

If the selection includes rotated shapes, these bounds represent the smallest axis-aligned box that would contain the rotated shapes. The method returns `null` if nothing is selected.

### Rotated bounds

The `getSelectionRotatedPageBounds()` method returns bounds that respect the shared rotation of the selection:

```typescript
const rotatedBounds = editor.getSelectionRotatedPageBounds()
```

This is used for displaying the selection box UI. If all selected shapes share the same rotation, the bounds rotate with them. If shapes have different rotations, this falls back to axis-aligned bounds.

The shared rotation angle is available via `getSelectionRotation()`, which returns `0` if shapes have different rotations.

### Screen space bounds

Both bound types have screen-space equivalents that account for the camera's zoom and pan:

```typescript
const screenBounds = editor.getSelectionScreenBounds()
const rotatedScreenBounds = editor.getSelectionRotatedScreenBounds()
```

## Selection rules

The editor automatically enforces selection consistency through store side effects.

### Ancestor-descendant filtering

When the selection changes, the editor filters out any shape whose ancestor is also selected:

```typescript
// If you try to select a shape and its parent, only the parent remains selected
editor.select(groupId, childOfGroupId)
// Result: only groupId is selected
```

This prevents ambiguous situations where both a container and its contents are selected. The filtering happens in the `instance_page_state` after-change side effect.

### Focused group management

When selecting shapes that are children of a group, the editor automatically updates the focused group:

```typescript
// Selecting shapes inside a group focuses that group
editor.select(shapeInsideGroup)
// The group becomes the focused group
```

The focused group determines which shapes are editable and visible in the current "editing context". If all selected shapes share a common group ancestor, that group becomes focused. If the selection is cleared or contains shapes without a common group ancestor, the focused group is cleared.

## Locked shapes

Locked shapes are excluded from bulk selection operations. The `_getUnlockedShapeIds()` helper filters shape IDs:

```typescript
// selectAll only selects unlocked shapes
editor.selectAll()

// Operations like delete and duplicate also respect locks
editor.deleteShapes(shapeIds) // Only deletes unlocked shapes
```

Individual shape selection through `select()` is not restricted by locks, allowing users to explicitly select locked shapes when needed.

## Ancestor checking

To determine if a shape's ancestor is selected, use `isAncestorSelected()`:

```typescript
const hasSelectedAncestor = editor.isAncestorSelected(shape)
```

This walks up the shape's parent chain and returns `true` if any ancestor is in the current selection. This is useful for determining whether a shape is implicitly selected through its parent.

## Key files

- packages/editor/src/lib/editor/Editor.ts - Selection methods and computed properties
- packages/editor/src/lib/editor/derivations/shapeIdsInCurrentPage.ts - Page-scoped shape tracking
- packages/editor/src/lib/editor/types/selection-types.ts - Selection-related type definitions

## Related

- [Snapping](./snapping.md)
- [Shape indexing](./shape-indexing.md)
