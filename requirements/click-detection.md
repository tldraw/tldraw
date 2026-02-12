# Click detection

This document describes the requirements for detecting single clicks, double clicks, triple clicks, and quadruple clicks from raw pointer events. The goal is to produce a consistent, responsive multi-click detection experience that works across both fine (mouse) and coarse (touch) input devices.

## Overview

The system converts a stream of low-level pointer events (pointer down, pointer up, pointer move) into higher-level click events (double click, triple click, quadruple click). It does this by tracking a sequence of rapid, spatially-close clicks and emitting semantic click events when thresholds are met.

A single click does not produce a dedicated click event — it is represented by the underlying pointer down and pointer up events alone. Multi-click events (double, triple, quadruple) are emitted as _additional_ events alongside the pointer events, not as replacements for them.

## Recognized click levels

The system recognizes four levels of clicking:

| Level | Clicks | Description |
|---|---|---|
| Single click | 1 | A lone click with no rapid follow-up |
| Double click | 2 | Two clicks in quick succession |
| Triple click | 3 | Three clicks in quick succession |
| Quadruple click | 4 | Four clicks in quick succession |

Clicks beyond the fourth (5+) are treated as **overflow** and do not produce any additional click events. After an overflow, the sequence must fully reset before new multi-clicks can be detected.

## Event phases

Each multi-click event (double, triple, quadruple) has three phases:

- **Down**: Emitted at the moment the pointer goes down for the Nth click. This is the earliest signal that a multi-click is occurring.
- **Up**: Emitted when the pointer is released after the Nth click.
- **Settle**: Emitted after a timeout when no further click follows. This confirms that the multi-click sequence has ended at the current level and will not advance further.

Single clicks do not have their own down/up/settle click events. Overflow clicks do not produce any click events or settle events.

## Timing

Two configurable timeout durations govern the detection windows:

### Double click duration (default: 450ms)

This is the maximum time allowed between the first click and the second click for a double click to be recognized. It applies to:

- The window after the first pointer-down, during which a second pointer-down will count as a double click.

### Multi-click duration (default: 200ms)

This is the maximum time allowed between subsequent clicks _after_ a double click has already been recognized. It applies to:

- The window after a double click, during which a third pointer-down will count as a triple click.
- The window after a triple click, during which a fourth pointer-down will count as a quadruple click.
- The window after a quadruple click, during which a fifth click would enter overflow.

The double click window is intentionally longer than the multi-click window. Users need more time to initiate a double click than to continue an already-established rapid clicking pattern.

### Settle timing

When a multi-click timeout expires without a subsequent click, a **settle** event is emitted for the most recent multi-click level, and the system resets to idle. For example:

- If a double click occurs and no third click arrives within the multi-click duration, a double click settle event is emitted.
- If a triple click occurs and no fourth click arrives within the multi-click duration, a triple click settle event is emitted.
- If a quadruple click occurs and no fifth click arrives within the multi-click duration, a quadruple click settle event is emitted.

Single clicks never produce a settle event. When the pending-double timeout expires without a second click, the system silently returns to idle.

Overflow states never produce a settle event. The system silently returns to idle.

## Spatial constraints

### Maximum distance between successive clicks (default: 40px)

Each new click in a sequence is compared against the **previous** click's position (not the first click in the sequence). If the distance between consecutive clicks exceeds the maximum click distance, the entire click sequence resets and the new click is treated as the start of a fresh sequence.

This means a user can "drift" across the screen through a series of small steps, as long as no single step exceeds 40 pixels. The distance is measured in screen coordinates (pixels), not canvas/document coordinates.

### Drag cancellation

If the pointer moves too far from where it went down _during_ a click (i.e., between pointer-down and pointer-up, or while waiting for the next click), the click sequence is cancelled and the system resets to idle. The distance threshold depends on the input device type:

- **Fine pointer** (mouse, stylus): 4 pixels (default)
- **Coarse pointer** (touch): 6 pixels (default)

The drag distance is measured from the point where the most recent pointer-down occurred to the pointer's current position. This check is performed on every pointer-move event while a click sequence is active.

This check is not performed when the system is idle (no click sequence in progress).

## State machine

The click detector operates as a state machine with the following states:

```
idle → pendingDouble → pendingTriple → pendingQuadruple → pendingOverflow → overflow
```

### State transitions

**Idle**
- On pointer-down: Transition to **pendingDouble**. Start the double-click timeout. No click event is emitted.

**PendingDouble**
- On pointer-down (within timeout and distance): Transition to **pendingTriple**. Emit **double click down**. Start the multi-click timeout.
- On pointer-up: No click event emitted (the pointer-up is passed through as-is).
- On timeout: Return to **idle**. No settle event.
- On drag (pointer moved beyond drag threshold): Return to **idle**.

**PendingTriple**
- On pointer-down (within timeout and distance): Transition to **pendingQuadruple**. Emit **triple click down**.Start the multi-click timeout.
- On pointer-up: Emit **double click up**.
- On timeout: Emit **double click settle**. Return to **idle**.
- On drag (pointer moved beyond drag threshold): Return to **idle**.

**PendingQuadruple**
- On pointer-down (within timeout and distance): Transition to **pendingOverflow**. Emit **quadruple click down**. Start the multi-click timeout.
- On pointer-up: Emit **triple click up**.
- On timeout: Emit **triple click settle**. Return to **idle**.
- On drag (pointer moved beyond drag threshold): Return to **idle**.

**PendingOverflow**
- On pointer-down (within timeout and distance): Transition to **overflow**. No click event emitted. Start timeout.
- On pointer-up: Emit **quadruple click up**.
- On timeout: Emit **quadruple click settle**. Return to **idle**.
- On drag (pointer moved beyond drag threshold): Return to **idle**.

**Overflow**
- On pointer-down: Remain in **overflow**. No click event emitted.
- On pointer-up: No click event emitted.
- On timeout: Return to **idle**. No settle event.

### Distance-based reset

Before any state transition on pointer-down, the system checks whether the new click is within the maximum click distance of the previous click. If it is not, the state is reset to **idle** first, and the pointer-down is then processed from the idle state. This means a spatially distant click always starts a new sequence.

## Event sequence examples

### Single click

```
pointer_down
pointer_up
[450ms timeout expires — silent reset to idle]
```

### Double click

```
pointer_down                          ← 1st click
pointer_up
pointer_down                          ← 2nd click
  → double_click (down)
pointer_up
  → double_click (up)
[200ms timeout expires]
  → double_click (settle)
```

### Triple click

```
pointer_down                          ← 1st click
pointer_up
pointer_down                          ← 2nd click
  → double_click (down)
pointer_up
  → double_click (up)
pointer_down                          ← 3rd click
  → triple_click (down)
pointer_up
  → triple_click (up)
[200ms timeout expires]
  → triple_click (settle)
```

### Quadruple click

```
pointer_down                          ← 1st click
pointer_up
pointer_down                          ← 2nd click
  → double_click (down)
pointer_up
  → double_click (up)
pointer_down                          ← 3rd click
  → triple_click (down)
pointer_up
  → triple_click (up)
pointer_down                          ← 4th click
  → quadruple_click (down)
pointer_up
  → quadruple_click (up)
[200ms timeout expires]
  → quadruple_click (settle)
```

### Overflow (5+ clicks)

```
pointer_down                          ← 1st click
pointer_up
pointer_down                          ← 2nd click
  → double_click (down)
pointer_up
  → double_click (up)
pointer_down                          ← 3rd click
  → triple_click (down)
pointer_up
  → triple_click (up)
pointer_down                          ← 4th click
  → quadruple_click (down)
pointer_up
  → quadruple_click (up)
pointer_down                          ← 5th click (overflow)
pointer_up
[no settle event]
```

### Cancelled by movement

```
pointer_down                          ← 1st click
pointer_up
pointer_down                          ← 2nd click, far from 1st (>40px)
  [sequence resets — treated as new 1st click]
pointer_up
```

### Cancelled by drag

```
pointer_down                          ← 1st click
pointer_up
pointer_down                          ← 2nd click
  → double_click (down)
pointer_move                          ← moved >4px from pointer-down position
  [sequence cancelled — reset to idle]
```

## Configurable parameters summary

| Parameter | Default | Description |
|---|---|---|
| Double click duration | 450ms | Maximum time between 1st and 2nd click |
| Multi-click duration | 200ms | Maximum time between subsequent clicks (3rd, 4th, 5th) |
| Maximum click distance | 40px | Maximum distance between consecutive clicks in a sequence |
| Fine pointer drag distance | 4px | Movement threshold to cancel a click sequence (mouse/stylus) |
| Coarse pointer drag distance | 6px | Movement threshold to cancel a click sequence (touch) |

## Design rationale

- **Down phase emitted immediately**: Multi-click events are emitted on pointer-down, not on pointer-up. This allows the application to respond as early as possible (e.g., starting a text selection on double-click down rather than waiting for the full up).
- **Longer first window, shorter subsequent windows**: The initial double-click window (450ms) is generous to accommodate varied user speeds. Once a multi-click sequence is established, the subsequent windows (200ms) are shorter because a user already in a rapid-click pattern will click faster.
- **Cumulative multi-click events**: The system emits double click events on click 2, triple click events on click 3, and quadruple click events on click 4. A triple click _includes_ a prior double click in its event history. This allows consumers to respond to each level independently.
- **Settle as confirmation**: The settle phase lets consumers know that a multi-click has definitively ended. This is useful for operations that should only happen once the user has stopped clicking (e.g., finalizing a text selection range).
- **Overflow as a safety valve**: Rather than emitting increasingly exotic click events for 5+ clicks, the system caps at quadruple click and absorbs further clicks silently. This prevents accidental activation of deeply nested behaviors.
- **Consecutive distance, not origin distance**: The distance check compares each click to its immediate predecessor, not to the first click in the sequence. This allows natural hand drift during rapid clicking, especially on touch devices.
