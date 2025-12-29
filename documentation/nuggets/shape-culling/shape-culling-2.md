---
title: Shape culling
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - culling
  - performance
  - viewport
status: published
date: 12/21/2025
order: 1
---

# Shape culling

When we built tldraw, we wanted it to handle documents with thousands of shapes without slowing down. The easiest win is rendering only what's visible—shapes outside the viewport don't need to be drawn. But there's a catch: unmounting shapes destroys their React state. A text shape being edited loses its cursor position. A shape with local animation state resets. We needed a way to hide offscreen shapes without unmounting them.

The solution: `display: none`. It removes shapes from the layout tree entirely—no size calculations, no painting, no hit testing—but the DOM node and React fiber remain mounted. All component state stays intact.

## Two-stage culling

We use a two-stage algorithm. Stage 1 determines which shapes are outside the viewport. Stage 2 filters out shapes that must stay visible even when offscreen.

### Stage 1: Not visible shapes

The first stage checks every shape on the current page against the viewport bounds:

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

The `includes` check uses viewport intersection logic:

```typescript
static Includes(A: Box, B: Box) {
  return Box.Collides(A, B) || Box.Contains(A, B)
}
```

If the viewport either overlaps with a shape or fully contains it, the shape is visible. Otherwise it's marked for culling.

The `canCull()` check gives individual shapes an opt-out. By default it returns `true`, but shapes can override it:

```typescript
class UncullableShapeUtil extends BaseBoxShapeUtil<UncullableShape> {
	override canCull() {
		return false
	}
}
```

This is useful for shapes with effects that extend beyond their bounds—a shape with a large drop shadow might be visible even when its bounds are offscreen.

### Stage 2: Editing and selection

The second stage removes shapes that must stay visible:

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

We never cull shapes being edited—they need to maintain focus, cursor position, and IME state. We also never cull selected shapes, since their handles must remain visible and interactive.

## Applying the cull state

The Shape component watches the culled set and updates the `display` property directly:

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

`useQuickReactor` runs immediately when reactive dependencies change—no throttling or batching. When a shape moves offscreen, the culled set updates, the reactor executes, and the display property changes. The component itself doesn't rerender.

We memoize the current culled state to avoid redundant DOM writes. Setting a style property isn't expensive, but doing it on every frame for hundreds of shapes adds up.

## Why display:none instead of visibility:hidden

Both preserve React state, but they differ in layout participation. `visibility: hidden` keeps the element in the layout tree—the browser still calculates size and position, reserves space, and includes it in flex/grid calculations. For thousands of offscreen shapes, those calculations matter.

`display: none` removes the element from the layout tree entirely. No space reserved, no layout calculations, no painting.

## Reactive computation

The culling algorithm is wrapped in a reactive computed value:

```typescript
export function notVisibleShapes(editor: Editor) {
	return computed<Set<TLShapeId>>('notVisibleShapes', function updateNotVisibleShapes(prevValue) {
		const nextValue = fromScratch(editor)

		if (isUninitialized(prevValue)) {
			return nextValue
		}

		if (prevValue.size !== nextValue.size) return nextValue

		for (const prev of prevValue) {
			if (!nextValue.has(prev)) {
				return nextValue
			}
		}

		return prevValue
	})
}
```

This automatically tracks dependencies—viewport bounds, shape positions, current page—and recomputes only when they change. If the set contents haven't changed, it returns the previous reference to prevent unnecessary re-renders downstream.

## Tradeoffs

Keeping shapes in the DOM with `display: none` means the DOM tree stays large even when most shapes are invisible. For documents with tens of thousands of shapes, this uses more memory than unmounting.

The alternative is to unmount offscreen shapes and serialize their editing state externally—tracking cursor positions, selection ranges, and other local state outside React. We chose the memory cost over that complexity. State preservation and simplicity matter more for typical use cases. If you hit memory limits, you need a different architecture entirely.

We also don't check masks or clipping. A shape inside a frame might be clipped by the frame's bounds, making it invisible even though the shape itself is within the viewport. Checking this would require comparing every shape against every potential mask container. The cost of that check exceeds the cost of rendering a few technically-invisible shapes.

## Source files

- `packages/editor/src/lib/editor/derivations/notVisibleShapes.ts` - Core culling algorithm
- `packages/editor/src/lib/editor/Editor.ts:5138-5152` - getCulledShapes filtering
- `packages/editor/src/lib/components/Shape.tsx:121-136` - Display property toggling
- `packages/editor/src/lib/editor/shapes/ShapeUtil.ts:299-301` - canCull override point
- `packages/tldraw/src/test/getCulledShapes.test.tsx` - Comprehensive tests
