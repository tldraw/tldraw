---
title: Click detection
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - click
  - double-click
  - triple-click
  - quadruple-click
  - pointer
  - ClickManager
  - multi-click
status: published
date: 12/20/2024
order: 5
---

The click detection system identifies single, double, triple, and quadruple clicks from raw pointer events. It tracks the timing and position of consecutive pointer down events using a state machine, dispatching click events when timing and distance thresholds are met. This enables text editing features like word selection on double-click and paragraph selection on triple-click, as well as custom multi-click behaviors in shapes and tools.

The system validates that consecutive clicks occur within both timing windows and a maximum distance threshold (40 pixels), preventing false multi-click detection when users click in different locations. Movement during a pending click sequence also cancels the detection, ensuring click-drag operations work correctly.

## How it works

The `ClickManager` processes pointer events through a state machine that tracks click sequences. When a pointer down event occurs, the manager either starts a new sequence or advances to the next click level. Each state has a timeout that determines how long to wait for the next click before settling on the current level.

Two timeout durations control the detection speed. The first click uses `doubleClickDurationMs` (450ms by default), giving users time to initiate a double-click sequence. Subsequent clicks use the shorter `multiClickDurationMs` (200ms by default), requiring faster input for triple and quadruple clicks. This pattern matches common operating system behavior.

### State transitions

The click state machine progresses through these states:

- `idle`: No active click sequence
- `pendingDouble`: First click registered, waiting for second click
- `pendingTriple`: Second click registered, waiting for third click
- `pendingQuadruple`: Third click registered, waiting for fourth click
- `pendingOverflow`: Fourth click registered, waiting for fifth click
- `overflow`: More than four clicks detected

When a pointer down event arrives, the state advances to the next pending state and sets a timeout. If the timeout expires before the next click, the manager dispatches a settle event for the current click level and returns to idle. If another pointer down arrives before the timeout, the state advances and a click event is dispatched immediately.

### Distance validation

To prevent false multi-click detection, consecutive clicks must occur within a maximum distance of each other. The `MAX_CLICK_DISTANCE` is 40 pixels, measured in screen space. If pointer down events are farther apart, the click sequence resets to idle.

The distance check uses squared distance for performance, comparing the previous click position against the current position. The system stores the last click's screen-space coordinates and validates each new pointer down event against this cached position.

### Click event phases

Click events are dispatched with three possible phases:

- `down`: Fired immediately when a multi-click is detected during pointer down
- `up`: Fired during pointer up for multi-clicks that are still pending
- `settle`: Fired when the timeout expires without further clicks

The phase system allows tools and shapes to respond at different points in the click sequence. For example, a tool might preview a selection on the down phase and commit it on the up phase, providing immediate visual feedback while maintaining proper click semantics.

### Movement cancellation

If the pointer moves too far during a pending click sequence, the system cancels the sequence and returns to idle, preventing multi-click detection during click-drag operations. The movement threshold uses the same drag distance validation as other pointer operations, with separate values for coarse pointers (touchscreens) and fine pointers (mouse, stylus).

The movement check occurs on every pointer move event while a click sequence is pending. When the distance from the original click position exceeds the drag threshold, `cancelDoubleClickTimeout()` resets the state machine.

## Click event handling

Tools and shapes receive click events through handler methods defined in the `TLEventHandlers` interface:

- `onDoubleClick`: Receives `TLClickEventInfo` for double-click events
- `onTripleClick`: Receives `TLClickEventInfo` for triple-click events
- `onQuadrupleClick`: Receives `TLClickEventInfo` for quadruple-click events

Shape utilities can implement these methods to provide custom multi-click behavior. For example, the text shape utility uses double-click to select words and triple-click to select paragraphs.

The `TLClickEventInfo` type extends the base event info with click-specific properties:

```typescript
type TLClickEventInfo = {
	type: 'click'
	name: 'double_click' | 'triple_click' | 'quadruple_click'
	point: VecLike
	pointerId: number
	button: number
	phase: 'down' | 'up' | 'settle'
	// ... plus modifier keys (shift, alt, ctrl, meta)
}
```

## Timing configuration

Click timing is configured through the editor's options system:

- `doubleClickDurationMs`: Time window for the first click to become a double-click (default: 450ms)
- `multiClickDurationMs`: Time window for subsequent clicks in the sequence (default: 200ms)

These values can be customized when creating the editor. The defaults match standard operating system behavior and work well for most applications.

## Key files

- packages/editor/src/lib/editor/managers/ClickManager/ClickManager.ts - State machine implementation and event processing
- packages/editor/src/lib/editor/types/event-types.ts - Click event type definitions and handler interfaces
- packages/editor/src/lib/options.ts - Default timing configuration (doubleClickDurationMs, multiClickDurationMs)
- packages/editor/src/lib/editor/shapes/ShapeUtil.ts - Shape-level click handlers (onDoubleClick, onTripleClick, onQuadrupleClick)

## Related

- [Input handling](./input-handling.md)
- [Tool system](../architecture/tool-system.md)
