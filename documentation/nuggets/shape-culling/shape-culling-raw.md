---
title: Shape culling - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - shape
  - culling
  - shapes
status: published
date: 12/21/2025
order: 3
---

# Shape culling: raw notes

Internal research notes for the shape-culling.md article.

## Core problem

Optimizing rendering performance for canvases with thousands of shapes. Two approaches:

1. **Unmounting offscreen shapes** - Removes from DOM entirely, destroys React component state
2. **Hiding offscreen shapes with display:none** - Keeps in DOM but invisible, preserves React state

## Why display:none preserves state

React component state lives in React's fiber tree, which maps to mounted DOM nodes. When you unmount a component:

- React calls cleanup functions and destroys the fiber
- `useState`, `useRef`, instance variables all lost
- Undo stacks, cursor positions, selections vanish

With `display: none`:

- Element stays in DOM tree
- React fiber remains mounted
- All component state preserved
- Browser skips layout, paint, and hit testing

From browser perspective, `display: none`:

- Removes element from layout tree entirely
- No size/position/bounding box calculations
- No painting, no layers, no compositing
- Element not hit-testable
- But DOM node still exists

## Algorithm: two-stage culling

### Stage 1: Determine not visible shapes

Located in `packages/editor/src/lib/editor/derivations/notVisibleShapes.ts:5-24`

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

		// If the shape is fully outside of the viewport page bounds, add it to the set.
		// We'll ignore masks here, since they're more expensive to compute and the overhead is not worth it.
		const pageBounds = editor.getShapePageBounds(id)
		if (pageBounds === undefined || !viewportPageBounds.includes(pageBounds)) {
			notVisibleShapes.add(id)
		}
	})
	return notVisibleShapes
}
```

**Key checks:**

1. Get all shape IDs on current page
2. Get viewport bounds in page coordinates
3. For each shape:
   - Check if shape util allows culling via `canCull()`
   - Get shape's bounds in page coordinates
   - Check if viewport includes shape bounds
   - If not included or bounds undefined, mark as not visible

**Bounds inclusion logic:**
From `packages/editor/src/lib/primitives/Box.ts:429-431`:

```typescript
static Includes(A: Box, B: Box) {
    return Box.Collides(A, B) || Box.Contains(A, B)
}
```

Where:

- `Collides`: boxes overlap at all
- `Contains`: A fully contains B

From `packages/editor/src/lib/primitives/Box.ts:412-414`:

```typescript
static Collides(A: Box, B: Box) {
    return !(A.maxX < B.minX || A.minX > B.maxX || A.maxY < B.minY || A.minY > B.maxY)
}
```

From `packages/editor/src/lib/primitives/Box.ts:416-418`:

```typescript
static Contains(A: Box, B: Box) {
    return A.minX < B.minX && A.minY < B.minY && A.maxY > B.maxY && A.maxX > B.maxX
}
```

So `includes` means: viewport either overlaps with shape OR fully contains it.
If shape is even partially in viewport, it's considered visible.

### Stage 2: Filter for editing and selection

Located in `packages/editor/src/lib/editor/Editor.ts:5138-5152`

```typescript
@computed
getCulledShapes() {
	const notVisibleShapes = this.getNotVisibleShapes()
	const selectedShapeIds = this.getSelectedShapeIds()
	const editingId = this.getEditingShapeId()
	const culledShapes = new Set<TLShapeId>(notVisibleShapes)
	// we don't cull the shape we are editing
	if (editingId) {
		culledShapes.delete(editingId)
	}
	// we also don't cull selected shapes
	selectedShapeIds.forEach((id) => {
		culledShapes.delete(id)
	})
	return culledShapes
}
```

**Never cull:**

- Shapes being edited (to preserve focus, cursor position, IME state)
- Selected shapes (to keep handles visible and interactive)

## Incremental computation with reactive signals

From `packages/editor/src/lib/editor/derivations/notVisibleShapes.ts:33-54`:

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

Uses `@tldraw/state` reactive computed values:

- Automatically tracks dependencies (viewport bounds, shape positions, etc.)
- Recomputes only when tracked values change
- Optimization: if set contents haven't changed, returns previous reference (prevents unnecessary re-renders downstream)

Created in Editor constructor:
`packages/editor/src/lib/editor/Editor.ts:5130`:

```typescript
private _notVisibleShapes = notVisibleShapes(this)
```

Accessed via computed getter:
`packages/editor/src/lib/editor/Editor.ts:5125-5128`:

```typescript
@computed
getNotVisibleShapes() {
	return this._notVisibleShapes.get()
}
```

## Applying culling state in Shape component

Located in `packages/editor/src/lib/components/Shape.tsx:121-136`

```typescript
useQuickReactor(
	'set display',
	() => {
		const shape = editor.getShape(id)
		if (!shape) return // probably the shape was just deleted

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

**Key mechanics:**

- `useQuickReactor`: Runs immediately when reactive dependencies change (no throttling/batching)
- Sets `display` CSS property directly on container elements
- Memoizes current culled state to avoid redundant DOM writes
- Updates both main container and background container
- Component itself doesn't rerender - only display property changes

From `packages/state-react/src/lib/useQuickReactor.ts:44-54`:

```typescript
export function useQuickReactor(name: string, reactFn: () => void, deps: any[] = EMPTY_ARRAY) {
	useEffect(() => {
		const scheduler = new EffectScheduler(name, reactFn)
		scheduler.attach()
		scheduler.execute()
		return () => {
			scheduler.detach()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps)
}
```

Creates an EffectScheduler that:

- Tracks reactive signal access during execution
- Re-executes immediately when any tracked signal changes
- No animation frame throttling (unlike `useReactor`)

**DOM manipulation helper:**
From `packages/editor/src/lib/utils/dom.ts:92-99`:

```typescript
export const setStyleProperty = (
	elm: HTMLElement | null,
	property: string,
	value: string | number
) => {
	if (!elm) return
	elm.style.setProperty(property, value as string)
}
```

## ShapeUtil.canCull override

From `packages/editor/src/lib/editor/shapes/ShapeUtil.ts:299-301`:

```typescript
canCull(shape: Shape): boolean {
	return true
}
```

Default implementation returns `true`. Shapes can opt out by overriding:

Example from test suite (`packages/tldraw/src/test/getCulledShapes.test.tsx:25-34`):

```typescript
class UncullableShapeUtil extends BaseBoxShapeUtil<UncullableShape> {
	static override type = UNCULLABLE_TYPE
	static override props: RecordProps<UncullableShape> = {
		w: T.number,
		h: T.number,
	}

	override canCull() {
		return false
	}
	// ... rest of implementation
}
```

**Use cases for canCull = false:**

- Shapes with effects extending beyond bounds (large drop shadows, glows)
- Background shapes or watermarks that should always render
- Shapes with special rendering requirements

## display:none vs visibility:hidden

Both preserve React state, but differ in layout participation:

**`visibility: hidden`:**

- Element invisible but still in layout tree
- Browser calculates size, position, bounding boxes
- Reserves space in layout
- Still participates in flex/grid layout
- Still affects parent dimensions

**`display: none`:**

- Element removed from layout tree entirely
- No size/position calculations
- No space reserved
- Doesn't participate in layout
- Doesn't affect parent dimensions

For thousands of offscreen shapes, skipping layout calculations matters significantly.

## Why not use a culling margin?

**Considered approach:**
Pre-render shapes slightly outside viewport (e.g., viewport + 200px margin) to prevent pop-in during fast panning.

**Rejected because:**

1. Increases number of shapes rendered unnecessarily
2. Margin size needs tuning for different screen sizes and zoom levels
3. Adds complexity to bounds checking
4. Rendering is fast enough that pop-in during panning isn't jarring
5. Simple exact viewport intersection is performant and easy to reason about

Code from article uses exact bounds check:

```typescript
if (pageBounds === undefined || !viewportPageBounds.includes(pageBounds)) {
	notVisibleShapes.add(id)
}
```

No margin added to `viewportPageBounds`.

## Why not check masks/clipping?

From comment in `notVisibleShapes.ts:17-18`:

```typescript
// If the shape is fully outside of the viewport page bounds, add it to the set.
// We'll ignore masks here, since they're more expensive to compute and the overhead is not worth it.
```

**Scenario:**
A shape inside a frame might be clipped by the frame's bounds, making it invisible even though the shape itself is within viewport.

**Why not implemented:**

1. Expensive: requires checking every shape against every potential mask container
2. Cost of checking > cost of rendering a few technically-invisible shapes
3. Simple viewport intersection is sufficient for performance goals

Test demonstrates this (`packages/tldraw/src/test/getCulledShapes.test.tsx:62-68`):

```typescript
<TL.frame ref="B" x={200} y={200} w={300} h={300}>
	<TL.geo ref="C" x={200} y={200} w={50} h={50} />
	{/* this is outside of the frames clipping bounds, so it should never be rendered */}
	<TL.geo ref="D" x={1000} y={1000} w={50} h={50} />
</TL.frame>
```

Shape D is outside frame's clipping bounds but only culled when viewport doesn't include its bounds - not due to mask checking.

## Arrow binding edge case

Test case from `packages/tldraw/src/test/getCulledShapes.test.tsx:187-251`:

```typescript
const box1Id = createShapeId()
const box2Id = createShapeId()
const arrowId = createShapeId()

editor
	.createShapes([
		{ id: box1Id, type: 'geo', x: -500, y: 0, props: { w: 100, h: 100 } },
		{ id: box2Id, type: 'geo', x: -1000, y: 200, props: { w: 100, h: 100 } },
		{ id: arrowId, type: 'arrow', props: { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } } },
	])
	.createBindings([
		{ type: 'arrow', fromId: arrowId, toId: box1Id, props: { terminal: 'start', ... } },
		{ type: 'arrow', fromId: arrowId, toId: box2Id, props: { terminal: 'end', ... } },
	])

expect(editor.getCulledShapes()).toEqual(new Set([box1Id, box2Id, arrowId]))

// Move box1 and box2 inside the viewport
editor.updateShapes([
	{ id: box1Id, type: 'geo', x: 100 },
	{ id: box2Id, type: 'geo', x: 200 },
])
// Arrow should also not be culled
expect(editor.getCulledShapes()).toEqual(new Set())
```

**How it works:**
Arrow bounds are computed from connected shape positions. When both boxes are offscreen, arrow bounds are offscreen. When boxes move into viewport, arrow bounds update to reflect new positions, so viewport intersection check automatically handles it.

No special-case code needed - geometry system handles this naturally.

## Memory vs DOM size tradeoff

**Keeping shapes in DOM with display:none:**

- DOM tree stays large even when most shapes invisible
- For documents with tens of thousands of shapes, uses more memory than unmounting
- All React fibers remain in memory
- All component instances remain allocated

**Alternative (not used):**

- Unmount offscreen shapes to reduce memory
- Requires external state management (outside React component state)
- Serializing/deserializing editing state on mount/unmount
- Much more complexity

**Chosen tradeoff:**
State preservation and simplicity worth the memory cost for typical use cases. If hitting memory limits, need different architecture entirely.

## Test patterns

From `packages/tldraw/src/test/getCulledShapes.test.tsx`:

**Basic culling test (lines 70-96):**

- Create shapes at various positions
- Pan camera to move shapes in/out of viewport
- Verify culled set matches expectations
- Verify selected shapes never culled
- Verify editing shapes never culled

**Fuzz test (lines 154-185):**

- Create 100 random shapes inside/outside viewport
- Track which should be culled based on position
- Verify incremental computation matches
- Delete random shapes
- Force full recompute by panning
- Verify incremental and full recompute produce same result

**Uncullable shape test (lines 253-282):**

- Create custom shape util with `canCull() { return false }`
- Create both regular and uncullable shapes outside viewport
- Verify regular shape culled, uncullable shape not culled

## Shape component memoization

From `packages/editor/src/lib/components/Shape.tsx:53-61`:

```typescript
const memoizedStuffRef = useRef({
	transform: '',
	clipPath: 'none',
	width: 0,
	height: 0,
	x: 0,
	y: 0,
	isCulled: false,
})
```

Tracks previous values to avoid redundant DOM writes. Only calls `setStyleProperty` when value actually changes.

**Inner component memoization:**
From `packages/editor/src/lib/components/Shape.tsx:162-174`:

```typescript
export const InnerShape = memo(
	function InnerShape<T extends TLShape>({ shape, util }: { shape: T; util: ShapeUtil<T> }) {
		return useStateTracking(
			'InnerShape:' + shape.type,
			() =>
				// always fetch the latest shape from the store even if the props/meta have not changed, to avoid
				// calling the render method with stale data.
				util.component(util.editor.store.unsafeGetWithoutCapture(shape.id) as T),
			[util, shape.id]
		)
	},
	(prev, next) => areShapesContentEqual(prev.shape, next.shape) && prev.util === next.util
)
```

Shape content only rerenders when props/meta change. Display property changes don't trigger rerender of inner component.

## Performance characteristics

**Cheap operations (display:none):**

- Setting CSS display property
- React fiber remains mounted (no reconciliation)
- Component state stays in memory
- Event listeners remain attached

**Expensive operations avoided:**

- Layout calculations
- Paint operations
- Compositing layers
- Hit testing
- Pointer event processing

**Rendering shapes back:**
From `packages/editor/src/lib/editor/Editor.ts:5526-5531`:

```typescript
@computed getCurrentPageRenderingShapesSorted(): TLShape[] {
	const culledShapes = this.getCulledShapes()
	return this.getCurrentPageShapesSorted().filter(
		({ id }) => !culledShapes.has(id) && !this.isShapeHidden(id)
	)
}
```

Shapes filter uses computed culled set. When shape moves back into viewport:

1. Reactive computation detects bounds change
2. `notVisibleShapes` updates
3. `getCulledShapes` updates
4. Shape component's `useQuickReactor` executes
5. Sets `display: block`
6. Browser includes element in layout again

All automatic via reactive signals.

## Constants

No specific culling-related constants. Culling is purely geometric based on viewport bounds.

Relevant viewport methods:

- `editor.getViewportPageBounds()` - Returns viewport bounds in page coordinates
- `editor.getShapePageBounds(id)` - Returns shape bounds in page coordinates

## Key source files

- `packages/editor/src/lib/editor/derivations/notVisibleShapes.ts` - Core culling algorithm and incremental computation
- `packages/editor/src/lib/editor/Editor.ts:5138-5152` - `getCulledShapes()` method filtering for selection/editing state
- `packages/editor/src/lib/editor/Editor.ts:5125-5128` - `getNotVisibleShapes()` computed getter
- `packages/editor/src/lib/components/Shape.tsx:121-136` - Display property toggling based on culling state
- `packages/editor/src/lib/editor/shapes/ShapeUtil.ts:299-301` - `canCull()` override point
- `packages/tldraw/src/test/getCulledShapes.test.tsx` - Comprehensive tests including arrows, selection, editing
- `packages/editor/src/lib/primitives/Box.ts:429-431` - Bounds inclusion logic
- `packages/editor/src/lib/utils/dom.ts:92-99` - `setStyleProperty` helper
- `packages/state-react/src/lib/useQuickReactor.ts` - Immediate reactive effects
