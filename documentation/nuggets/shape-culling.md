# Shape culling

You're building a virtual canvas with thousands of elements. Performance is suffering, so you reach for the obvious optimization: remove offscreen elements from the DOM. Pan down, unmount what's above. Pan up, remount it. The framerate improves immediately.

Then a user reports a bug: they're editing text in a shape, pan it halfway offscreen, and their cursor position resets. They lose their selection. The undo stack vanishes. Your optimization just destroyed all the local state in that React component.

This is the hidden cost of DOM removal. And it's why, counterintuitively, keeping invisible elements in the DOM—just hiding them—is often the better choice.

## The state preservation problem

The issue is fundamental to how React works. Component state—`useState`, `useRef`, instance variables—lives in React's internal fiber tree, which maps to mounted DOM nodes. When you unmount a component, React tears down its fiber, and that state is gone forever.

For a text editing component, that state includes:

- Cursor position and selection range
- Focus state
- Input composition state (for IME/autocomplete)
- Undo/redo stacks
- Scroll position within the text

Remove the text input from the DOM while someone's editing it, and all of this vanishes. Remount it when they pan back, and React creates a fresh component with no memory of what came before. The cursor resets to the start. The selection is lost. The user's editing context evaporates.

This isn't hypothetical. Early versions of tldraw did exactly this—unmounted offscreen shapes to reduce DOM size—and users would lose their place constantly while editing near viewport edges.

## Why display:none works

Instead of removing shapes from the DOM, tldraw sets `display: none` on their containers. The shape stays in the DOM tree—it just becomes invisible to layout and rendering.

What `display: none` actually does:

- Removes the element from the layout tree entirely. The browser doesn't calculate size, position, or bounding boxes for it.
- Prevents painting. The element generates no pixels, no layers, no compositing.
- Blocks pointer events. The element is not hit-testable.
- Preserves the React fiber. The component remains mounted, so `useState`, `useRef`, and all local state persist.

This means culling is nearly free. The browser skips the expensive parts (layout, paint, hit testing) while React keeps the cheap part (the mounted fiber with its state).

Pan a text shape offscreen, and `display: none` hides it. Pan back, and `display: block` reveals it—with cursor position, focus, and all state exactly as you left it. No unmount/remount cycle. No state reconstruction. The component was there the whole time, just invisible.

## When this pattern matters

This applies to any large-scale UI where you're toggling visibility of stateful components:

**Virtual scrolling with stateful items.** A table with thousands of rows where each row contains form inputs, interactive widgets, or editing state. Removing rows from the DOM loses that state; hiding them with `display: none` preserves it.

**Map markers at different zoom levels.** Thousands of markers, each potentially containing popups, selected state, or animation timers. Culling by removing markers destroys their state; culling with `display: none` keeps it.

**Canvas-based editors and games.** Any system rendering thousands of entities as React components. Graphics applications, diagram editors, game UIs. If those entities have local state—selection, editing mode, animation state—`display: none` preserves it across viewport changes.

**Large forms with conditional sections.** Showing/hiding form sections based on user input. If you unmount hidden sections, input values and validation state vanish. `display: none` keeps them in memory for when the section reappears.

The key requirement is that your components have meaningful local state and you're toggling visibility frequently. If you're hiding something once and never showing it again, unmounting is fine. But for viewport-based culling where things constantly move in and out of view, `display: none` is the better choice.

## Implementation details

The culling logic has two stages. First, determine which shapes are outside the viewport:

```typescript
function fromScratch(editor: Editor): Set<TLShapeId> {
	const viewportPageBounds = editor.getViewportPageBounds()
	const notVisibleShapes = new Set<TLShapeId>()

	shapesIds.forEach((id) => {
		const shape = editor.getShape(id)
		if (!shape) return

		const canCull = editor.getShapeUtil(shape.type).canCull(shape)
		if (!canCull) return

		const pageBounds = editor.getShapePageBounds(id)
		if (!viewportPageBounds.includes(pageBounds)) {
			notVisibleShapes.add(id)
		}
	})

	return notVisibleShapes
}
```

This is pure geometry—if the shape's bounds don't intersect the viewport, it's not visible.

Then filter out shapes that shouldn't be culled despite being offscreen:

```typescript
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

Selected shapes stay visible so their handles remain interactive. Editing shapes stay visible to preserve focus and cursor state. The rest get `display: none`.

Individual shape components react to culling state and toggle their display property:

```typescript
useQuickReactor(
	'set display',
	() => {
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

This runs reactively when the culled set changes. The shape checks if it's included, updates its display property if needed, and memoizes the result to avoid redundant DOM writes.

Critically, React doesn't rerender the shape's component tree. Only the display property changes on the outer container. The component inside stays mounted and doesn't rerun its render function. This is why the performance is good—toggling display is cheap; rerendering thousands of shapes is not.

## Special cases

Some shapes need to stay visible even when geometrically offscreen:

**Arrows connecting shapes.** An arrow binding two boxes derives its bounds from those boxes. When both boxes are offscreen, the arrow's bounds are offscreen. But move one box into view, and the arrow extends into the viewport—it needs to render. This works automatically because arrow bounds are computed from connected shape positions, so the viewport intersection check reflects the current binding state.

**Shapes with effects extending beyond bounds.** A shape with a large drop shadow or glow might be visible even when its bounding box is outside the viewport. These can opt out of culling by returning `false` from `canCull`:

```typescript
class EffectShapeUtil extends BaseBoxShapeUtil<EffectShape> {
	override canCull() {
		return false
	}
}
```

**Background shapes or watermarks.** Shapes that should always be visible regardless of viewport position can also use `canCull` to opt out entirely.

## Why not visibility:hidden?

`visibility: hidden` is another CSS property that hides elements while keeping them in the DOM. Why not use that?

The difference is layout participation. Elements with `visibility: hidden` still participate in layout—the browser calculates their size, position, bounding boxes, and reserves space for them. They're just invisible.

With `display: none`, elements are removed from layout entirely. The browser skips layout calculations, doesn't reserve space, and treats them as if they don't exist for layout purposes.

For thousands of offscreen shapes, this matters. Layout is expensive—computing positions, sizes, and bounding boxes for elements you won't render is wasted work. `display: none` eliminates that cost; `visibility: hidden` doesn't.

Both preserve React state, so `display: none` gives you the same state preservation with better performance.

## Tradeoffs

**No culling margin.** Shapes are culled based on exact viewport bounds—one pixel outside and they're culled; one pixel in and they render. A margin would reduce pop-in during fast panning by pre-rendering shapes about to enter view. But it would also render more shapes than necessary, and tuning the margin for different screen sizes and zoom levels adds complexity. The rendering is fast enough that shapes appearing during pans isn't jarring, so we keep it simple.

**No mask checking.** A shape inside a frame might be clipped by the frame's bounds, making it invisible even though the shape itself is within the viewport. Calculating mask intersection is expensive—checking every shape against every potential mask container—and the cost of rendering a few technically-invisible shapes is less than the cost of that checking. Simple viewport intersection is good enough.

**Memory vs. DOM size tradeoff.** Keeping all shapes in the DOM means the DOM tree stays large even when most shapes are invisible. For documents with tens of thousands of shapes, this uses more memory than unmounting offscreen shapes would. But the state preservation and simplicity are worth it for our use case. If you're hitting memory limits, you'll need a different approach—maybe full unmounting with explicit state management external to React components.

## Conclusion

The insight here isn't complex: `display: none` preserves React component state while avoiding layout and paint costs. But it's counterintuitive. The obvious optimization for viewport culling is to remove offscreen elements from the DOM entirely. That works fine for stateless components—images, icons, read-only text. But for stateful components—text inputs, form fields, interactive widgets—it destroys the very state users are creating.

This matters beyond tldraw. Virtual scrollers, infinite lists, map viewers, any large-scale React UI that toggles visibility of stateful components faces the same tradeoff. If you're culling based on viewport and your components have meaningful local state, `display: none` is the better primitive. It's simple, preserves state, and avoids the expensive parts of rendering. The memory cost of keeping components mounted is usually negligible compared to the UX cost of losing user state.

## Key files

- `packages/editor/src/lib/editor/derivations/notVisibleShapes.ts` — Core culling logic and incremental computation
- `packages/editor/src/lib/editor/Editor.ts` — `getCulledShapes` method filtering for selection and editing state
- `packages/editor/src/lib/components/Shape.tsx` — Display property toggling based on culling state
- `packages/editor/src/lib/editor/shapes/ShapeUtil.ts` — `canCull` override point for custom shapes
- `packages/tldraw/src/test/getCulledShapes.test.tsx` — Comprehensive culling tests including arrow bindings
