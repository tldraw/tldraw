# Hand tool

This document describes the requirements for the hand tool, which allows users to pan and navigate the infinite canvas. It covers the dedicated hand tool, spacebar panning, middle mouse button panning, momentum/inertia after release, zoom gestures via multi-click, and arrow key viewport navigation.

## Overview

The hand tool provides camera panning — moving the visible viewport across the canvas without affecting any shapes or other content. It is the primary navigation mechanism alongside scroll/pinch gestures.

Panning can be activated in three ways:

1. **Selecting the hand tool** as the active tool
2. **Holding the spacebar** while any other tool is active (temporary panning overlay)
3. **Pressing the middle mouse button** while any tool is active

All three methods produce the same core panning behavior: the canvas moves under the pointer as the user drags, and releasing with momentum produces an inertial slide.

## Dedicated hand tool

### State machine

The hand tool operates as a three-state machine:

```
idle → pointing → dragging
```

#### Idle

- **Cursor**: Open hand ("grab")
- **Pointer down**: Transition to **pointing**
- **Cancel**: Return to the default selection tool (the hand tool is dismissed)
- **Interrupt**: No effect (remain in idle)

#### Pointing

The pointing state is a brief transitional state between idle and dragging. The user has pressed down but has not yet moved far enough to constitute a drag.

- **Cursor**: Closed hand ("grabbing")
- **On enter**: Stop any in-progress camera animation (e.g., an inertial slide from a previous pan)
- **Pointer move (beyond drag threshold)**: Transition to **dragging**
- **Long press**: Transition to **dragging** (even without movement)
- **Pointer up**: Transition back to **idle** (a click without drag)
- **Cancel / Complete / Interrupt**: Transition back to **idle**

#### Dragging

The dragging state actively moves the camera as the pointer moves.

- **On enter**: Record the camera position at the start of the drag
- **Pointer move**: Update the camera position (see [Camera movement calculation](#camera-movement-calculation))
- **Pointer up**: Complete the drag — apply inertia if applicable, transition to **idle** (see [Momentum and inertia](#momentum-and-inertia))
- **Cancel**: Transition to **idle** (no inertia applied)
- **Complete**: Same as pointer up (with inertia)

### Not lockable

The hand tool cannot be "locked" as the persistent tool. It is a transient navigation tool — after use, the user is expected to return to another tool. Cancel while idle returns to the default selection tool.

### Camera movement calculation

While dragging, the camera position is computed by:

1. Taking the vector from the **original pointer-down screen position** to the **current screen position**
2. Dividing that vector by the **current zoom level** to convert from screen pixels to canvas units
3. Adding the result to the **camera position recorded at the start of the drag**

This means the canvas follows the pointer exactly: the point under the cursor when the drag started stays under the cursor throughout the drag, regardless of zoom level.

The delta is computed against the original pointer-down position (not the previous frame), which prevents accumulation of floating-point errors during long drags.

## Spacebar panning

Spacebar panning is a temporary panning mode that overlays on top of whatever tool is currently active. It allows users to pan without switching away from their current tool.

### Activation

- **Spacebar down** (when Ctrl/Cmd is **not** held): Activate panning mode
- The spacebar panning feature can be disabled via configuration (default: enabled)
- If Ctrl/Cmd is held when spacebar is pressed, panning is **not** activated (this avoids conflict with keyboard shortcuts)

### Behavior while active

- **Cursor**: Open hand ("grab") when pointer is up; closed hand ("grabbing") when pointer is down
- **Pointer events are intercepted**: While spacebar panning is active, pointer events (down, move, up) are consumed by the panning system and are **not** forwarded to the current tool's state machine. This prevents the underlying tool from reacting to the pointer (e.g., shapes will not be selected or moved)
- **Pointer down**: Begin panning, stop any in-progress camera animation
- **Pointer move** (while pointer is down): Pan the camera by the screen-space delta between the current and previous pointer positions, divided by the zoom level
- **Pointer up**: End the pan stroke, apply inertia if velocity exceeds the threshold (see [Momentum and inertia](#momentum-and-inertia))

### Deactivation

- **Spacebar up**: Deactivate panning mode, restore the previous cursor
- **Exception**: If the middle mouse button is still held when the spacebar is released, panning continues (the middle mouse button takes over)

### Arrow key navigation

While the spacebar is held, the arrow keys perform viewport-sized jumps:

- **Arrow Right**: Move the viewport one full viewport width to the right
- **Arrow Left**: Move the viewport one full viewport width to the left
- **Arrow Down**: Move the viewport one full viewport height downward
- **Arrow Up**: Move the viewport one full viewport height upward

These jumps are animated (default animation duration: 320ms). The distance of each jump equals the current viewport dimensions in page coordinates — pressing right twice moves the view by exactly two screens.

### Interaction with ongoing pointer operations

If the spacebar is pressed while the pointer is already down (e.g., the user is mid-drag on a shape), panning mode activates immediately. Subsequent pointer movement pans the camera rather than continuing the shape interaction. The shape is not affected.

## Middle mouse button panning

Middle mouse button (button 1) panning works identically to spacebar panning but is activated by the mouse button rather than a keyboard key.

### Activation

- **Middle mouse button down**: Activate panning mode
- This works regardless of the currently active tool
- This works regardless of what is under the pointer (including shapes)

### Behavior

- **Cursor**: Closed hand ("grabbing") while the middle button is held
- Camera movement follows the same delta-based calculation as spacebar panning (current minus previous screen point, divided by zoom level)
- On release, inertia is applied if velocity exceeds the threshold

### Deactivation

- **Middle mouse button up**: End panning
  - If the spacebar is still held, the cursor changes to open hand ("grab") and spacebar panning continues
  - If the spacebar is not held, panning deactivates and the cursor reverts to its state prior to the middle mouse press

### Interaction between spacebar and middle mouse button

Spacebar and middle mouse button panning can overlap:

- If spacebar panning is already active and the middle button is pressed, panning continues uninterrupted
- If middle button panning is active and the spacebar is pressed, panning continues
- If the spacebar is released while the middle button is still held, panning continues (middle button takes priority)
- If the middle button is released while the spacebar is still held, panning continues (spacebar takes over)
- Panning only fully deactivates when **both** the spacebar is released **and** the middle button is released

## Momentum and inertia

When the user releases the pointer after panning (via any method — hand tool, spacebar, or middle mouse button), the camera may continue to slide in the direction of movement. This creates a natural, physics-like feel.

### Velocity tracking

The system tracks pointer velocity continuously:

- Velocity is updated on every animation frame (not on every pointer event)
- The velocity is **smoothed** using linear interpolation (50% blend between the previous velocity and the newly computed velocity each frame)
- The velocity vector represents pixels per millisecond in screen space
- On pointer down, velocity is reset to zero
- Very small velocity values (components less than 0.01 pixels/ms) are clamped to zero to prevent jitter

### Slide trigger

When the pointer is released:

1. The current pointer velocity vector is captured
2. The speed (magnitude of velocity) is capped at a maximum of **2 pixels/ms**
3. If the speed exceeds **0.1 pixels/ms**, a camera slide animation begins
4. If the speed is 0.1 or below, no slide occurs — the camera stops immediately

For spacebar/middle-button panning, the speed threshold is slightly different: the slide is triggered if the speed is greater than **0 pixels/ms** (any nonzero velocity).

### Slide physics

The camera slide uses a friction-based decay model:

- Each animation frame, the camera moves in the slide direction by: `speed * elapsed_time / zoom_level`
- After each frame, the speed is reduced by friction: `speed = speed * (1 - friction)`
- The default friction coefficient is **0.09** (configurable)
- When the speed falls below a threshold of **0.01 pixels/ms**, the slide stops

This produces an exponential decay curve — the camera decelerates smoothly and comes to rest. Higher friction values make the camera stop sooner; lower values make it glide farther.

### Cancellation

- Any new pointer down (starting a new pan) stops the current slide animation
- Entering the pointing state of the hand tool stops any in-progress camera animation

### Locked camera

If the camera is locked (via camera options), the slide is suppressed entirely.

### Animation speed

If the user's animation speed preference is set to 0 (animations disabled), the slide is suppressed.

## Zoom gestures

The hand tool responds to multi-click events (as produced by the [click detection](./click-detection.md) system) to provide quick zoom controls. These gestures only apply when the **hand tool is the active tool** (not during spacebar or middle-mouse panning).

All zoom gestures activate on the **settle** phase of the corresponding click event — meaning they fire only after the system has confirmed no further click is coming.

### Double click — zoom in

- Zooms in by one step (e.g., from 100% to 200%)
- Zooms toward the current pointer position
- Animated over **220ms** with an ease-out-quint easing curve

### Triple click — zoom out

- Zooms out by one step (e.g., from 100% to 50%)
- Zooms from the current pointer position
- Animated over **320ms** with an ease-out-quint easing curve

### Quadruple click — reset or zoom to fit

The behavior depends on the current zoom level:

- **If zoom is not at 100%**: Reset zoom to 100%, centered on the current pointer position. Animated over **320ms** with ease-out-quint.
- **If zoom is already at 100%**: Zoom to fit all content in the viewport. Animated over **400ms** with ease-out-quint.

This provides a natural "reset" gesture — quadruple clicking always brings you back to a useful default view.

## Cursor behavior summary

| Context | Pointer up | Pointer down / dragging |
|---|---|---|
| Hand tool idle | Grab (open hand) | Grabbing (closed hand) |
| Hand tool pointing/dragging | — | Grabbing (closed hand) |
| Spacebar panning | Grab (open hand) | Grabbing (closed hand) |
| Middle mouse panning | — | Grabbing (closed hand) |

When panning mode deactivates, the cursor reverts to whatever it was before panning was activated.

## Coordinate systems

All panning calculations work in two coordinate systems:

- **Screen space** (pixels): Where the pointer physically is on screen. Pointer deltas are measured in screen pixels.
- **Page/canvas space** (canvas units): Where things are positioned on the infinite canvas. Camera position is in canvas units.

To convert a screen-space movement to a canvas-space camera offset, divide by the current zoom level. This ensures that panning at 200% zoom moves the canvas half as much per pixel of pointer movement, keeping the content locked under the pointer.

## Configurable parameters summary

| Parameter | Default | Description |
|---|---|---|
| Spacebar panning enabled | true | Whether spacebar activates panning mode |
| Camera slide friction | 0.09 | Friction coefficient for inertial slide decay |
| Slide speed threshold | 0.01 px/ms | Speed below which the slide animation stops |
| Slide trigger threshold (hand tool) | 0.1 px/ms | Minimum release speed to trigger a slide |
| Maximum slide speed | 2 px/ms | Speed is capped at this value on release |
| Drag distance (fine pointer) | 4 px | Movement threshold to transition from pointing to dragging |
| Drag distance (coarse pointer) | 6 px | Movement threshold for touch devices |
| Long press duration | 500 ms | Hold duration to transition from pointing to dragging without movement |
| Double click zoom-in animation | 220 ms | Duration of the zoom-in animation |
| Triple click zoom-out animation | 320 ms | Duration of the zoom-out animation |
| Quadruple click reset animation | 320 ms | Duration of the zoom-reset animation |
| Quadruple click zoom-to-fit animation | 400 ms | Duration of the zoom-to-fit animation |
| Arrow key navigation animation | 320 ms | Duration of viewport jump animations |

## Design rationale

- **Three activation methods**: Different users prefer different panning methods. The dedicated tool suits tablet/touch users; spacebar suits keyboard-heavy workflows; middle mouse suits users with three-button mice. All three converge on the same experience.
- **Spacebar as overlay, not tool switch**: Spacebar panning does not change the active tool. This means a user in the middle of drawing can quickly pan and continue drawing without losing their tool state.
- **Event interception during spacebar panning**: Pointer events are consumed by the panning system and not forwarded to the active tool. This prevents accidental shape interactions while navigating.
- **Momentum with friction**: The inertial slide gives panning a natural, physical feel. The friction model ensures the camera always comes to rest and doesn't slide indefinitely.
- **Velocity smoothing**: Using a lerp-based average (rather than instantaneous velocity) prevents jerky camera slides caused by uneven pointer event timing.
- **Settle-phase zoom gestures**: Zooming on the settle phase (rather than down or up) ensures the user has finished their click sequence before a zoom animation begins. This prevents disorienting zoom changes mid-click.
- **Quadruple click as reset**: The zoom-in / zoom-out / reset progression through double / triple / quadruple click provides a complete zoom control vocabulary accessible purely through clicking.
- **Camera animation stopping on new interaction**: Starting a new pan always cancels any in-progress slide. This ensures the user has immediate control and the camera never fights against their input.
- **Consecutive distance between clicks for zoom gestures**: The click detection system (described in [click-detection.md](./click-detection.md)) handles the spatial and temporal constraints for multi-click recognition. The hand tool simply responds to the resulting events.
