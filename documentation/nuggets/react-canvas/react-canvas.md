---
title: React as a canvas renderer
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - react
  - canvas
status: published
date: 12/21/2025
order: 4
---

# React as a canvas renderer

We use React and the DOM as our rendering layer in tldraw. This is unusual—canvas applications typically use HTML canvas with a custom renderer, and React is not exactly known for raw performance. But the developer experience around custom and interactive components is too good to pass up. We've done a lot of work to make React fast enough.

## Why not HTML canvas

HTML canvas gives you a 2D drawing context where you issue drawing commands: `moveTo`, `lineTo`, `fillRect`, and so on. It's efficient for scenes with thousands of primitives, but it has a significant limitation: the canvas is just pixels. There's no DOM, no event handling, no text selection, no accessibility tree. Everything interactive—from cursor changes to text input—has to be reimplemented from scratch.

Custom canvas renderers have their own problems. The complexity of building a full rendering pipeline is substantial. Extensibility suffers because third-party developers can't use standard web technologies. Mobile performance is surprisingly difficult to get right. And even after all that optimization work, canvas apps often still struggle with performance in practice.

tldraw shapes can contain rich, interactive content: text editors, embedded iframes, video players. Building all of that on top of canvas would mean rebuilding the browser. Instead, we render shapes as actual DOM elements. This gives us native text editing, CSS styling, event handling, and the entire React component ecosystem.

The tradeoff is performance. DOM manipulation is expensive, and React's diffing algorithm adds overhead. A naive implementation would be unusably slow. The rest of this article covers how we made it work.

## DOM structure

The canvas is organized into layers:

```
<div class="tl-canvas">
  <svg class="tl-svg-context">      <!-- SVG definitions and clip paths -->
  <div class="tl-background">       <!-- Grid, background patterns -->
  <div class="tl-html-layer">       <!-- Shapes layer -->
    <div class="tl-shapes">
      <!-- Each shape: positioned via CSS transform -->
    </div>
  </div>
  <div class="tl-overlays">         <!-- Selection UI, handles, cursors -->
</div>
```

The shapes layer uses CSS transforms to position content. When you pan and zoom, we don't rerender shapes—we transform the entire layer:

```typescript
const transform = `scale(${z}) translate(${x}px, ${y}px)`
setStyleProperty(htmlLayer, 'transform', transform)
```

This means camera movement is essentially free. The browser's compositor handles the transform without touching individual shape elements.

## Shape rendering: two-stage approach

Each shape component has two responsibilities that change at different rates:

1. **Container positioning**: transform, dimensions, clip path, z-index
2. **Content rendering**: the shape's actual visual content

We separate these concerns to avoid expensive re-renders. Container updates happen frequently—every time you drag a shape—but they're cheap DOM mutations. Content updates are less frequent but more expensive, involving React reconciliation.

```typescript
// Container updates: direct DOM manipulation via useQuickReactor
useQuickReactor('set shape stuff', () => {
	const pageTransform = editor.getShapePageTransform(id)
	const transform = Mat.toCssString(pageTransform)

	if (transform !== prev.transform) {
		setStyleProperty(containerRef.current, 'transform', transform)
		prev.transform = transform
	}
})

// Content updates: memoized React rendering
const InnerShape = memo(
	function InnerShape({ shape, util }) {
		return useStateTracking('InnerShape', () => util.component(shape))
	},
	(prev, next) => areShapesContentEqual(prev.shape, next.shape)
)
```

The `useQuickReactor` hook runs immediately when reactive dependencies change—no batching, no scheduling. It writes directly to the DOM, bypassing React entirely. The `InnerShape` component only re-renders when the shape's actual content changes, not when it moves.

## Reactive signals instead of React state

React's rendering model assumes top-down data flow: when state changes, components re-render from the root. This doesn't work for a canvas with hundreds of shapes. Moving one shape shouldn't trigger a diff of every other shape.

We solve this with `@tldraw/state`, a fine-grained reactivity system similar to Solid.js signals. The editor's state lives in signals, not React state. Components subscribe to exactly the signals they need:

```typescript
function ShapesToDisplay() {
  const renderingShapes = useValue('rendering shapes',
    () => editor.getRenderingShapes(),
    [editor]
  )

  return renderingShapes.map((result) => (
    <Shape key={result.id} {...result} />
  ))
}
```

The `useValue` hook creates a computed signal and subscribes to it using React 18's `useSyncExternalStore`. When the signal changes, only this component re-renders. Other components that don't depend on `getRenderingShapes()` are untouched.

For shape content, we use `useStateTracking` to wrap the render function in a reactive context:

```typescript
return useStateTracking('InnerShape:' + shape.type, () =>
	util.component(store.unsafeGetWithoutCapture(shape.id))
)
```

This automatically tracks which signals the component accesses during rendering. When any of those signals change, only this shape re-renders.

## Culling offscreen shapes

Even with efficient updates, rendering thousands of DOM nodes is slow. We avoid this by culling shapes outside the viewport:

```typescript
function notVisibleShapes(editor: Editor) {
	return computed('notVisibleShapes', (prevValue) => {
		const viewportBounds = editor.getViewportPageBounds()
		const notVisible = new Set<TLShapeId>()

		for (const id of editor.getCurrentPageShapeIds()) {
			const bounds = editor.getShapePageBounds(id)
			if (!viewportBounds.includes(bounds)) {
				notVisible.add(id)
			}
		}

		return notVisible
	})
}
```

Culled shapes get `display: none`. They stay in the DOM to preserve React component state—a text shape being edited keeps its cursor position even when scrolled offscreen—but they don't participate in layout or painting.

The culling computation is incremental. The `computed` function receives the previous value and can return it unchanged if nothing relevant changed. This avoids creating new Set objects on every frame.

## Stable DOM order

Shapes have a z-order that determines which shapes appear on top. The naive approach—rendering shapes in z-order—causes problems when shapes reorder. Moving a shape to the front would unmount and remount its DOM node, losing focus state, selection, and scroll position.

Instead, we render shapes in a stable order (sorted by ID) and use CSS `z-index` for visual stacking:

```typescript
const renderingShapes = this.getUnorderedRenderingShapes()
return renderingShapes.sort(sortById) // Stable DOM order

// In Shape component:
setStyleProperty(container, 'z-index', index)
```

DOM nodes never reorder. Only the z-index changes. This preserves component state and avoids expensive DOM mutations.

## Custom memoization

React's default `memo` comparison checks reference equality of props. This doesn't work when shape objects come from an immutable store—every read creates a new object reference even if the content is identical.

We use custom comparison functions that check content equality:

```typescript
const InnerShape = memo(
	function InnerShape({ shape, util }) {
		return useStateTracking('InnerShape', () => util.component(shape))
	},
	(prev, next) => areShapesContentEqual(prev.shape, next.shape) && prev.util === next.util
)
```

The `areShapesContentEqual` function compares shape props and meta by value, not reference. A shape that hasn't actually changed won't re-render, even if its object identity is different.

## The result

These optimizations compound. A typical interaction—dragging a shape—triggers:

1. Transform update via `useQuickReactor` (direct DOM write)
2. Culling recalculation (incremental, usually returns cached result)
3. No React re-renders unless content actually changed

The DOM structure stays stable. React's reconciler does minimal work. The browser compositor handles visual updates. Performance is good enough that most users never think about it—which is exactly the point.

## Key files

- `packages/editor/src/lib/components/Shape.tsx` — Shape rendering with two-stage updates
- `packages/editor/src/lib/components/default-components/DefaultCanvas.tsx` — Canvas layer structure
- `packages/state-react/src/lib/useStateTracking.ts` — Reactive render tracking
- `packages/state-react/src/lib/useValue.ts` — Signal subscription hook
- `packages/state-react/src/lib/useQuickReactor.ts` — Immediate reactive effects
- `packages/editor/src/lib/editor/derivations/notVisibleShapes.ts` — Viewport culling
