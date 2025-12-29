---
title: Tools as hierarchical state machines - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - state
  - chart
status: published
date: 12/21/2025
order: 3
---

# Tools as hierarchical state machines: raw notes

Internal research notes for the state-chart.md article.

## Core architecture

**StateNode base class:**
Located in `packages/editor/src/lib/editor/tools/StateNode.ts`

### Constructor and initialization (lines 47-90)

```typescript
constructor(public editor: Editor, parent?: StateNode) {
    const { id, children, initial, isLockable, useCoalescedEvents } =
        this.constructor as TLStateNodeConstructor

    this.id = id
    this._isActive = atom<boolean>('toolIsActive' + this.id, false)
    this._current = atom<StateNode | undefined>('toolState' + this.id, undefined)

    this._path = computed('toolPath' + this.id, () => {
        const current = this.getCurrent()
        return this.id + (current ? `.${current.getPath()}` : '')
    })

    this.parent = parent ?? ({} as any)

    if (parent) {
        if (children && initial) {
            this.type = 'branch'
            this.initial = initial
            this.children = Object.fromEntries(
                children().map((Ctor) => [Ctor.id, new Ctor(this.editor, this)])
            )
            this._current.set(this.children[this.initial])
        } else {
            this.type = 'leaf'
        }
    } else {
        this.type = 'root'
        // root initialization logic
    }
    this.isLockable = isLockable
    this.useCoalescedEvents = useCoalescedEvents
    this.performanceTracker = new PerformanceTracker()
}
```

**Node types:**

- `'root'` - The top-level state machine (no parent)
- `'branch'` - Has child states (like SelectTool with 18 children)
- `'leaf'` - Terminal state with no children (like Idle, Brushing, etc.)

**Static properties:**

```typescript
static id: string              // Unique identifier for the state
static initial?: string        // Default child state ID
static children?(): TLStateNodeConstructor[]  // Factory for child states
static isLockable = true       // Whether tool can be locked
static useCoalescedEvents = false  // Performance optimization for pointer events
```

## Event handling mechanism

### EVENT_NAME_MAP (event-types.ts:189-210)

```typescript
export const EVENT_NAME_MAP: Record<
	Exclude<TLEventName, TLPinchEventName>,
	keyof TLEventHandlers
> = {
	wheel: 'onWheel',
	pointer_down: 'onPointerDown',
	pointer_move: 'onPointerMove',
	long_press: 'onLongPress',
	pointer_up: 'onPointerUp',
	right_click: 'onRightClick',
	middle_click: 'onMiddleClick',
	key_down: 'onKeyDown',
	key_up: 'onKeyUp',
	key_repeat: 'onKeyRepeat',
	cancel: 'onCancel',
	complete: 'onComplete',
	interrupt: 'onInterrupt',
	double_click: 'onDoubleClick',
	triple_click: 'onTripleClick',
	quadruple_click: 'onQuadrupleClick',
	tick: 'onTick',
}
```

### handleEvent method (StateNode.ts:178-190)

```typescript
handleEvent(info: Exclude<TLEventInfo, TLPinchEventInfo>) {
    const cbName = EVENT_NAME_MAP[info.name]
    const currentActiveChild = this._current.__unsafe__getWithoutCapture()

    // Handle at parent level first
    this[cbName]?.(info as any)

    // Then pass to child if:
    // 1. This state is still active
    // 2. There's a current child
    // 3. The child hasn't changed during parent's handling
    if (
        this._isActive.__unsafe__getWithoutCapture() &&
        currentActiveChild &&
        currentActiveChild === this._current.__unsafe__getWithoutCapture()
    ) {
        currentActiveChild.handleEvent(info)
    }
}
```

**Why `__unsafe__getWithoutCapture()`:**

- Bypasses reactive signal dependency tracking
- Normal `.get()` would register dependencies in @tldraw/state system
- `handleEvent` is called from outside reactive system, doesn't need tracking
- Prevents unnecessary reactive updates and memory leaks

**Parent-first routing pattern:**

- Parent handles event before passing to child
- If parent transitions to different child, old child never receives event
- Check `currentActiveChild === this._current.__unsafe__getWithoutCapture()` detects transitions
- Prevents stale states from handling events they shouldn't

## Transition mechanism

### transition method (StateNode.ts:151-176)

```typescript
transition(id: string, info: any = {}) {
    const path = id.split('.')

    let currState = this as StateNode

    for (let i = 0; i < path.length; i++) {
        const id = path[i]
        const prevChildState = currState.getCurrent()
        const nextChildState = currState.children?.[id]

        if (!nextChildState) {
            throw Error(`${currState.id} - no child state exists with the id ${id}.`)
        }

        if (prevChildState?.id !== nextChildState.id) {
            prevChildState?.exit(info, id)
            currState._current.set(nextChildState)
            nextChildState.enter(info, prevChildState?.id || 'initial')
            if (!nextChildState.getIsActive()) break
        }

        currState = nextChildState
    }

    return this
}
```

**Dot-separated path syntax:**

- `'pointing_canvas'` - transition to sibling
- `'crop.pointing_crop_handle'` - transition through multiple levels
- Walks each level, exiting old states and entering new ones
- Enables direct transitions into nested hierarchies without manual management

### enter method (StateNode.ts:193-206)

```typescript
enter(info: any, from: string) {
    if (debugFlags.measurePerformance.get() && STATE_NODES_TO_MEASURE.includes(this.id)) {
        this.performanceTracker.start(this.id)
    }

    this._isActive.set(true)
    this.onEnter?.(info, from)

    if (this.children && this.initial && this.getIsActive()) {
        const initial = this.children[this.initial]
        this._current.set(initial)
        initial.enter(info, from)
    }
}
```

**Parameters:**

- `info: any` - Arbitrary data passed through transition (often event info)
- `from: string` - ID of state transitioning from (for onEnter) or to (for onExit)

### exit method (StateNode.ts:209-219)

```typescript
exit(info: any, to: string) {
    if (debugFlags.measurePerformance.get() && this.performanceTracker.isStarted()) {
        this.performanceTracker.stop()
    }
    this._isActive.set(false)
    this.onExit?.(info, to)

    if (!this.getIsActive()) {
        this.getCurrent()?.exit(info, to)
    }
}
```

**Automatic child exit:**

- When exiting, automatically exits current child state
- Cascades through entire hierarchy
- Ensures cleanup happens at all levels

## Performance tracking

### STATE_NODES_TO_MEASURE (StateNode.ts:20-32)

```typescript
const STATE_NODES_TO_MEASURE = [
	'brushing',
	'cropping',
	'dragging',
	'dragging_handle',
	'drawing',
	'erasing',
	'lasering',
	'resizing',
	'rotating',
	'scribble_brushing',
	'translating',
]
```

**Why these states:**

- All are high-frequency interaction states
- Called 60+ times per second during active use
- Performance issues here directly impact user experience
- Measured only when `debugFlags.measurePerformance.get()` is true

## Drag detection

### InputsManager drag threshold

From `packages/editor/src/lib/editor/Editor.ts:10572-10582`:

```typescript
if (
	inputs.getIsPointing() &&
	!inputs.getIsDragging() &&
	Vec.Dist2(inputs.getOriginPagePoint(), inputs.getCurrentPagePoint()) * this.getZoomLevel() >
		(instanceState.isCoarsePointer
			? this.options.coarseDragDistanceSquared
			: this.options.dragDistanceSquared) /
			cz
) {
	// Start dragging
	inputs.setIsDragging(true)
	clearTimeout(this._longPressTimeout)
}
```

**Drag threshold constants** (`packages/editor/src/lib/options.ts:117-122`):

```typescript
coarseDragDistanceSquared: 36,  // 6 squared (touch/coarse pointer)
dragDistanceSquared: 16,         // 4 squared (mouse/precise pointer)
uiDragDistanceSquared: 16,       // 4 squared (UI elements)
uiCoarseDragDistanceSquared: 625, // 25 squared (UI on mobile - high to prevent accidental drags)
```

**Zoom compensation:**

- Formula: `distance * zoomLevel > threshold / cz`
- Where `cz` is camera zoom level
- Maintains consistent pixel threshold regardless of zoom
- At 200% zoom, need half the actual distance to trigger drag
- At 50% zoom, need double the actual distance

**Distance calculation:**

- Uses `Vec.Dist2` (squared distance) to avoid expensive `Math.sqrt`
- Compares squared distances to squared thresholds
- More efficient than comparing actual distances

## SelectTool implementation

### Child states (SelectTool.ts:28-49)

```typescript
static override children(): TLStateNodeConstructor[] {
    return [
        Crop,              // Nested state machine for cropping
        Cropping,          // Active cropping state
        Idle,              // Default state
        PointingCanvas,    // Pointer down on empty canvas
        PointingShape,     // Pointer down on shape
        Translating,       // Moving shapes
        Brushing,          // Rectangular brush selection
        ScribbleBrushing,  // Alt+drag scribble selection
        PointingCropHandle,     // Pointer down on crop handle
        PointingSelection,      // Pointer down on selection
        PointingResizeHandle,   // Pointer down on resize handle
        EditingShape,           // Editing shape content
        Resizing,              // Actively resizing
        Rotating,              // Actively rotating
        PointingRotateHandle,  // Pointer down on rotation handle
        PointingArrowLabel,    // Pointer down on arrow label
        PointingHandle,        // Pointer down on shape handle
        DraggingHandle,        // Dragging shape handle
    ]
}
```

**State naming convention:**

- `Pointing*` - Waiting for drag threshold or pointer up
- `*ing` (Brushing, Translating, etc.) - Active interaction in progress
- `Idle` - Default/resting state
- `Crop` - Nested parent state

### Idle state transitions (Idle.ts:54-166)

**onPointerDown routing logic:**

```typescript
override onPointerDown(info: TLPointerEventInfo) {
    switch (info.target) {
        case 'canvas': {
            // Check for shape under pointer first
            const hitShape = getHitShapeOnCanvasPointerDown(this.editor)
            if (hitShape && !hitShape.isLocked) {
                // Recurse with shape target
                this.onPointerDown({ ...info, shape: hitShape, target: 'shape' })
                return
            }

            // Check if clicking inside selection bounds
            if (selectedShapeIds.length > 1 || ...) {
                if (isPointInRotatedSelectionBounds(this.editor, currentPagePoint)) {
                    this.onPointerDown({ ...info, target: 'selection' })
                    return
                }
            }

            this.parent.transition('pointing_canvas', info)
            break
        }
        case 'shape': {
            if (this.editor.isShapeOrAncestorLocked(shape)) {
                this.parent.transition('pointing_canvas', info)
                break
            }
            this.parent.transition('pointing_shape', info)
            break
        }
        case 'handle': {
            if (this.editor.getIsReadonly()) break
            if (this.editor.inputs.getAltKey()) {
                this.parent.transition('pointing_shape', info)
            } else {
                this.parent.transition('pointing_handle', info)
            }
            break
        }
        case 'selection': {
            switch (info.handle) {
                case 'mobile_rotate':
                case 'top_left_rotate':
                // ... other rotation handles
                    if (info.accelKey) {
                        this.parent.transition('brushing', info)
                        break
                    }
                    this.parent.transition('pointing_rotate_handle', info)
                    break
                case 'top':
                case 'right':
                // ... edge and corner handles
                    if (info.ctrlKey && this.editor.canCropShape(onlySelectedShape)) {
                        // Direct nested transition
                        this.parent.transition('crop.pointing_crop_handle', info)
                    } else {
                        if (info.accelKey) {
                            this.parent.transition('brushing', info)
                            break
                        }
                        this.parent.transition('pointing_resize_handle', info)
                    }
                    break
                default:
                    this.parent.transition('pointing_selection', info)
            }
            break
        }
    }
}
```

**Keyboard handling (Idle.ts:442-462):**

```typescript
override onKeyDown(info: TLKeyboardEventInfo) {
    this.selectedShapesOnKeyDown = this.editor.getSelectedShapes()

    switch (info.code) {
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown': {
            if (info.accelKey) {
                if (info.shiftKey) {
                    if (info.code === 'ArrowDown') {
                        this.editor.selectFirstChildShape()
                    } else if (info.code === 'ArrowUp') {
                        this.editor.selectParentShape()
                    }
                } else {
                    this.editor.selectAdjacentShape(
                        info.code.replace('Arrow', '').toLowerCase() as TLAdjacentDirection
                    )
                }
                return
            }
            this.nudgeSelectedShapes(false)
            return
        }
    }
}
```

**Nudge constants (Idle.ts:664-666):**

```typescript
export const MAJOR_NUDGE_FACTOR = 10
export const MINOR_NUDGE_FACTOR = 1
export const GRID_INCREMENT = 5
```

### PointingCanvas state (PointingCanvas.ts)

**Simple pointing state:**

```typescript
export class PointingCanvas extends StateNode {
	static override id = 'pointing_canvas'

	override onEnter(info: TLPointerEventInfo & { target: 'canvas' }) {
		const additiveSelectionKey = info.shiftKey || info.accelKey

		if (!additiveSelectionKey) {
			if (this.editor.getSelectedShapeIds().length > 0) {
				this.editor.markHistoryStoppingPoint('selecting none')
				this.editor.selectNone()
			}
		}
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.getIsDragging()) {
			this.parent.transition('brushing', info)
		}
	}

	override onPointerUp(info: TLPointerEventInfo) {
		selectOnCanvasPointerUp(this.editor, info)
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	override onInterrupt() {
		this.parent.transition('idle')
	}

	private complete() {
		this.parent.transition('idle')
	}
}
```

**Pattern:**

- `onEnter` - Setup (clear selection if not additive)
- `onPointerMove` - Check drag and transition to Brushing
- `onPointerUp` - Complete interaction, return to Idle
- `onComplete/onInterrupt` - Cleanup paths

### Brushing state (Brushing.ts)

**Brush selection optimization (lines 154-159):**

```typescript
const brushBoxIsInsideViewport = editor.getViewportPageBounds().contains(brush)
const shapesToHitTest =
	brushBoxIsInsideViewport && !this.viewportDidChange
		? editor.getCurrentPageRenderingShapesSorted() // On-screen shapes only
		: editor.getCurrentPageShapesSorted() // All shapes
```

**Why this optimization:**

- On-screen tests are ~2x faster than testing all shapes
- On page with 5000 shapes, significant performance difference
- Only test all shapes if:
  - Brush extends outside viewport
  - User has scrolled during brushing (`viewportDidChange` flag)

**Viewport change tracking (lines 42-47):**

```typescript
this.cleanupViewportChangeReactor = react('viewport change while brushing', () => {
	editor.getViewportPageBounds() // capture the viewport change
	if (!isInitialCheck && !this.viewportDidChange) {
		this.viewportDidChange = true
	}
})
```

**Hit testing logic (lines 162-200):**

```typescript
testAllShapes: for (let i = 0, n = shapesToHitTest.length; i < n; i++) {
	shape = shapesToHitTest[i]
	if (excludedShapeIds.has(shape.id) || results.has(shape.id)) continue testAllShapes

	pageBounds = editor.getShapePageBounds(shape)
	if (!pageBounds) continue testAllShapes

	// If brush fully contains shape
	if (brush.contains(pageBounds)) {
		this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
		continue testAllShapes
	}

	// In wrap mode or for frames, require full containment
	if (isWrapping || editor.isShapeOfType(shape, 'frame')) {
		continue testAllShapes
	}

	// Test brush edges against shape geometry
	if (brush.collides(pageBounds)) {
		pageTransform = editor.getShapePageTransform(shape)
		if (!pageTransform) continue testAllShapes
		localCorners = pageTransform.clone().invert().applyToPoints(corners)

		const geometry = editor.getShapeGeometry(shape)
		hitTestBrushEdges: for (let i = 0; i < 4; i++) {
			A = localCorners[i]
			B = localCorners[(i + 1) % 4]
			if (geometry.hitTestLineSegment(A, B, 0)) {
				this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
				break hitTestBrushEdges
			}
		}
	}
}
```

**Wrap mode (lines 125-126):**

```typescript
const isWrapping = isWrapMode ? !ctrlKey : ctrlKey
```

- Default (not wrap mode): Ctrl to require full containment
- Wrap mode: Shapes must be fully contained by default, Ctrl to allow partial

**Edge scrolling (lines 76-78):**

```typescript
override onTick({ elapsed }: TLTickEventInfo) {
    const { editor } = this
    editor.edgeScrollManager.updateEdgeScrolling(elapsed)
}
```

## EraserTool implementation

### Simple three-state tool (EraserTool.ts)

```typescript
export class EraserTool extends StateNode {
	static override id = 'eraser'
	static override initial = 'idle'
	static override isLockable = false
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Pointing, Erasing]
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}
}
```

### Pointing state (EraserTool/Pointing.ts:8-46)

```typescript
override onEnter() {
    this._isHoldingAccelKey = isAccelKey(this.editor.inputs)

    const zoomLevel = this.editor.getZoomLevel()
    const currentPageShapesSorted = this.editor.getCurrentPageRenderingShapesSorted()
    const currentPagePoint = this.editor.inputs.getCurrentPagePoint()

    const erasing = new Set<TLShapeId>()
    const initialSize = erasing.size

    // Iterate backwards (top to bottom in z-order)
    for (let n = currentPageShapesSorted.length, i = n - 1; i >= 0; i--) {
        const shape = currentPageShapesSorted[i]
        if (this.editor.isShapeOrAncestorLocked(shape) ||
            this.editor.isShapeOfType(shape, 'group')) {
            continue
        }

        if (
            this.editor.isPointInShape(shape, currentPagePoint, {
                hitInside: false,
                margin: this.editor.options.hitTestMargin / zoomLevel,
            })
        ) {
            const hitShape = this.editor.getOutermostSelectableShape(shape)
            // If hit frame after hitting other shape, stop
            if (this.editor.isShapeOfType(hitShape, 'frame') &&
                erasing.size > initialSize) {
                break
            }

            erasing.add(hitShape.id)

            // If holding accel key, stop after first shape
            if (this._isHoldingAccelKey) {
                break
            }
        }
    }

    this.editor.setErasingShapes([...erasing])
}
```

**Accel key behavior:**

- Without accel: Erases all shapes under pointer (z-order stack)
- With accel: Erases only topmost shape
- Checked in `onEnter`, `onKeyDown`, `onKeyUp`

**Frame handling:**

- Stop collecting shapes after hitting a frame
- Prevents erasing everything inside a frame when erasing the frame itself

## Nested hierarchies: Crop state

### Crop parent state (SelectTool/Crop/Crop.ts)

```typescript
export class Crop extends StateNode {
	static override id = 'crop'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [Idle, TranslatingCrop, PointingCrop, PointingCropHandle, Cropping]
	}

	markId = ''
	didExit = false

	override onEnter() {
		this.didExit = false
		this.markId = this.editor.markHistoryStoppingPoint('crop')
	}

	override onExit() {
		if (!this.didExit) {
			this.didExit = true
			this.editor.squashToMark(this.markId)
		}
	}

	override onCancel() {
		if (!this.didExit) {
			this.didExit = true
			this.editor.bailToMark(this.markId)
		}
	}
}
```

**History management:**

- `markHistoryStoppingPoint('crop')` - Creates undo checkpoint
- `squashToMark(markId)` - Combines all changes since mark into single undo step
- `bailToMark(markId)` - Reverts all changes since mark (cancel)
- `didExit` flag prevents double-processing if both `onExit` and `onCancel` fire

**Parent state benefits:**

- Handles lifecycle for all child states
- Single point for setup/cleanup logic
- History management applies regardless of which child state is active
- Full path example: `select.crop.idle` or `select.crop.cropping`

## Root state machine setup

### Editor root initialization (Editor.ts:332-384)

```typescript
class NewRoot extends RootState {
	static override initial = initialState ?? ''
}

this.root = new NewRoot(this)
this.root.children = {}

// ... shape utils setup ...

// Add tools
for (const Tool of [...tools]) {
	if (hasOwnProperty(this.root.children!, Tool.id)) {
		throw Error(`Can't override tool with id "${Tool.id}"`)
	}
	this.root.children![Tool.id] = new Tool(this, this.root)
}

// ... cleanup and validation ...

if (initialState && this.root.children[initialState] === undefined) {
	throw Error(`No state found for initialState "${initialState}".`)
}

this.root.enter(undefined, 'initial')
```

**Tool registration:**

- Tools are children of root state
- Each tool is a StateNode instance
- Tool IDs must be unique
- Tools have access to editor via constructor
- Root enters initial state at end of setup

### setCurrentTool (Editor.ts:1429-1432)

```typescript
setCurrentTool(id: string, info = {}): this {
    this.root.transition(id, info)
    return this
}
```

**Simple delegation:**

- Just calls `transition` on root
- Root handles the mechanics of exiting old tool, entering new one
- Returns `this` for chaining

**Example usage (Editor.ts:10532):**

```typescript
// On stylus eraser button
if (info.button === STYLUS_ERASER_BUTTON) {
	this._restoreToolId = this.getCurrentToolId()
	this.complete()
	this.setCurrentTool('eraser')
}
```

## Event lifecycle

### TLEventInfo types (event-types.ts)

**TLPointerEventInfo (lines 56-64):**

```typescript
export type TLPointerEventInfo = TLBaseEventInfo & {
	type: 'pointer'
	name: TLPointerEventName
	point: VecLike // Client space coordinates
	pointerId: number
	button: number
	isPen: boolean
} & TLPointerEventTarget
```

**TLPointerEventTarget (lines 9-13):**

```typescript
export type TLPointerEventTarget =
	| { target: 'canvas'; shape?: undefined }
	| { target: 'selection'; handle?: TLSelectionHandle; shape?: undefined }
	| { target: 'shape'; shape: TLShape }
	| { target: 'handle'; shape: TLShape; handle: TLHandle }
```

**TLBaseEventInfo (lines 46-53):**

```typescript
export interface TLBaseEventInfo {
	type: UiEventType
	shiftKey: boolean
	altKey: boolean
	ctrlKey: boolean
	metaKey: boolean
	accelKey: boolean // Cmd on Mac, Ctrl on Windows/Linux
}
```

### Event handler signatures (StateNode.ts:267-287)

```typescript
onWheel?(info: TLWheelEventInfo): void
onPointerDown?(info: TLPointerEventInfo): void
onPointerMove?(info: TLPointerEventInfo): void
onLongPress?(info: TLPointerEventInfo): void
onPointerUp?(info: TLPointerEventInfo): void
onDoubleClick?(info: TLClickEventInfo): void
onTripleClick?(info: TLClickEventInfo): void
onQuadrupleClick?(info: TLClickEventInfo): void
onRightClick?(info: TLPointerEventInfo): void
onMiddleClick?(info: TLPointerEventInfo): void
onKeyDown?(info: TLKeyboardEventInfo): void
onKeyUp?(info: TLKeyboardEventInfo): void
onKeyRepeat?(info: TLKeyboardEventInfo): void
onCancel?(info: TLCancelEventInfo): void
onComplete?(info: TLCompleteEventInfo): void
onInterrupt?(info: TLInterruptEventInfo): void
onTick?(info: TLTickEventInfo): void

onEnter?(info: any, from: string): void
onExit?(info: any, to: string): void
```

**Lifecycle events:**

- `onCancel` - User pressed Escape or equivalent
- `onComplete` - Interaction finished successfully
- `onInterrupt` - Interaction interrupted (e.g., by another tool activation)
- `onTick` - Animation frame callback (for edge scrolling, etc.)

## Tool options and flags

### TLStateNodeConstructor interface (StateNode.ts:35-42)

```typescript
export interface TLStateNodeConstructor {
	new (editor: Editor, parent?: StateNode): StateNode
	id: string
	initial?: string
	children?(): TLStateNodeConstructor[]
	isLockable: boolean
	useCoalescedEvents: boolean
}
```

**isLockable (default: true):**

- Whether tool can be "locked" (sticky) to prevent returning to select tool
- SelectTool, EraserTool set to `false` (can't lock these)
- Drawing tools typically `true`

**useCoalescedEvents (default: false):**

- Performance optimization for pointer events
- If true, browser coalesces multiple pointer events into one
- Useful for high-frequency events during drawing
- Most tools use false for precision

### Tool masking (StateNode.ts:231-239)

```typescript
_currentToolIdMask = atom('curent tool id mask', undefined as string | undefined)

getCurrentToolIdMask() {
    return this._currentToolIdMask.get()
}

setCurrentToolIdMask(id: string | undefined) {
    this._currentToolIdMask.set(id)
}
```

**Purpose:**

- Hack/escape hatch for UI display
- Child state can report different tool as active
- Example: Temporary transitions that shouldn't change UI
- Used when state transitions to child of different tool temporarily

## Editor integration

### isIn method (Editor.ts:1393-1413)

```typescript
isIn(path: string): boolean {
    const ids = path.split('.').reverse()
    let state = this.root as StateNode
    while (ids.length > 0) {
        const id = ids.pop()
        if (!id) return true
        const current = state.getCurrent()
        if (current?.id === id) {
            if (ids.length === 0) return true
            state = current
            continue
        } else return false
    }
    return false
}

isInAny(...paths: string[]): boolean {
    return paths.some((path) => this.isIn(path))
}
```

**Usage examples:**

```typescript
editor.isIn('select') // In select tool
editor.isIn('select.crop') // In crop mode
editor.isIn('select.crop.cropping') // Actively cropping
editor.isInAny('select.brushing', 'select.translating') // Multiple checks
```

## Constants and configuration

### Options (options.ts:117-143)

```typescript
// Drag thresholds (squared distances)
coarseDragDistanceSquared: 36,      // 6px - touch/stylus
dragDistanceSquared: 16,            // 4px - mouse
uiDragDistanceSquared: 16,          // 4px - UI elements
uiCoarseDragDistanceSquared: 625,   // 25px - UI on mobile

// Timing
doubleClickDurationMs: 450,
multiClickDurationMs: 200,
longPressDurationMs: 500,
cameraSlideFriction: 0.09,
cameraMovingTimeoutMs: 64,

// Edge scrolling
edgeScrollDelay: 200,
edgeScrollEaseDuration: 200,
edgeScrollSpeed: 25,
edgeScrollDistance: 8,

// Hit testing
hitTestMargin: 8,
coarsePointerWidth: 12,
coarseHandleRadius: 20,
handleRadius: 12,

// Other
defaultSvgPadding: 32,
followChaseViewportSnap: 2,
```

### Grid steps (options.ts:125-129)

```typescript
gridSteps: [
    { min: -1,    mid: 0.15,  step: 64 },
    { min: 0.05,  mid: 0.375, step: 16 },
    { min: 0.15,  mid: 1,     step: 4 },
    { min: 0.7,   mid: 2.5,   step: 1 },
],
```

**Zoom-dependent grid:**

- Different grid step sizes at different zoom levels
- `min` - Minimum zoom for this step
- `mid` - Midpoint zoom for this step
- `step` - Grid cell size in pixels

## Comparison with XState

### Why not XState (from article)

**Architectural fit:**

- tldraw uses class-based inheritance for tools
- XState is configuration-first (JSON/object configs)
- Would need to define machines separately or wrap them in classes
- StateNode's class-based approach more natural for OOP patterns

**Editor integration:**

- Every state needs `editor` reference
- StateNode: passed in constructor, available as `this.editor`
- XState: would need context objects or services
- More boilerplate for same level of access

**Performance:**

- State transitions happen on every pointer event (60+ fps during drag)
- StateNode: minimal - method calls and property updates
- XState: configuration parsing, actor model overhead
- General-purpose library has runtime cost

**Mental model:**

- StateNode: classes with handler methods (`onPointerDown`, etc.)
- Direct, obvious - read method and see what happens
- XState: declarative configuration with actions, guards, services
- Powerful but adds indirection and learning curve
- Contributors familiar with OOP have easier time

**Type safety:**

- TypeScript inference works naturally with class hierarchy
- Each state knows parent type, has typed editor access
- XState: requires more ceremony for equivalent type safety

**Tradeoffs:**

- StateNode: ~300 lines of code, must maintain ourselves
- XState: battle-tested, features like visualization, time-travel debugging
- For tldraw's use case, simplicity and performance outweigh XState's power
- If needed state visualization or actor orchestration, might be different

## Implementation size

**StateNode.ts:** ~288 lines total

- Constructor: ~45 lines
- Event handling: ~15 lines
- Transition logic: ~25 lines
- Enter/exit: ~25 lines
- Utilities: ~20 lines
- Type definitions: ~100 lines

**Small, focused implementation:**

- No external dependencies (except @tldraw/state for reactive atoms)
- Well-tested
- Hasn't needed significant changes since initial implementation
- Meets needs without general-purpose library overhead

## Key source files

### Core implementation

- `packages/editor/src/lib/editor/tools/StateNode.ts` - Base class (~288 lines)
- `packages/editor/src/lib/editor/types/event-types.ts` - Event types and mapping
- `packages/editor/src/lib/editor/Editor.ts` - Root state machine setup
  - Lines 332-384: Tool registration
  - Lines 1429-1432: setCurrentTool
  - Lines 1393-1413: isIn/isInAny
  - Lines 10572-10582: Drag detection
- `packages/editor/src/lib/options.ts` - Configuration constants
  - Lines 117-143: Drag thresholds and timing

### SelectTool (complex example)

- `packages/tldraw/src/lib/tools/SelectTool/SelectTool.ts` - Parent with 18 children
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Idle.ts` - Entry state
  - Lines 54-166: onPointerDown routing
  - Lines 442-462: Keyboard navigation
  - Lines 625-661: Nudging logic
- `packages/tldraw/src/lib/tools/SelectTool/childStates/PointingCanvas.ts` - Simple pointing state
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Brushing.ts` - Brush selection
  - Lines 154-159: Viewport optimization
  - Lines 162-200: Hit testing algorithm
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Crop/Crop.ts` - Nested hierarchy
  - Shows history management pattern

### EraserTool (simple example)

- `packages/tldraw/src/lib/tools/EraserTool/EraserTool.ts` - Simple 3-state tool
- `packages/tldraw/src/lib/tools/EraserTool/childStates/Pointing.ts` - Hit testing
  - Lines 8-46: Z-order traversal, accel key handling

### Input management

- `packages/editor/src/lib/editor/managers/InputsManager/InputsManager.ts`
  - Lines 14-102: Point tracking (origin, previous, current)
  - Lines 283-306: isDragging flag management
  - Lines 132: keys AtomSet
  - Lines 137: buttons AtomSet
