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

When you have thousands of shapes on a canvas, rendering all of them tanks performance. The obvious optimization is to skip rendering shapes that are outside the viewport. The interesting part is how you skip them.

We had two options: unmount offscreen shapes entirely, or hide them with `display: none`. Unmounting sounds cleaner—why keep invisible DOM nodes around? But it destroys React component state. Shapes with text editors lose cursor position, selection state, undo stacks. Input method editor state (crucial for CJK languages) vanishes. When you pan back to that shape, it's amnesia.

The trick is `display: none`. The element stays in the DOM, so React's fiber tree stays mounted. All component state survives—`useState`, `useRef`, instance variables, everything. The browser removes the element from layout entirely. No size calculations, no painting, no hit testing. It's invisible and zero-cost from a rendering perspective, but the React state machine is intact.

## Why unmounting destroys state

React component state lives in the fiber tree, which maps to mounted DOM nodes. When you unmount a component, React tears down the fiber. Cleanup functions run, hooks get destroyed, instance variables disappear. If a text shape is being edited, that means:

- Cursor position lost
- Text selection lost
- Any local undo/redo stack in the editor component lost
- IME composition state lost (this breaks CJK input mid-word)

When you pan back to that shape, React mounts a fresh component with fresh state. There's no cursor, no selection. The text is there (it lives in the store), but the editing session is gone.

## How display:none preserves state

With `display: none`, the DOM node stays in the tree. React's fiber stays mounted. The component's hook state persists across visibility changes. From React's perspective, nothing changed—the component never unmounted.

From the browser's perspective, `display: none` removes the element from the layout tree entirely:

- No bounding box calculations
- No paint operations
- No compositing layers
- Element not hit-testable
- Doesn't participate in flex/grid layout
- Doesn't affect parent dimensions

It's effectively gone for layout and rendering purposes, but the DOM node still exists. That's enough for React to keep the fiber alive and the state intact.

## The alternative: visibility:hidden

`visibility: hidden` also keeps the element in the DOM, so it also preserves React state. But it doesn't remove the element from layout. The browser still calculates size, position, and bounding boxes. The element reserves space and participates in layout even though it's invisible.

For thousands of offscreen shapes, those layout calculations add up. `display: none` skips all of it.

## The culling algorithm

The implementation has two stages. First, we determine which shapes are outside the viewport:

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

The `includes` check returns true if the viewport and shape bounds overlap at all, even partially. If a shape is even slightly visible, we render it. No margin, no pre-rendering shapes just outside the viewport.

Second, we filter out shapes that must stay visible regardless of position:

```typescript
getCulledShapes() {
	const notVisibleShapes = this.getNotVisibleShapes()
	const selectedShapeIds = this.getSelectedShapeIds()
	const editingId = this.getEditingShapeId()
	const culledShapes = new Set<TLShapeId>(notVisibleShapes)

	// Never cull the shape being edited
	if (editingId) {
		culledShapes.delete(editingId)
	}

	// Never cull selected shapes
	selectedShapeIds.forEach((id) => {
		culledShapes.delete(id)
	})

	return culledShapes
}
```

Shapes being edited can't be culled because the text input needs to stay mounted. Selected shapes can't be culled because their selection handles need to be interactive.

## Applying the display property

In the Shape component, we use `useQuickReactor` to toggle `display` whenever the culling state changes:

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

`useQuickReactor` runs immediately when reactive dependencies change—no throttling, no animation frame batching. The component itself doesn't rerender. We just set the `display` CSS property directly on the container elements. The memoized ref prevents redundant DOM writes when the culled state hasn't changed.

## The memory tradeoff

Keeping thousands of DOM nodes around with `display: none` uses more memory than unmounting them. All the React fibers stay in memory, all component instances stay allocated, the DOM tree stays large.

The alternative is to externalize all editing state—manage it outside React component state, serialize and restore it on mount/unmount. That's a lot of complexity. For typical use cases, the memory cost is worth avoiding that complexity. If you hit memory limits with tens of thousands of shapes, you need a different architecture entirely.

## Source files

- `packages/editor/src/lib/editor/derivations/notVisibleShapes.ts` - Core culling algorithm and incremental computation
- `packages/editor/src/lib/editor/Editor.ts` (lines 5138-5152) - `getCulledShapes()` method filtering for selection/editing state
- `packages/editor/src/lib/components/Shape.tsx` (lines 121-136) - Display property toggling based on culling state
- `packages/editor/src/lib/editor/shapes/ShapeUtil.ts` (lines 299-301) - `canCull()` override point
- `packages/tldraw/src/test/getCulledShapes.test.tsx` - Comprehensive tests
