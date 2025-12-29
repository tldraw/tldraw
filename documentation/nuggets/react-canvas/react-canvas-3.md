---
title: React as a canvas renderer
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - react
  - DOM
  - canvas
status: published
date: 12/21/2025
order: 2
---

# React as a canvas renderer

When we built tldraw, we chose React and the DOM to render shapes instead of drawing to an HTML canvas. This is an unusual choice for a canvas application—most use WebGL or Canvas2D with custom renderers. But React gives us something valuable: third-party developers can create custom shapes using the full React ecosystem, including iframes, videos, and interactive components.

The tradeoff is performance. React's reconciliation isn't designed for large documents where shapes are constantly moving, resizing, and changing z-order. Two optimizations make this viable: viewport culling (hiding shapes outside the viewport) and stable DOM order (preventing iframe re-mounts when z-order changes).

Here's how both work.

## Viewport culling: hiding what you can't see

The simplest optimization for large documents is to not render shapes outside the viewport. We compute a set of culled shapes every time the viewport moves, then hide them with `display: none` instead of removing them from the DOM.

The computation starts with a bounding box check. For each shape on the page, we get its page bounds and check whether they overlap the viewport bounds:

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

Some shapes can't be culled. Frames, for example, need to stay mounted even when off-screen because their children might be visible. The `canCull` check lets each shape type opt out.

This computation is wrapped in a reactive signal so it only recalculates when dependencies change—viewport bounds or the set of shapes on the page. The signal also returns the previous Set object if the contents haven't changed, avoiding unnecessary re-renders downstream:

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

The actual culling logic excludes selected and editing shapes so they stay visible even when their bounds are off-screen:

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

Each shape component subscribes to this set and toggles `display: none` when its ID appears:

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

Culled shapes stay in the DOM because removing them would break React's reconciliation assumptions. Adding and removing shapes triggers full re-renders; toggling `display: none` doesn't.

## Stable DOM order: preventing iframe re-mounts

Viewport culling helps with large documents, but there's a more subtle problem: z-order changes. When you bring a shape to the front, its z-index increases. If the DOM order matches z-order, React needs to move that shape's DOM node to the end of the list. Moving a DOM node causes React to unmount and re-mount it. For most shapes this is fine, but for iframes it's a disaster—the iframe reloads, losing all state.

The solution is to sort shapes by ID, not z-order. The DOM order never changes. We use CSS `z-index` to control visual stacking.

Here's the comment in `getRenderingShapes`:

```typescript
@computed getRenderingShapes() {
  const renderingShapes = this.getUnorderedRenderingShapes(true)

  // Its IMPORTANT that the result be sorted by id AND include the index
  // that the shape should be displayed at. Steve, this is the past you
  // telling the present you not to change this.

  // We want to sort by id because moving elements about in the DOM will
  // cause the element to get removed by react as it moves the DOM node. This
  // causes <iframes/> to re-render which is hella annoying and a perf
  // drain. By always sorting by 'id' we keep the shapes always in the
  // same order; but we later use index to set the element's 'z-index'
  // to change the "rendered" position in z-space.
  return renderingShapes.sort(sortById)
}
```

Past Steve is emphatic here because this is the kind of optimization that looks unnecessary. You see shapes sorted by ID and think "this should be z-order" and "fix" it. Then iframes start re-mounting on every z-order change and you spend an afternoon debugging before realizing what happened. The comment is insurance against that.

Each shape gets an `index` property that represents its visual z-order. This gets applied as a CSS `z-index`:

```typescript
useLayoutEffect(() => {
	const container = containerRef.current
	const bgContainer = bgContainerRef.current

	setStyleProperty(container, 'opacity', opacity)
	setStyleProperty(bgContainer, 'opacity', opacity)

	setStyleProperty(container, 'z-index', index)
	setStyleProperty(bgContainer, 'z-index', backgroundIndex)
}, [opacity, index, backgroundIndex])
```

The indices are calculated in `getUnorderedRenderingShapes`. The algorithm walks the shape tree in z-order, assigning increasing indices. Shapes that provide backgrounds for their children (like frames) create index "layers" to ensure proper stacking:

```typescript
let nextIndex = this.options.maxShapesPerPage * 2 // 8000
let nextBackgroundIndex = this.options.maxShapesPerPage // 4000

if (util.providesBackgroundForChildren(shape)) {
	backgroundIndexToRestore = nextBackgroundIndex
	nextBackgroundIndex = nextIndex
	nextIndex += this.options.maxShapesPerPage // Add 4000 for nested layer
}
```

This creates space for 4000 shapes per nesting level. It's a generous limit chosen to avoid conflicts without worrying about performance—z-index can go much higher, and CSS handles large values fine.

The result is that shapes are always rendered in the same DOM order (sorted by ID), but displayed in z-order (controlled by CSS z-index). React never needs to move DOM nodes when z-order changes. Iframes stay mounted.

## The memory tradeoff

Keeping culled shapes in the DOM with `display: none` instead of unmounting them uses more memory. For most documents this doesn't matter—hundreds or thousands of hidden DOM nodes are fine. But for documents with tens of thousands of shapes, or shapes with heavy content (videos, large images), this could be a problem.

We chose this tradeoff because unmounting culled shapes makes React's reconciliation much slower. Adding and removing shapes from the React tree is expensive. Toggling `display: none` is essentially free.

If you're building on tldraw and memory becomes an issue with very large documents, you could experiment with removing culled shapes from the DOM entirely. You'd need to handle the reconciliation cost, probably by batching culled shape updates and throttling them to avoid constant mounting/unmounting as the user pans.

For our use cases—whiteboards with hundreds to low thousands of shapes—keeping them mounted is the right choice.

## Key files

- `/packages/editor/src/lib/editor/Editor.ts` — `getRenderingShapes` (lines 4212-4226) with the "past you" comment
- `/packages/editor/src/lib/editor/Editor.ts` — `getCulledShapes` (lines 5137-5151)
- `/packages/editor/src/lib/editor/derivations/notVisibleShapes.ts` — Viewport culling computation
- `/packages/editor/src/lib/components/Shape.tsx` — Display toggle in `useQuickReactor` (lines 121-136)
- `/packages/editor/src/lib/components/Shape.tsx` — Z-index application in `useLayoutEffect` (lines 107-119)
