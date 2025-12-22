---
title: React as a canvas renderer - Raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - react
  - canvas
status: published
date: 12/21/2025
order: 3
---

# React as a canvas renderer - Raw notes

## Core concept

tldraw uses React and the DOM as the rendering layer instead of HTML canvas with custom renderers. This is unusual for canvas applications but provides significant developer experience benefits around custom and interactive components.

## DOM structure implementation

### Layer organization

Source: `/packages/editor/src/lib/components/default-components/DefaultCanvas.tsx`

The canvas has a strict layer hierarchy:

```jsx
<div className="tl-canvas">
  <svg className="tl-svg-context">      <!-- SVG definitions and clip paths -->
  <div className="tl-background">       <!-- Grid, background patterns -->
  <div className="tl-html-layer tl-shapes">  <!-- Shapes layer -->
    <div className="tl-shapes">
      <!-- Individual shape containers -->
    </div>
  </div>
  <div className="tl-overlays">         <!-- Selection UI, handles, cursors -->
    <div className="tl-html-layer">
      <!-- Overlay elements -->
    </div>
  </div>
</div>
```

Lines 131-189 in DefaultCanvas.tsx show the complete structure.

### Camera transformation

Source: `/packages/editor/src/lib/components/default-components/DefaultCanvas.tsx` lines 55-94

The entire shapes layer is transformed via CSS, not individual shapes. This makes panning and zooming essentially free:

```typescript
useQuickReactor(
	'position layers',
	function positionLayersWhenCameraMoves() {
		const { x, y, z } = editor.getCamera()

		// Zoom offset calculation - ensures pixel alignment at different zoom levels
		const offset =
			z >= 1 ? modulate(z, [1, 8], [0.125, 0.5], true) : modulate(z, [0.1, 1], [-2, 0.125], true)

		const transform = `scale(${toDomPrecision(z)}) translate(${toDomPrecision(
			x + offset
		)}px,${toDomPrecision(y + offset)}px)`

		setStyleProperty(rHtmlLayer.current, 'transform', transform)
		setStyleProperty(rHtmlLayer2.current, 'transform', transform)
	},
	[editor, container]
)
```

**Key implementation details:**

- `toDomPrecision()`: Rounds to 4 decimal places (`Math.round(v * 1e4) / 1e4`)
  - Source: `/packages/editor/src/lib/primitives/utils.ts` line 351-352
- `modulate()`: Maps value from one range to another with optional clamping
  - Source: `/packages/utils/src/lib/number.ts` lines 98-108
  - Formula: `v0 + ((value - fromLow) / (fromHigh - fromLow)) * (v1 - v0)`
- Offset calculation compensates for the 1px HTML container size to ensure pixel-perfect alignment

### Text shadow LOD optimization

Source: `/packages/editor/src/lib/components/default-components/DefaultCanvas.tsx` lines 61-78

Text shadows are disabled below a certain zoom level to improve performance:

```typescript
if (
	rMemoizedStuff.current.allowTextOutline &&
	z < editor.options.textShadowLod !== rMemoizedStuff.current.lodDisableTextOutline
) {
	const lodDisableTextOutline = z < editor.options.textShadowLod
	container.style.setProperty(
		'--tl-text-outline',
		lodDisableTextOutline ? 'none' : `var(--tl-text-outline-reference)`
	)
	rMemoizedStuff.current.lodDisableTextOutline = lodDisableTextOutline
}
```

- **textShadowLod threshold**: 0.35 (default value)
  - Source: `/packages/editor/src/lib/options.ts` line 144
- Safari always disables text outlines (line 61-64)

## Shape rendering: two-stage approach

Source: `/packages/editor/src/lib/components/Shape.tsx`

### Stage 1: Container positioning (lines 63-105)

Uses `useQuickReactor` for immediate, unbatched DOM updates:

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

useQuickReactor(
	'set shape stuff',
	() => {
		const shape = editor.getShape(id)
		if (!shape) return

		const prev = memoizedStuffRef.current

		// Clip path update
		const clipPath = editor.getShapeClipPath(id) ?? 'none'
		if (clipPath !== prev.clipPath) {
			setStyleProperty(containerRef.current, 'clip-path', clipPath)
			setStyleProperty(bgContainerRef.current, 'clip-path', clipPath)
			prev.clipPath = clipPath
		}

		// Transform update
		const pageTransform = editor.getShapePageTransform(id)
		const transform = Mat.toCssString(pageTransform)
		const bounds = editor.getShapeGeometry(shape).bounds

		if (transform !== prev.transform) {
			setStyleProperty(containerRef.current, 'transform', transform)
			setStyleProperty(bgContainerRef.current, 'transform', transform)
			prev.transform = transform
		}

		// Width/Height update (minimum 1px to ensure rendering)
		const width = Math.max(bounds.width, 1)
		const height = Math.max(bounds.height, 1)

		if (width !== prev.width || height !== prev.height) {
			setStyleProperty(containerRef.current, 'width', width + 'px')
			setStyleProperty(containerRef.current, 'height', height + 'px')
			setStyleProperty(bgContainerRef.current, 'width', width + 'px')
			setStyleProperty(bgContainerRef.current, 'height', height + 'px')
			prev.width = width
			prev.height = height
		}
	},
	[editor]
)
```

**Mat.toCssString implementation:**

Source: `/packages/editor/src/lib/primitives/Mat.ts` lines 269-273

```typescript
static toCssString(m: MatLike) {
  return `matrix(${toDomPrecision(m.a)}, ${toDomPrecision(m.b)}, ${toDomPrecision(
    m.c
  )}, ${toDomPrecision(m.d)}, ${toDomPrecision(m.e)}, ${toDomPrecision(m.f)})`
}
```

Matrix model structure (lines 9-16):

```typescript
interface MatModel {
	a: number // horizontal scaling
	b: number // vertical skewing
	c: number // horizontal skewing
	d: number // vertical scaling
	e: number // horizontal translation
	f: number // vertical translation
}
```

### Stage 2: Content rendering (lines 162-174)

Uses React.memo with custom equality check:

```typescript
export const InnerShape = memo(
	function InnerShape<T extends TLShape>({ shape, util }: { shape: T; util: ShapeUtil<T> }) {
		return useStateTracking(
			'InnerShape:' + shape.type,
			() =>
				// Always fetch latest from store to avoid stale data
				util.component(util.editor.store.unsafeGetWithoutCapture(shape.id) as T),
			[util, shape.id]
		)
	},
	(prev, next) => areShapesContentEqual(prev.shape, next.shape) && prev.util === next.util
)
```

**Custom equality function:**

Source: `/packages/editor/src/lib/utils/areShapesContentEqual.ts`

```typescript
export const areShapesContentEqual = (a: TLShape, b: TLShape) =>
	a.props === b.props && a.meta === b.meta
```

This does reference equality on props and meta (which are immutable), not deep equality.

### Opacity and z-index updates (lines 107-119)

Less frequent updates use `useLayoutEffect`:

```typescript
useLayoutEffect(() => {
	const container = containerRef.current
	const bgContainer = bgContainerRef.current

	// Opacity
	setStyleProperty(container, 'opacity', opacity)
	setStyleProperty(bgContainer, 'opacity', opacity)

	// Z-Index
	setStyleProperty(container, 'z-index', index)
	setStyleProperty(bgContainer, 'z-index', backgroundIndex)
}, [opacity, index, backgroundIndex])
```

### Culling display toggle (lines 121-136)

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

**setStyleProperty helper:**

Source: `/packages/editor/src/lib/utils/dom.ts` lines 92-99

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

## Reactive signals implementation

### @tldraw/state system

Core reactive primitives:

- `Atom`: Writable reactive value
- `Computed`: Derived reactive value
- `EffectScheduler`: Runs side effects when dependencies change

### useValue hook

Source: `/packages/state-react/src/lib/useValue.ts`

Two overloads:

1. Subscribe to existing signal: `useValue(signal)`
2. Create computed signal: `useValue(name, fn, deps)`

Implementation (lines 79-108):

```typescript
export function useValue() {
	const args = arguments
	const deps = args.length === 3 ? args[2] : [args[0]]
	const name = args.length === 3 ? args[0] : `useValue(${args[0].name})`

	const { $val, subscribe, getSnapshot } = useMemo(() => {
		// Create or use existing signal
		const $val =
			args.length === 1 ? (args[0] as Signal<any>) : (computed(name, args[1]) as Signal<any>)

		return {
			$val,
			subscribe: (notify: () => void) => {
				return react(`useValue(${name})`, () => {
					try {
						$val.get()
					} catch {
						// Will be rethrown during render if component doesn't unmount first
					}
					notify()
				})
			},
			getSnapshot: () => $val.lastChangedEpoch,
		}
	}, deps)

	useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
	return $val.__unsafe__getWithoutCapture()
}
```

Uses React 18's `useSyncExternalStore` for subscription management.

### useStateTracking hook

Source: `/packages/state-react/src/lib/useStateTracking.ts` lines 29-85

Wraps render function in reactive tracking context:

```typescript
export function useStateTracking<T>(name: string, render: () => T, deps: unknown[] = []): T {
	const renderRef = React.useRef(render)
	renderRef.current = render

	const [scheduler, subscribe, getSnapshot] = React.useMemo(() => {
		let scheduleUpdate = null as null | (() => void)

		const subscribe = (cb: () => void) => {
			scheduleUpdate = cb
			return () => {
				scheduleUpdate = null
			}
		}

		const scheduler = new EffectScheduler(
			`useStateTracking(${name})`,
			() => renderRef.current?.(),
			{
				scheduleEffect() {
					scheduleUpdate?.()
				},
			}
		)

		const getSnapshot = () => scheduler.scheduleCount

		return [scheduler, subscribe, getSnapshot]
	}, [name, ...deps])

	React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

	React.useEffect(() => {
		scheduler.attach()
		scheduler.maybeScheduleEffect()
		return () => {
			scheduler.detach()
		}
	}, [scheduler])

	return scheduler.execute()
}
```

### useQuickReactor hook

Source: `/packages/state-react/src/lib/useQuickReactor.ts` lines 44-54

Runs effects immediately without throttling:

```typescript
export function useQuickReactor(name: string, reactFn: () => void, deps: any[] = EMPTY_ARRAY) {
	useEffect(() => {
		const scheduler = new EffectScheduler(name, reactFn)
		scheduler.attach()
		scheduler.execute()
		return () => {
			scheduler.detach()
		}
	}, deps)
}
```

No `scheduleEffect` option provided, so effects run synchronously.

### useReactor hook (comparison)

Source: `/packages/state-react/src/lib/useReactor.ts` lines 77-93

Throttles effects to next animation frame:

```typescript
export function useReactor(name: string, reactFn: () => void, deps: undefined | any[] = []) {
	useEffect(() => {
		let cancelFn: () => void | undefined
		const scheduler = new EffectScheduler(name, reactFn, {
			scheduleEffect: (cb) => {
				cancelFn = throttleToNextFrame(cb)
			},
		})
		scheduler.attach()
		scheduler.execute()
		return () => {
			scheduler.detach()
			cancelFn?.()
		}
	}, deps)
}
```

### EffectScheduler implementation

Source: `/packages/state/src/lib/EffectScheduler.ts`

Key properties (lines 42-87):

- `_isActivelyListening`: Whether scheduler is attached
- `lastTraversedEpoch`: Last time dependencies were checked
- `lastReactedEpoch`: Last time effect was executed
- `scheduleCount`: Number of times effect has been scheduled
- `parentSet`, `parentEpochs`, `parents`: Tracked dependencies
- `_scheduleEffect`: Optional custom scheduler function

Method `maybeScheduleEffect()` (lines 90-99):

```typescript
maybeScheduleEffect() {
  // bail out if we have been cancelled by another effect
  if (!this._isActivelyListening) return
  // bail out if no atoms have changed since the last time we ran this effect
  if (this.lastReactedEpoch === getGlobalEpoch()) return

  // bail out if we have parents and they have not changed since last time
  if (this.parents.length && !haveParentsChanged(this)) {
    this.lastReactedEpoch = getGlobalEpoch()
    return
  }
  // ... schedule effect
}
```

## Viewport culling

### notVisibleShapes derivation

Source: `/packages/editor/src/lib/editor/derivations/notVisibleShapes.ts`

Algorithm (lines 5-24):

```typescript
function fromScratch(editor: Editor): Set<TLShapeId> {
	const shapesIds = editor.getCurrentPageShapeIds()
	const viewportPageBounds = editor.getViewportPageBounds()
	const notVisibleShapes = new Set<TLShapeId>()

	shapesIds.forEach((id) => {
		const shape = editor.getShape(id)
		if (!shape) return

		// Check if shape can be culled (some shapes like frames cannot)
		const canCull = editor.getShapeUtil(shape.type).canCull(shape)
		if (!canCull) return

		// If shape is fully outside viewport, add to set
		const pageBounds = editor.getShapePageBounds(id)
		if (pageBounds === undefined || !viewportPageBounds.includes(pageBounds)) {
			notVisibleShapes.add(id)
		}
	})

	return notVisibleShapes
}
```

**Box.Includes implementation:**

Source: `/packages/editor/src/lib/primitives/Box.ts` lines 429-431

```typescript
static Includes(A: Box, B: Box) {
  return Box.Collides(A, B) || Box.Contains(A, B)
}
```

Returns true if boxes collide OR if A contains B entirely.

### Incremental computation

Source: `/packages/editor/src/lib/editor/derivations/notVisibleShapes.ts` lines 33-54

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

Returns the previous Set object if contents haven't changed, avoiding unnecessary re-renders.

### getCulledShapes

Source: `/packages/editor/src/lib/editor/Editor.ts` lines 5137-5151

```typescript
@computed
getCulledShapes() {
  const notVisibleShapes = this.getNotVisibleShapes()
  const selectedShapeIds = this.getSelectedShapeIds()
  const editingId = this.getEditingShapeId()
  const culledShapes = new Set<TLShapeId>(notVisibleShapes)

  // Don't cull the shape we are editing
  if (editingId) {
    culledShapes.delete(editingId)
  }

  // Don't cull selected shapes
  selectedShapeIds.forEach((id) => {
    culledShapes.delete(id)
  })

  return culledShapes
}
```

Private field (line 5130):

```typescript
private _notVisibleShapes = notVisibleShapes(this)
```

Public accessor (lines 5125-5128):

```typescript
@computed
getNotVisibleShapes() {
  return this._notVisibleShapes.get()
}
```

### Safari reflow workaround

Source: `/packages/editor/src/lib/components/default-components/DefaultCanvas.tsx` lines 408-431

```typescript
function ReflowIfNeeded() {
	const editor = useEditor()
	const culledShapesRef = useRef<Set<TLShapeId>>(new Set())

	useQuickReactor(
		'reflow for culled shapes',
		() => {
			const culledShapes = editor.getCulledShapes()
			if (
				culledShapesRef.current.size === culledShapes.size &&
				[...culledShapes].every((id) => culledShapesRef.current.has(id))
			)
				return

			culledShapesRef.current = culledShapes
			const canvas = document.getElementsByClassName('tl-canvas')
			if (canvas.length === 0) return

			// This causes a reflow - forces Safari to recalculate layout
			// https://gist.github.com/paulirish/5d52fb081b3570c81e3a
			const _height = (canvas[0] as HTMLDivElement).offsetHeight
		},
		[editor]
	)
	return null
}
```

Only included in Safari builds (line 443):

```typescript
{tlenv.isSafari && <ReflowIfNeeded />}
```

## Stable DOM order

### getRenderingShapes

Source: `/packages/editor/src/lib/editor/Editor.ts` lines 4212-4226

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

### getUnorderedRenderingShapes

Source: `/packages/editor/src/lib/editor/Editor.ts` lines 4073-4178

Key aspects:

**Index calculation** (lines 4091-4092):

```typescript
let nextIndex = this.options.maxShapesPerPage * 2 // 8000
let nextBackgroundIndex = this.options.maxShapesPerPage // 4000
```

**maxShapesPerPage constant:**
Source: `/packages/editor/src/lib/options.ts` line 110

```typescript
maxShapesPerPage: 4000,
```

**Background index management** (lines 4136-4140):

```typescript
if (util.providesBackgroundForChildren(shape)) {
	backgroundIndexToRestore = nextBackgroundIndex
	nextBackgroundIndex = nextIndex
	nextIndex += this.options.maxShapesPerPage // Add 4000 for nested layer
}
```

This creates index "layers" for nested shape hierarchies, ensuring proper z-ordering without DOM reordering.

**Opacity calculation for erasing** (lines 4094-4130):

```typescript
const erasingShapeIds = this.getErasingShapeIds()

const addShapeById = (id: TLShapeId, opacity: number, isAncestorErasing: boolean) => {
	const shape = this.getShape(id)
	if (!shape) return

	if (this.isShapeHidden(shape)) {
		// Process children just in case they override hidden state
		const isErasing = isAncestorErasing || erasingShapeIds.includes(id)
		for (const childId of this.getSortedChildIdsForParent(id)) {
			addShapeById(childId, opacity, isErasing)
		}
		return
	}

	// Reduce opacity of erasing shapes (but only once per subtree)
	const isErasing = !isAncestorErasing && erasingShapeIds.includes(id)
	let effectiveOpacity = opacity
	if (isErasing) {
		effectiveOpacity = opacity * 0.32 // Hardcoded erasing opacity multiplier
	}

	// ... add shape to rendering list
}
```

### ShapesToDisplay component

Source: `/packages/editor/src/lib/components/default-components/DefaultCanvas.tsx` lines 433-446

```typescript
function ShapesToDisplay() {
  const editor = useEditor()

  const renderingShapes = useValue('rendering shapes', () => editor.getRenderingShapes(), [editor])

  return (
    <>
      {renderingShapes.map((result) => (
        <Shape key={result.id + '_shape'} {...result} />
      ))}
      {tlenv.isSafari && <ReflowIfNeeded />}
    </>
  )
}
```

Key prop is `result.id + '_shape'` for stable React keys, but shapes are sorted by ID so DOM order never changes.

## Performance characteristics

### Direct DOM manipulation avoids React reconciliation

- Container updates (transform, width, height, clip-path) bypass React
- Only content changes trigger React re-renders
- Memoization with custom equality prevents unnecessary content updates

### Reactivity prevents cascading updates

- Fine-grained subscriptions mean moving one shape doesn't re-render others
- Computed values cache results until dependencies change
- Incremental culling computation reuses Set objects when possible

### CSS transforms leverage GPU

- Single transform on parent layer for camera movement
- Individual shape transforms for positioning
- Browser compositor handles visual updates without reflow

### Constants and thresholds

- **toDomPrecision**: 4 decimal places (0.0001)
- **textShadowLod**: 0.35 zoom threshold
- **maxShapesPerPage**: 4000 shapes
- **Erasing opacity**: 0.32 multiplier
- **Minimum shape dimensions**: 1px (ensures rendering)
- **Z-index base**: 8000 for foreground, 4000 for background
- **Z-index spacing**: 4000 per nested layer

## Related implementations

### Font loading

Source: `/packages/editor/src/lib/components/Shape.tsx` lines 46-51

```typescript
useEffect(() => {
	return react('load fonts', () => {
		const fonts = editor.fonts.getShapeFontFaces(id)
		editor.fonts.requestFonts(fonts)
	})
}, [editor, id])
```

Uses reactive effect to load fonts when shape requires them.

### Background shapes

Source: `/packages/editor/src/lib/components/Shape.tsx` lines 146-152, 176-197

Some shapes have separate background components rendered in a different layer with different z-index. The background is rendered before the main shape content for proper layering.

### Error boundaries

Source: `/packages/editor/src/lib/components/Shape.tsx` lines 148-150, 154-156

Each shape is wrapped in an error boundary to prevent one broken shape from crashing the entire canvas:

```typescript
<OptionalErrorBoundary fallback={ShapeErrorFallback} onError={annotateError}>
  <InnerShape shape={shape} util={util} />
</OptionalErrorBoundary>
```

## Architecture benefits

1. **Extensibility**: Third-party shapes can use full React ecosystem
2. **Accessibility**: Native DOM means native accessibility tree
3. **Text editing**: Native contentEditable and text selection
4. **Embeds**: iframes, videos work natively without custom implementation
5. **Debugging**: Standard browser DevTools work for inspecting shapes
6. **Styling**: CSS works normally, no custom styling system needed

## Key files reference

- `/packages/editor/src/lib/components/Shape.tsx` - Two-stage shape rendering
- `/packages/editor/src/lib/components/default-components/DefaultCanvas.tsx` - Canvas structure and camera positioning
- `/packages/state-react/src/lib/useStateTracking.ts` - Reactive render tracking
- `/packages/state-react/src/lib/useValue.ts` - Signal subscription
- `/packages/state-react/src/lib/useQuickReactor.ts` - Immediate reactive effects
- `/packages/state-react/src/lib/useReactor.ts` - Throttled reactive effects
- `/packages/editor/src/lib/editor/derivations/notVisibleShapes.ts` - Viewport culling
- `/packages/editor/src/lib/editor/Editor.ts` - getRenderingShapes, getCulledShapes (lines 4073-4226, 5125-5151)
- `/packages/editor/src/lib/utils/areShapesContentEqual.ts` - Custom memoization
- `/packages/editor/src/lib/primitives/Mat.ts` - Matrix transformations
- `/packages/editor/src/lib/primitives/Box.ts` - Bounding box operations
- `/packages/editor/src/lib/primitives/utils.ts` - toDomPrecision utility
- `/packages/editor/src/lib/utils/dom.ts` - setStyleProperty helper
- `/packages/editor/src/lib/options.ts` - Configuration constants
- `/packages/utils/src/lib/number.ts` - modulate, lerp utilities
- `/packages/state/src/lib/EffectScheduler.ts` - Core reactivity scheduler
