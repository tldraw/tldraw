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
---

## Overview

The input handling system manages pointer and keyboard state through the `InputsManager`. It tracks pointer positions in multiple coordinate spaces, button and key states, modifier keys, pointer velocity, and input device types. The system normalizes input across different devices (mouse, touch, pen) and provides reactive state that tools and shapes can query to understand current user interactions.

The `InputsManager` stores all input state as reactive atoms, making it efficient to read input state without triggering unnecessary updates. The system automatically updates pointer positions when events occur, converts between coordinate systems, calculates velocity for gesture detection, and maintains historical positions for delta calculations.

## Pointer position tracking

The `InputsManager` tracks pointer positions in two coordinate spaces: screen space and page space. Screen space represents pixels relative to the canvas container's origin, while page space represents coordinates in the infinite canvas coordinate system. The manager maintains current, previous, and origin positions in both spaces.

### Current and previous positions

The current position updates on every pointer move event, storing both screen and page coordinates:

```typescript
editor.inputs.getCurrentScreenPoint() // Current position in screen space
editor.inputs.getCurrentPagePoint()   // Current position in page space
```

The previous position stores the last pointer location before the most recent update. This enables delta calculations for dragging and panning operations:

```typescript
const delta = Vec.Sub(
  editor.inputs.getCurrentPagePoint(),
  editor.inputs.getPreviousPagePoint()
)
```

These positions update atomically during the `updateFromEvent()` method. The manager first saves the current positions to previous, then calculates new current positions from the incoming event. This ensures previous positions always represent the immediately prior state.

### Origin positions

Origin positions capture where the most recent pointer down event occurred. Tools use these to calculate drag distances and determine if an interaction has moved far enough to trigger certain behaviors:

```typescript
editor.inputs.getOriginPagePoint()   // Where pointer_down occurred (page space)
editor.inputs.getOriginScreenPoint() // Where pointer_down occurred (screen space)
```

The origin resets on every pointer_down event and during pinch gestures. This provides a stable reference point for the duration of a drag or gesture operation.

### Coordinate space conversion

The manager converts from screen space to page space using the camera's position and zoom. The conversion applies the camera transformation matrix to translate screen coordinates into the infinite canvas coordinate system:

```typescript
// Screen to page conversion (simplified)
const pageX = screenX / camera.z - camera.x
const pageY = screenY / camera.z - camera.y
```

The system validates converted coordinates to ensure they're finite before updating state. This prevents issues when extreme zoom levels or camera positions produce invalid coordinates.

## Pointer velocity

Pointer velocity tracks how fast the pointer is moving, measured in pixels per millisecond. The system calculates velocity in the tick manager using a linear interpolation approach that smooths out rapid changes:

```typescript
editor.inputs.getPointerVelocity() // Vec with x/y velocity components
```

Velocity updates occur on each tick rather than on each pointer event. This provides consistent velocity measurements regardless of event frequency. The `updatePointerVelocity()` method calculates the distance traveled since the last tick, derives a direction vector, and interpolates with the previous velocity using a 0.5 factor to smooth the result.

Tools use velocity for gesture detection. For example, the hand tool can distinguish between slow precise panning and fast flick gestures based on velocity magnitude. Very small velocity values (below 0.01) are clamped to zero to prevent jitter.

Velocity resets to zero on pointer_down events and during pinch gestures, ensuring each interaction starts with clean velocity state.

## Input device detection

The manager tracks whether the current input comes from a pen device versus mouse or touch:

```typescript
editor.inputs.getIsPen() // true for stylus/pen input
```

The system determines pen input from the pointer event's type property. This allows the editor to enable pen-specific behaviors, such as pen mode which ignores non-pen input to prevent accidental touch interactions when using a stylus.

Pen detection updates on every pointer event through the `updateFromEvent()` method, which checks the event's `isPen` flag and updates the reactive atom accordingly.

## Modifier keys and button states

The `InputsManager` tracks modifier key states (Shift, Alt, Ctrl, Meta) as reactive boolean atoms. Tools query these to modify behavior during interactions:

```typescript
editor.inputs.getShiftKey()  // Shift key pressed
editor.inputs.getAltKey()    // Alt/Option key pressed
editor.inputs.getCtrlKey()   // Ctrl/Cmd key pressed
editor.inputs.getMetaKey()   // Meta/Cmd key pressed
editor.inputs.getAccelKey()  // Platform's primary modifier (Cmd on Mac, Ctrl elsewhere)
```

The `getAccelKey()` method provides cross-platform modifier key detection, returning true for Command on macOS and Control on other platforms. This simplifies implementing standard shortcuts that work correctly across operating systems.

### Button tracking

The manager maintains a reactive set of currently pressed pointer buttons, identified by button number (0 for primary, 1 for middle, 2 for secondary):

```typescript
editor.inputs.buttons.has(0) // Primary button pressed
editor.inputs.buttons.has(2) // Secondary button pressed
```

Buttons add to the set on pointer_down events and remove on pointer_up events. The set provides an efficient way to check multiple button states simultaneously, which is useful for detecting combinations like middle-button panning.

### Keyboard key tracking

Similarly, the manager tracks pressed keyboard keys in a reactive set, indexed by key code:

```typescript
editor.inputs.keys.has('Space')    // Space key pressed
editor.inputs.keys.has('ShiftLeft') // Left shift key pressed
```

Keys add to the set on key_down and remove on key_up. This allows tools to detect key combinations and respond to held keys during pointer operations. For example, the select tool uses this to detect when Space is held for temporary hand tool activation.

## Interaction state flags

The manager maintains several boolean flags that describe the current interaction state. These flags help coordinate between different systems and ensure consistent behavior:

```typescript
editor.inputs.getIsPointing()   // Pointer button is down
editor.inputs.getIsDragging()   // User is dragging (pointer moved while pointing)
editor.inputs.getIsPanning()    // User is panning the canvas
editor.inputs.getIsSpacebarPanning() // Panning via spacebar
editor.inputs.getIsPinching()   // User is pinching (two-finger gesture)
editor.inputs.getIsEditing()    // User is editing text or other content
```

These flags update through setter methods called by the editor during event processing. The editor sets `isPointing` to true on pointer_down and false on pointer_up. It sets `isDragging` to true when the pointer moves beyond a drag distance threshold while pointing.

Panning flags distinguish between different panning modes. The editor sets `isPanning` for any panning operation, and additionally sets `isSpacebarPanning` when panning occurs via spacebar-held panning mode. This distinction allows tools to respond differently to explicit panning versus other interactions.

## Event processing flow

When a pointer, keyboard, or wheel event occurs, the editor processes it through several stages before dispatching to tools:

1. The browser fires a native DOM event
2. The event handler in the editor's UI layer captures it
3. The editor transforms the event into a `TLPointerEventInfo`, `TLKeyboardEventInfo`, or `TLWheelEventInfo`
4. The editor calls `updateFromEvent()` on the `InputsManager` to update input state
5. The editor dispatches the event to the click manager for multi-click detection
6. The editor sends the event to the state machine via `root.handleEvent()`
7. The state machine propagates the event through active tool states

The `updateFromEvent()` method updates all position atoms, device flags, and velocity state from the incoming event. It calculates both screen and page coordinates from the event's point property, accounting for the canvas container's screen bounds and camera transformation.

For collaborative sessions, `updateFromEvent()` also updates the user's pointer presence record in the store. This broadcasts pointer position to other users in real-time. The system skips updating the activity timestamp for synthetic pointer moves triggered by following another user's camera.

## Input normalization

The system normalizes input across different device types to provide consistent behavior. Touch events convert to pointer events with appropriate properties. The manager tracks whether each event comes from a pen device and stores this in the `isPen` flag.

Pointer positions include an optional z coordinate representing pressure or hover distance. The system defaults this to 0.5 for devices that don't report pressure, ensuring consistent values across all input types.

The normalization layer handles differences in coordinate systems between browsers and devices. Screen bounds account for the canvas container's position in the document, allowing the system to work correctly in nested layouts and scrolled containers.

## State serialization

The `InputsManager` provides a `toJson()` method that serializes the complete input state. This is primarily used for debugging and testing:

```typescript
const state = editor.inputs.toJson()
// Returns object with all positions, flags, keys, and buttons
```

The serialized state includes all position vectors, modifier key states, interaction flags, device type, and the contents of the keys and buttons sets. This provides a complete snapshot of input state at any moment.

## Key files

- packages/editor/src/lib/editor/managers/InputsManager/InputsManager.ts - Input state management and position tracking
- packages/editor/src/lib/editor/types/event-types.ts - Event type definitions and handler interfaces
- packages/editor/src/lib/editor/Editor.ts - Event processing and dispatch (see dispatch method around line 10280)
- packages/editor/src/lib/primitives/Vec.ts - Vector operations for position calculations

## Related

- [Click detection](./click-detection.md)
- [Coordinate systems](./coordinate-systems.md)
- [Tick system](./tick-system.md)
- [Camera system](./camera-system.md)
