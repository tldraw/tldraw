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
order: 1
---

# React as a canvas renderer

When we built tldraw, we made an unusual choice: we use React and the DOM to render shapes, not HTML canvas. Most infinite canvas applications render with canvas APIs and custom rendering engines. We went the other direction.

The tradeoff seems obvious. Canvas APIs are fast but limited—rendering custom shapes means drawing rectangles and paths. The DOM is flexible but slow—moving things around triggers React reconciliation and browser reflow. We wanted the flexibility of React (so you can build complex interactive shapes) without paying the performance cost every time a shape moves.

Here's how we solved it.

## Two stages: container and content

We split shape rendering into two independent stages. The container handles position, size, and visibility. The content handles everything inside—the actual visual representation.

Stage one uses direct DOM manipulation. When a shape moves, we update its container's CSS transform directly, bypassing React entirely. The browser handles the visual update through its compositor. React never knows the shape moved.

Stage two uses React reconciliation. When a shape's properties change (text content, color, border style), React re-renders the component. But since container updates are separate, moving a shape never triggers this path.

This split means you can drag 50 shapes around the canvas without React ever reconciling. All 50 containers update their transforms directly. The content inside stays untouched.

## Container updates with useQuickReactor

The container positioning logic runs in a `useQuickReactor` hook, which executes immediately when dependencies change—no batching, no scheduling.

```typescript
const memoizedStuffRef = useRef({
	transform: '',
	clipPath: 'none',
	width: 0,
	height: 0,
})

useQuickReactor(
	'set shape stuff',
	() => {
		const shape = editor.getShape(id)
		if (!shape) return

		const prev = memoizedStuffRef.current

		// Transform
		const pageTransform = editor.getShapePageTransform(id)
		const transform = Mat.toCssString(pageTransform)

		if (transform !== prev.transform) {
			setStyleProperty(containerRef.current, 'transform', transform)
			prev.transform = transform
		}

		// Dimensions
		const bounds = editor.getShapeGeometry(shape).bounds
		const width = Math.max(bounds.width, 1)
		const height = Math.max(bounds.height, 1)

		if (width !== prev.width || height !== prev.height) {
			setStyleProperty(containerRef.current, 'width', width + 'px')
			setStyleProperty(containerRef.current, 'height', height + 'px')
			prev.width = width
			prev.height = height
		}

		// Clipping
		const clipPath = editor.getShapeClipPath(id) ?? 'none'
		if (clipPath !== prev.clipPath) {
			setStyleProperty(containerRef.current, 'clip-path', clipPath)
			prev.clipPath = clipPath
		}
	},
	[editor]
)
```

The `setStyleProperty` helper is just `element.style.setProperty(property, value)`. Nothing fancy. We track the previous values in a ref to avoid redundant style updates when nothing changed.

The transform string comes from a 2D matrix converted to CSS format:

```typescript
// Mat.toCssString
static toCssString(m: MatLike) {
  return `matrix(${toDomPrecision(m.a)}, ${toDomPrecision(m.b)}, ${toDomPrecision(
    m.c
  )}, ${toDomPrecision(m.d)}, ${toDomPrecision(m.e)}, ${toDomPrecision(m.f)})`
}
```

The matrix holds scaling, rotation, and translation. Values are rounded to four decimal places (`Math.round(v * 1e4) / 1e4`) to avoid subpixel jitter.

The whole effect runs whenever reactive dependencies change—when the shape moves, rotates, resizes, or gets clipped by a parent frame. The browser compositor handles the visual update. React never reconciles.

## Content updates with React.memo

The content rendering uses a memoized component with a custom equality check:

```typescript
export const InnerShape = memo(
	function InnerShape<T extends TLShape>({ shape, util }: { shape: T; util: ShapeUtil<T> }) {
		return useStateTracking(
			'InnerShape:' + shape.type,
			() => util.component(util.editor.store.unsafeGetWithoutCapture(shape.id) as T),
			[util, shape.id]
		)
	},
	(prev, next) => areShapesContentEqual(prev.shape, next.shape) && prev.util === next.util
)
```

The equality function checks only props and meta:

```typescript
export const areShapesContentEqual = (a: TLShape, b: TLShape) =>
	a.props === b.props && a.meta === b.meta
```

This is reference equality, not deep comparison. Shape props and meta are immutable objects. When you change a shape's text content or color, we create a new props object. Same reference means nothing changed.

Moving a shape changes its position in the page transform calculation, but that doesn't touch props or meta. The memoized component sees identical inputs and skips rendering. The container already updated its transform directly, so the shape moves without React noticing.

When props or meta actually change—you edit text, change a color, toggle bold—the equality check fails and React re-renders the content. The container stays put. Only the inside updates.

## The camera transform

The entire shapes layer is transformed as a unit. Panning and zooming move one parent element:

```typescript
useQuickReactor(
	'position layers',
	function positionLayersWhenCameraMoves() {
		const { x, y, z } = editor.getCamera()

		// Zoom offset ensures pixel alignment
		const offset =
			z >= 1 ? modulate(z, [1, 8], [0.125, 0.5], true) : modulate(z, [0.1, 1], [-2, 0.125], true)

		const transform = `scale(${toDomPrecision(z)}) translate(${toDomPrecision(
			x + offset
		)}px,${toDomPrecision(y + offset)}px)`

		setStyleProperty(rHtmlLayer.current, 'transform', transform)
	},
	[editor, container]
)
```

This makes panning and zooming essentially free. The browser compositor applies the scale and translation to every child element without reflow. Individual shapes don't know the camera moved.

The offset calculation compensates for a 1px HTML container size to ensure pixel-perfect alignment at different zoom levels. The `modulate` function maps the zoom value from one range to another.

## What this buys us

The separation between container and content means:

**Moving shapes is cheap**. Dragging 50 shapes updates 50 CSS transforms. No React reconciliation. No component renders. The compositor handles it.

**Content changes are isolated**. Editing one shape's text only re-renders that shape's content component. The container doesn't update. Other shapes stay untouched.

**Panning and zooming are free**. The camera transform applies to one parent element. The browser compositor does the work.

**Custom shapes get full React**. Shape components can use hooks, context, third-party libraries. You can render complex interactive elements inside shapes without fighting a custom rendering system.

The cost is a slightly more complex rendering path and two DOM elements per shape (one for the container, one for the background in some cases). That's worth it for the flexibility and predictable performance.

## Where to find it

The shape rendering logic lives in `/packages/editor/src/lib/components/Shape.tsx`. The canvas structure and camera positioning are in `/packages/editor/src/lib/components/default-components/DefaultCanvas.tsx`.

The `useQuickReactor` hook is in `/packages/state-react/src/lib/useQuickReactor.ts`. The `areShapesContentEqual` function is in `/packages/editor/src/lib/utils/areShapesContentEqual.ts`.

We also use a stable DOM order sorted by shape ID to prevent React from removing and re-adding iframe elements during reordering (that causes iframes to reload). Shapes are sorted once in `getRenderingShapes`, then z-index handles visual stacking without moving DOM nodes.
