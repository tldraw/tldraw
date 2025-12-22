---
title: Input handling
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - input
  - pointer
  - keyboard
  - InputsManager
  - events
reviewed_by: steveruizok
status: published
date: 12/20/2024
order: 17
---

The input handling system manages pointer and keyboard state through the `InputsManager` class. This manager tracks pointer positions in multiple coordinate spaces, maintains button and key press states, detects input device types, and calculates pointer velocity for gesture recognition. By normalizing input across different devices (mouse, touch, pen), the system provides a consistent interface that tools and shapes can use to respond to user interactions.

All input state is stored as reactive atoms using the `@tldraw/state` library. This reactive approach means components can efficiently read input state without subscribing to every update, and dependent computations automatically recalculate when dereferenced if the specific input values they depend on have changed. The manager updates its state on every input event, converts coordinates between screen space and page space, and maintains historical positions to support delta calculations for dragging and panning operations.

## Pointer position tracking

The `InputsManager` tracks pointer positions in two coordinate spaces. Screen space represents pixels relative to the canvas container's origin, accounting for where the container appears in the browser window. Page space represents coordinates in the infinite canvas, adjusted for camera position and zoom level. The manager maintains three position snapshots in both spaces: current, previous, and origin.

### Current and previous positions

The current position updates on every pointer move event:

```typescript
editor.inputs.getCurrentScreenPoint() // Current in screen space
editor.inputs.getCurrentPagePoint() // Current in page space
```

The previous position stores the last pointer location before the most recent update, enabling delta calculations for dragging and panning:

```typescript
const delta = Vec.Sub(editor.inputs.getCurrentPagePoint(), editor.inputs.getPreviousPagePoint())
```

The `updateFromEvent()` method updates these positions atomically. It first saves the current positions to previous, then calculates new current positions from the incoming event. This ensures the previous position always represents the immediately prior state, making delta calculations reliable even when pointer events arrive rapidly.

### Origin positions

Origin positions capture where the most recent pointer down event occurred:

```typescript
editor.inputs.getOriginPagePoint() // Where pointer_down occurred
```

Tools use origin positions to calculate drag distances and determine whether an interaction has moved far enough to trigger certain behaviors. The origin resets on every pointer_down event and during pinch gestures, providing a stable reference point for the duration of each interaction.

### Coordinate space conversion

The manager converts from screen space to page space using the camera's position and zoom:

```typescript
// Screen to page conversion (simplified)
const pageX = screenX / camera.z - camera.x
const pageY = screenY / camera.z - camera.y
```

The system validates converted coordinates to ensure they're finite before updating state, preventing issues when extreme zoom levels or camera positions produce invalid values.

## Pointer velocity

The system tracks pointer velocity to support gesture detection. Velocity is measured in pixels per millisecond and calculated on each animation frame tick rather than on each pointer event:

```typescript
editor.inputs.getPointerVelocity() // Vec with x/y velocity
```

The `TickManager` calls `updatePointerVelocity()` on every frame, calculating the distance traveled since the last tick and deriving a direction vector. The new velocity is interpolated with the previous velocity using a 0.5 factor to smooth out rapid changes. Very small velocity values (below 0.01) are clamped to zero to prevent jitter.

Tools use velocity to distinguish between interaction types. The hand tool, for example, can differentiate between slow precise panning and fast flick gestures based on velocity magnitude. Velocity resets to zero on pointer_down events and during pinch gestures, ensuring each interaction starts with clean state.

## Input device detection

The manager tracks whether the current input comes from a pen device:

```typescript
editor.inputs.getIsPen() // true for stylus input
```

The system determines pen input from the pointer event's `isPen` property, which is set by the browser based on the input device type. This enables pen-specific behaviors like pen mode, which ignores non-pen input to prevent accidental touch interactions when using a stylus. The pen flag updates on every pointer event through `updateFromEvent()`.

> While devices have the ability to self-identify as 'pen', many devices do not do so. For example, many stylus devices will identify as 'mouse'. We use heuristics to handle these inputs so that we can correctly account for pressure.

## Modifier keys and button states

The manager tracks modifier key states as reactive boolean atoms:

```typescript
editor.inputs.getShiftKey()
editor.inputs.getAltKey()
editor.inputs.getCtrlKey()
editor.inputs.getAccelKey() // Cmd on Mac, Ctrl elsewhere
```

The `getAccelKey()` method provides cross-platform modifier detection, returning true for Command on macOS and Control on other platforms. This simplifies implementing standard shortcuts that work correctly across operating systems.

### Button tracking

The manager maintains a reactive set of currently pressed pointer buttons:

```typescript
editor.inputs.buttons.has(0) // Primary button
editor.inputs.buttons.has(2) // Secondary button
```

Buttons are identified by number (0 for primary, 1 for middle, 2 for secondary). The set adds buttons on pointer_down events and removes them on pointer_up events.

### Keyboard key tracking

The manager tracks pressed keyboard keys in a reactive set:

```typescript
editor.inputs.keys.has('Space')
editor.inputs.keys.has('ShiftLeft')
```

Keys add to the set on key_down and remove on key_up. This allows tools to detect key combinations and respond to held keys during pointer operations. The select tool, for example, detects when Space is held to temporarily activate the hand tool.

## Interaction state flags

The manager maintains boolean flags that describe the current interaction state:

```typescript
editor.inputs.getIsPointing() // Pointer button is down
editor.inputs.getIsDragging() // Pointer moved while pointing
editor.inputs.getIsPinching() // Two-finger pinch gesture
editor.inputs.getIsEditing() // Editing text or content
editor.inputs.getIsPanning() // Panning the canvas
editor.inputs.getIsSpacebarPanning() // Holding the spacebar to pan
```

The editor sets these flags through setter methods during event processing. For example, `isPointing` becomes true on pointer_down and false on pointer_up. The `isDragging` flag becomes true when the pointer moves beyond a drag distance threshold while pointing. The `isSpacebarPanning` flag distinguishes spacebar-initiated panning from other panning modes, allowing tools to respond appropriately.

## Event processing flow

When an input event occurs, the editor processes it through several stages:

1. The browser fires a native DOM event
2. The editor's UI layer captures the event
3. The editor transforms it into a typed event info object (`TLPointerEventInfo`, `TLKeyboardEventInfo`, or `TLWheelEventInfo`)
4. The editor calls `updateFromEvent()` on the `InputsManager` to update input state
5. The editor dispatches the event to the click manager for multi-click detection
6. The editor sends the event to the state machine via `root.handleEvent()`
7. The state machine propagates the event through active tool states

The `updateFromEvent()` method updates all position atoms, device flags, and velocity state from the incoming event. It calculates both screen and page coordinates from the event's point property, accounting for the canvas container's screen bounds and camera transformation.

In collaborative sessions, `updateFromEvent()` also updates the user's pointer presence record in the store, broadcasting pointer position to other users. The system skips updating the activity timestamp for synthetic pointer moves triggered by following another user's camera.

## Input normalization

The system normalizes input across different device types. Touch events convert to pointer events with appropriate properties, and the manager tracks the device type through the `isPen` flag.

Pointer positions include an optional z coordinate representing pressure or hover distance, defaulting to 0.5 for devices that don't report pressure. This ensures consistent values across all input types.

The normalization layer accounts for the canvas container's position in the document, allowing the system to work correctly in nested layouts and scrolled containers.

## State serialization

The manager provides a `toJson()` method for debugging and testing:

```typescript
const state = editor.inputs.toJson()
```

The serialized state includes all position vectors, modifier key states, interaction flags, device type, and the contents of the keys and buttons sets.

> We use this serialized form when generating a crash report.
