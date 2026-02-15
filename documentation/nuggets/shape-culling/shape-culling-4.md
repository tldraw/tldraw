---
title: Shape culling
created_at: 12/21/2025
updated_at: 02/13/2026
keywords:
  - culling
  - performance
  - viewport
---

# Shape culling

When you have a canvas with thousands of shapes, most of them sit outside the viewport at any given time. We want to avoid rendering those shapes, but we don't want to unmount them. Unmounting would destroy React component state, including text editing cursors, selection handles, and any local state shapes maintain.

The solution is to hide offscreen shapes with `display: none`. The shapes stay mounted in React, keeping all their state intact, but the browser entirely skips layout, painting and hit-testing for them.

Here's how we track which shapes to hide.

## Reactive computation

Users constantly move the viewport; on every pan and every zoom. We need the set of visible shapes to update automatically whenever the viewport or any shape's position changes without manually subscribing to individual shapes.

The culling logic lives in a computed value that handles this for us:

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

It checks every shape on the page, gets its bounds in page coordinates, and compares against the viewport bounds. If the viewport doesn't include the shape's bounds, either because they don't overlap at all or because the shape's bounds are undefined, the shape gets added to the not-visible set.

## Avoiding unnecessary updates

This computation runs on every viewport change. Each shape component watches the result to decide whether to show or hide itself, and since they check by reference equality, returning a new `Set` with the same contents would cause unnecessary work. To avoid that, we diff against the previous value and reuse the old reference when nothing changed:

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

If the sizes differ, something changed. Otherwise, we check if every shape ID from the previous set exists in the new set. If they all match, we return the previous Set reference—not a new one. Downstream code checks reference equality, so same reference means no updates propagate.

## Applying the culling state

When the culled set does change, we need to toggle CSS on potentially hundreds of shapes in a single frame. A React rerender for each one would be far too slow.

Instead, we bypass React entirely and set the `display` property directly on the DOM:

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

`useQuickReactor` runs immediately when its reactive dependencies change—no throttling or animation frame delays. The memoized ref prevents redundant DOM writes: if the shape is already culled and should stay culled, we skip the `setStyleProperty` call entirely.

The React component stays mounted throughout, preserving all its state. It just never re-renders for visibility changes.

## Filtering for selection and editing

Not every offscreen shape should actually be hidden. If you select a shape and then pan away from it, the selection handles still need to work—keyboard shortcuts, deletion, copy-paste all operate on the selection regardless of where the viewport is. And if you're editing a text shape, hiding it would destroy the input focus, IME state, and cursor position that we chose `display: none` specifically to preserve.

So the final culled set excludes those shapes:

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

## Source files

- `packages/editor/src/lib/editor/derivations/notVisibleShapes.ts` - Core culling algorithm and incremental computation
- `packages/editor/src/lib/editor/Editor.ts` (lines 5138-5152) - `getCulledShapes()` filtering logic
- `packages/editor/src/lib/components/Shape.tsx` (lines 121-136) - Display property toggling in shape components
- `packages/state-react/src/lib/useQuickReactor.ts` - Immediate reactive effects without throttling
