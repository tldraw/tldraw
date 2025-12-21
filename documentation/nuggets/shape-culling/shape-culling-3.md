---
title: Shape culling
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - culling
  - performance
  - viewport
---

# Shape culling

When you have a canvas with thousands of shapes, most of them sit outside the viewport at any given time. We want to avoid rendering those shapes, but we don't want to unmount them—unmounting would destroy React component state, including text editing cursors, selection handles, and any local state shapes maintain.

The solution: hide offscreen shapes with `display: none`. The shapes stay mounted in React's fiber tree, preserving all their state, but the browser skips layout, paint, and hit testing for those elements.

Here's how we track which shapes to hide.

## Reactive computation

The culling logic lives in a computed value that tracks its dependencies automatically:

```typescript
export function notVisibleShapes(editor: Editor) {
  return computed<Set<TLShapeId>>('notVisibleShapes', function updateNotVisibleShapes(prevValue) {
    const nextValue = fromScratch(editor)

    if (isUninitialized(prevValue)) {
      return nextValue
    }

    // If there are more or less shapes, we know there's a change
    if (prevValue.size !== nextValue.size) return nextValue

    // If any of the old shapes are not in the new set, we know there's a change
    for (const prev of prevValue) {
      if (!nextValue.has(prev)) {
        return nextValue
      }
    }

    // If we've made it here, we know that the set is the same
    return prevValue
  })
}
```

Every time this computed value executes, it tracks which reactive signals it accesses—the viewport bounds, shape positions, shape transforms. When any of those change, the computation re-runs automatically.

The `fromScratch` function does the actual bounds checking:

```typescript
function fromScratch(editor: Editor): Set<TLShapeId> {
  const shapesIds = editor.getCurrentPageShapeIds()
  const viewportPageBounds = editor.getViewportPageBounds()
  const notVisibleShapes = new Set<TLShapeId>()
  shapesIds.forEach((id) => {
    const shape = editor.getShape(id)
    if (!shape) return

    const canCull = editor.getShapeUtil(shape.type).canCull(shape)
    if (!canCull) return

    const pageBounds = editor.getShapePageBounds(id)
    if (pageBounds === undefined || !viewportPageBounds.includes(pageBounds)) {
      notVisibleShapes.add(id)
    }
  })
  return notVisibleShapes
}
```

It checks every shape on the page, gets its bounds in page coordinates, and compares against the viewport bounds. If the viewport doesn't include the shape's bounds—either because they don't overlap at all or because the shape's bounds are undefined—the shape gets added to the not-visible set.

## Avoiding unnecessary updates

The optimization happens after we compute the new set. We check if the set contents actually changed:

```typescript
// If there are more or less shapes, we know there's a change
if (prevValue.size !== nextValue.size) return nextValue

// If any of the old shapes are not in the new set, we know there's a change
for (const prev of prevValue) {
  if (!nextValue.has(prev)) {
    return nextValue
  }
}

// If we've made it here, we know that the set is the same
return prevValue
```

If the sizes differ, we know something changed. Otherwise, we check if every shape ID from the previous set exists in the new set. If they all match, we return the previous Set reference—not a new one.

This matters because downstream code checks reference equality. If we returned a new Set with the same contents, every shape component would think the culled set changed and would update its display property unnecessarily. By returning the same reference when contents match, we prevent those DOM writes.

## Applying the culling state

Each shape component watches the culled set and updates its display property when needed:

```typescript
useQuickReactor(
  'set display',
  () => {
    const shape = editor.getShape(id)
    if (!shape) return

    const culledShapes = editor.getCulledShapes()
    const isCulled = culledShapes.has(id)
    if (isCulled !== memoizedStuffRef.current.isCulled) {
      setStyleProperty(containerRef.current, 'display', isCulled ? 'none' : 'block')
      setStyleProperty(bgContainerRef.current, 'display', isCulled ? 'none' : 'block')
      memoizedStuffRef.current.isCulled = isCulled
    }
  },
  [editor]
)
```

`useQuickReactor` runs immediately when its reactive dependencies change—no throttling or animation frame delays. When the culled set updates, each shape checks if its ID is in that set and toggles its display property.

The memoized ref prevents redundant DOM writes. If the shape is already culled and the new computation says it should still be culled, we skip the `setStyleProperty` call entirely.

This approach means shapes never re-render when they move in or out of the viewport. We manipulate the DOM directly, bypassing React's reconciliation. The React component stays mounted, preserving all its state.

## Filtering for selection and editing

The final culled set excludes shapes that are currently selected or being edited:

```typescript
@computed
getCulledShapes() {
  const notVisibleShapes = this.getNotVisibleShapes()
  const selectedShapeIds = this.getSelectedShapeIds()
  const editingId = this.getEditingShapeId()
  const culledShapes = new Set<TLShapeId>(notVisibleShapes)

  if (editingId) {
    culledShapes.delete(editingId)
  }

  selectedShapeIds.forEach((id) => {
    culledShapes.delete(id)
  })

  return culledShapes
}
```

Even if a selected shape sits outside the viewport, we keep it visible. Same for the shape you're editing—hiding it would break text input, IME state, and focus management.

## Source files

- `packages/editor/src/lib/editor/derivations/notVisibleShapes.ts` - Core culling algorithm and incremental computation
- `packages/editor/src/lib/editor/Editor.ts` (lines 5138-5152) - `getCulledShapes()` filtering logic
- `packages/editor/src/lib/components/Shape.tsx` (lines 121-136) - Display property toggling in shape components
- `packages/state-react/src/lib/useQuickReactor.ts` - Immediate reactive effects without throttling
