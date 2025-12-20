---
title: Tools as hierarchical state machines
created_at: 12/20/2025
updated_at: 12/20/2025
keywords:
  - state machine
  - state chart
  - tools
  - StateNode
  - event handling
---

# Tools as hierarchical state machines

Most drawing apps implement tools with boolean flags and conditional logic. "Am I dragging? Is shift held? Am I over a handle?" You've seen the code: deeply nested `if` statements that check combinations of flags to figure out what to do. This quickly becomes unmaintainable spaghetti. tldraw implements each tool as a hierarchical state machine (often called a state chart), where complex tools have child states that handle specific interaction modes.

## The boolean spaghetti problem

Consider implementing a select tool. You need to handle:

- Clicking on empty canvas (deselect, or start brush selection)
- Clicking on a shape (select it, or add to selection with shift)
- Dragging from canvas (brush selection)
- Dragging a shape (translate)
- Dragging a resize handle (resize)
- Dragging a rotation handle (rotate)
- Double-clicking a shape (edit it)
- And many more...

A naive implementation uses flags:

```typescript
class SelectTool {
	isDragging = false
	isRotating = false
	isResizing = false
	isBrushing = false
	dragStart: Vec | null = null
	target: 'canvas' | 'shape' | 'handle' | null = null

	onPointerDown(e: PointerEvent) {
		this.dragStart = getPoint(e)
		if (this.hitTestRotationHandle(e)) {
			this.target = 'handle'
			this.isRotating = true
		} else if (this.hitTestResizeHandle(e)) {
			this.target = 'handle'
			this.isResizing = true
		} else if (this.hitTestShape(e)) {
			this.target = 'shape'
		} else {
			this.target = 'canvas'
		}
	}

	onPointerMove(e: PointerEvent) {
		if (!this.dragStart) return
		const delta = getPoint(e).sub(this.dragStart)
		if (delta.len() > DRAG_THRESHOLD && !this.isDragging) {
			this.isDragging = true
			if (this.target === 'canvas') this.isBrushing = true
		}
		if (this.isDragging) {
			if (this.isRotating) {
				this.doRotation(e)
			} else if (this.isResizing) {
				this.doResize(e)
			} else if (this.isBrushing) {
				this.doBrush(e)
			} else if (this.target === 'shape') {
				this.doTranslate(e)
			}
		}
	}

	onPointerUp(e: PointerEvent) {
		if (this.isDragging) {
			if (this.isBrushing) {
				this.finishBrush()
			} else if (this.isRotating) {
				this.finishRotation()
			}
			// ... more cleanup
		} else {
			// It was a click, not a drag
			if (this.target === 'shape') {
				this.selectShape(e)
			}
		}
		// Reset all flags
		this.isDragging = false
		this.isRotating = false
		this.isResizing = false
		this.isBrushing = false
		this.dragStart = null
		this.target = null
	}
}
```

This gets worse fast. What happens when you press Escape during a drag? What about when another pointer interrupts the gesture? Each new feature multiplies the flag combinations. The real SelectTool handles cropping, editing text, dragging arrow handles, scribble selection, and a dozen other interactions. With flags, you'd have hundreds of possible states and no clear way to reason about which combinations are valid.

## States instead of flags

A state machine makes the structure explicit. Instead of asking "what combination of flags am I in?", you ask "what state am I in?" Each state knows exactly what events it handles and what states it can transition to.

tldraw's SelectTool has 18 child states:

```typescript
export class SelectTool extends StateNode {
	static override id = 'select'
	static override initial = 'idle'

	static override children(): TLStateNodeConstructor[] {
		return [
			Idle,
			PointingCanvas,
			PointingShape,
			PointingSelection,
			PointingResizeHandle,
			PointingRotateHandle,
			PointingHandle,
			PointingArrowLabel,
			PointingCropHandle,
			Brushing,
			ScribbleBrushing,
			Translating,
			Resizing,
			Rotating,
			DraggingHandle,
			EditingShape,
			Crop,
			Cropping,
		]
	}
}
```

Each state is a class that handles a specific interaction mode. The `Idle` state handles pointer down events and transitions to the appropriate "pointing" state. The pointing states wait for a drag threshold and then transition to the corresponding action state.

## Event routing through the hierarchy

When an event arrives, it flows down through the active state chain. The root calls `handleEvent`, which invokes the appropriate handler method and then passes the event to the current child:

```typescript
handleEvent(info: TLEventInfo) {
	const cbName = EVENT_NAME_MAP[info.name]
	const currentActiveChild = this._current.__unsafe__getWithoutCapture()

	// First, handle the event at this level
	this[cbName]?.(info as any)

	// Then, if still active and child unchanged, pass to child
	if (
		this._isActive.__unsafe__getWithoutCapture() &&
		currentActiveChild &&
		currentActiveChild === this._current.__unsafe__getWithoutCapture()
	) {
		currentActiveChild.handleEvent(info)
	}
}
```

This means parent states can intercept events before children see them. If the parent transitions to a different child (or becomes inactive), the old child never receives the event. This prevents stale states from handling events they shouldn't.

The event types are mapped to handler methods:

```typescript
const EVENT_NAME_MAP = {
	pointer_down: 'onPointerDown',
	pointer_move: 'onPointerMove',
	pointer_up: 'onPointerUp',
	key_down: 'onKeyDown',
	// ...etc
}
```

A state implements only the handlers it cares about. The `Brushing` state implements `onPointerMove` to update the selection brush, `onPointerUp` to complete, and `onCancel` to abort. It ignores keyboard events entirely.

## Transitions and lifecycle

State transitions are explicit. When the Idle state detects a pointer down on the canvas, it transitions:

```typescript
// In Idle.onPointerDown
this.parent.transition('pointing_canvas', info)
```

The `transition` method handles the mechanics: exit the old state, enter the new one, and pass along any context data:

```typescript
transition(id: string, info: any = {}) {
	const prevChildState = this.getCurrent()
	const nextChildState = this.children?.[id]

	if (prevChildState?.id !== nextChildState.id) {
		prevChildState?.exit(info, id)
		this._current.set(nextChildState)
		nextChildState.enter(info, prevChildState?.id || 'initial')
	}
}
```

The `enter` and `exit` methods trigger `onEnter` and `onExit` hooks where states do setup and cleanup. The `from` parameter tells you where you came from, so you can behave differently based on the transition path:

```typescript
// In PointingCanvas
override onEnter(info: TLPointerEventInfo) {
	// Clear selection if not holding shift/accel
	if (!info.shiftKey && !info.accelKey) {
		if (this.editor.getSelectedShapeIds().length > 0) {
			this.editor.selectNone()
		}
	}
}
```

When PointingCanvas sees enough mouse movement, it transitions to Brushing:

```typescript
override onPointerMove(info: TLPointerEventInfo) {
	if (this.editor.inputs.getIsDragging()) {
		this.parent.transition('brushing', info)
	}
}
```

When pointer up happens without dragging, it transitions back to Idle:

```typescript
override onPointerUp(info: TLPointerEventInfo) {
	selectOnCanvasPointerUp(this.editor, info)
	this.parent.transition('idle')
}
```

## Nested hierarchies

The "hierarchical" part matters. The Crop state has its own child states:

```typescript
export class Crop extends StateNode {
	static override id = 'crop'
	static override initial = 'idle'

	static override children(): TLStateNodeConstructor[] {
		return [Idle, TranslatingCrop, PointingCrop, PointingCropHandle, Cropping]
	}

	override onEnter() {
		this.markId = this.editor.markHistoryStoppingPoint('crop')
	}

	override onExit() {
		this.editor.squashToMark(this.markId)
	}
}
```

This creates a path like `select.crop.idle` or `select.crop.cropping`. The editor can query the full path:

```typescript
editor.isIn('select.crop') // true if in crop mode
editor.isIn('select.crop.cropping') // true only while actively cropping
```

Nested states inherit event handling from parents. When you're in `select.crop.cropping`, events flow through SelectTool, then Crop, then Cropping. The Crop state's `onExit` runs when leaving crop mode entirely, regardless of which child state was active. This is perfect for cleanup—Crop uses it to squash the undo history so the entire crop operation becomes a single undo step.

## A simpler example: EraserTool

Not every tool needs 18 states. The eraser has just three:

```typescript
export class EraserTool extends StateNode {
	static override id = 'eraser'
	static override initial = 'idle'

	static override children(): TLStateNodeConstructor[] {
		return [Idle, Pointing, Erasing]
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}
}
```

The Pointing state marks shapes for erasure on enter, transitions to Erasing if dragged, or completes the erasure on pointer up:

```typescript
export class Pointing extends StateNode {
	override onEnter() {
		// Hit test and mark shapes for erasure
		const erasing = new Set<TLShapeId>()
		for (const shape of currentPageShapesSorted) {
			if (this.editor.isPointInShape(shape, currentPagePoint)) {
				erasing.add(shape.id)
			}
		}
		this.editor.setErasingShapes([...erasing])
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.getIsDragging()) {
			this.parent.transition('erasing', info)
		}
	}

	override onPointerUp() {
		const erasingShapeIds = this.editor.getErasingShapeIds()
		if (erasingShapeIds.length) {
			this.editor.deleteShapes(erasingShapeIds)
		}
		this.parent.transition('idle')
	}
}
```

Three states, clear responsibilities. The complexity matches the tool's actual behavior.

## Why not XState?

XState is the standard choice for state machines in JavaScript. We considered it but built our own for several reasons.

**Class-based architecture fits better.** tldraw's tools are classes with inheritance. The DrawTool extends a base with draw-specific behavior. XState's configuration-first approach would require a different architecture.

**We needed tight integration with the editor.** Every state needs access to the editor, inputs, and store. With our approach, states are instantiated with an editor reference and can call any editor method directly. XState would require additional plumbing.

**Performance matters.** State transitions happen on every pointer event during drawing. Our implementation is minimal—a few method calls and property updates. No configuration parsing, no actor model overhead.

**Simpler mental model.** Our states are just classes with handler methods. You read `onPointerDown` and see what happens. XState's declarative configuration is powerful but adds indirection.

The tradeoff is maintaining our own implementation. But it's around 300 lines of code for StateNode, well-tested, and hasn't needed significant changes since it was written. For our use case, simplicity won.

## Key files

- packages/editor/src/lib/editor/tools/StateNode.ts — Base class for all tools and states
- packages/editor/src/lib/editor/types/event-types.ts — Event type definitions and handler mappings
- packages/tldraw/src/lib/tools/SelectTool/SelectTool.ts — Complex tool with 18 child states
- packages/tldraw/src/lib/tools/SelectTool/childStates/Idle.ts — Main entry state handling pointer down
- packages/tldraw/src/lib/tools/SelectTool/childStates/Brushing.ts — Brush selection state
- packages/tldraw/src/lib/tools/EraserTool/EraserTool.ts — Simple tool with 3 states
- packages/editor/src/lib/editor/Editor.ts — Root state machine management (search for `setCurrentTool`)
