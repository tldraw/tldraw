---
title: Pinch gesture disambiguation - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - pinch
  - gesture
status: published
date: 12/21/2025
order: 3
---

# Pinch gesture disambiguation: raw notes

Internal research notes for the pinch-gesture.md article.

## Core problem

Two-finger touch gestures are ambiguous: the same initial input can be either panning (dragging) or zooming (pinching). Both gestures start identically with two touch points.

**Why handling both simultaneously fails:**

- Minor finger drift during pan → accidental zoom triggers
- Minor spacing changes during zoom → accidental pan triggers
- Zooming is expensive: triggers shape re-rendering, LOD (level of detail) changes, text recalculation
- Panning is cheap: only moves the camera position
- Misclassifying pan as zoom makes a cheap operation expensive and janky

## Solution: State machine with deferred decision

Located in `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/hooks/useGestureEvents.ts`

### State machine implementation

**Three states:**

```typescript
let pinchState = 'not sure' as 'not sure' | 'zooming' | 'panning'
```

Line 82 in useGestureEvents.ts

**State transitions:**

- Start: `not sure`
- `not sure` → `zooming`: when touchDistance > 24px
- `not sure` → `panning`: when originDistance > 16px
- `panning` → `zooming`: when touchDistance > 64px
- `zooming` → (stays zooming): no transition back to panning

Lines 191-208 in updatePinchState function

### Measurement calculations

**Key tracked variables:**

```typescript
let initDistanceBetweenFingers = 1 // Line 136
let initZoom = 1 // Line 137
let currDistanceBetweenFingers = 0 // Line 138
const initPointBetweenFingers = new Vec() // Line 139
const prevPointBetweenFingers = new Vec() // Line 140
```

**Two metrics reveal user intent:**

1. **Touch distance** - How far the fingers have moved apart or together:

```typescript
const touchDistance = Math.abs(currDistanceBetweenFingers - initDistanceBetweenFingers)
```

Line 187

2. **Origin distance** - How far the midpoint between fingers has traveled:

```typescript
const originDistance = Vec.Dist(initPointBetweenFingers, prevPointBetweenFingers)
```

Line 189

### Threshold values

**Initial detection thresholds:**

- Zoom threshold: 24 pixels of finger separation change (line 193)
- Pan threshold: 16 pixels of midpoint movement (line 195)

**Transition from panning to zooming:**

- Higher threshold: 64 pixels of finger separation (line 202)
- Prevents accidental transitions from small finger movements during pan

**Why these specific values:**
Tuned empirically. Trade-offs:

- Too sensitive → accidental drift triggers wrong gesture
- Too loose → gestures feel unresponsive
- Current values: confident gestures resolve in 1-2 frames, tentative movements wait longer

### Asymmetric transitions

**Panning can become zooming:**

```typescript
case 'panning': {
    if (touchDistance > 64) {
        pinchState = 'zooming'
    }
    break
}
```

Lines 200-205

When user starts panning then spreads fingers → they changed their mind, now want to zoom.

**Zooming never becomes panning:**

```typescript
case 'zooming': {
    return  // No state change logic
}
```

Lines 177-179

Comment in code (lines 40-42):

```
In the "zooming" state, we just stay zooming—it's not YET possible to switch back to panning.
todo: compare velocities of change in order to determine whether the user has switched back to panning
```

Rationale: Zoom operations can handle both distance and position changes simultaneously, so no need to switch states.

## Safari trackpad special handling

**Platform differences:**

- Desktop Safari trackpad: `gesturechange` and `gestureend` events
- iOS Safari touch screen: Standard touch events with multiple touches
- Desktop Safari trackpad pinch is ALWAYS zoom (can't pan with two-finger pinch on trackpad)

**Detection and handling:**

```typescript
const isSafariTrackpadPinch = gesture.type === 'gesturechange' || gesture.type === 'gestureend'

if (isSafariTrackpadPinch) {
	pinchState = 'zooming' // Skip "not sure" state
}
```

Lines 220-225, 172-175

Safari trackpad gestures bypass the state machine and go directly to zooming.

## Gesture library integration

**@use-gesture library:**

- Provides unified gesture handling across browsers
- Source: `@use-gesture/react`
- Actions used: `wheelAction`, `pinchAction`
  Lines 1-2, 50

**Pinch gesture data structure:**
From gesture parameter object:

- `event`: The raw browser event (TouchEvent or GestureEvent)
- `origin`: `[x, y]` - Current midpoint between touch points
- `da`: `[distance, angle]` - Current distance and angle between touches
- `offset`: `[scale, angle]` - Cumulative scale and rotation offsets

**Configuration:**

```typescript
useGesture(events, {
	target: ref,
	eventOptions: { passive: false },
	pinch: {
		from: () => {
			const { zoomSpeed } = editor.getCameraOptions()
			const level = editor.getZoomLevel() ** (1 / zoomSpeed)
			return [level, 0]
		},
		scaleBounds: () => {
			const baseZoom = editor.getBaseZoom()
			const { zoomSteps, zoomSpeed } = editor.getCameraOptions()
			const zoomMin = zoomSteps[0] * baseZoom
			const zoomMax = zoomSteps[zoomSteps.length - 1] * baseZoom
			return {
				max: zoomMax ** (1 / zoomSpeed),
				min: zoomMin ** (1 / zoomSpeed),
			}
		},
	},
})
```

Lines 307-328

## Event dispatching

### Pinch start event

```typescript
editor.dispatch({
	type: 'pinch',
	name: 'pinch_start',
	point: { x: origin[0], y: origin[1], z: editor.getZoomLevel() },
	delta: { x: 0, y: 0 },
	shiftKey: event.shiftKey,
	altKey: event.altKey,
	ctrlKey: event.metaKey || event.ctrlKey,
	metaKey: event.metaKey,
	accelKey: isAccelKey(event),
})
```

Lines 158-168

### Pinch (zooming state)

```typescript
case 'zooming': {
    const currZoom = offset[0] ** editor.getCameraOptions().zoomSpeed

    editor.dispatch({
        type: 'pinch',
        name: 'pinch',
        point: { x: origin[0], y: origin[1], z: currZoom },
        delta: { x: dx, y: dy },
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        ctrlKey: event.metaKey || event.ctrlKey,
        metaKey: event.metaKey,
        accelKey: isAccelKey(event),
    })
    break
}
```

Lines 240-254

Zoom calculation: `offset[0] ** zoomSpeed`

- offset[0] is the cumulative scale from @use-gesture
- zoomSpeed defaults to 1 (line 9 in constants.ts)
- Exponentiation allows non-linear zoom response

### Pinch (panning state)

```typescript
case 'panning': {
    editor.dispatch({
        type: 'pinch',
        name: 'pinch',
        point: { x: origin[0], y: origin[1], z: initZoom },
        delta: { x: dx, y: dy },
        // ... modifier keys
    })
    break
}
```

Lines 256-268

Key difference: Uses `initZoom` (zoom when pinch started) rather than `currZoom`, so no zoom change occurs during panning.

### Delta calculation

```typescript
const dx = origin[0] - prevPointBetweenFingers.x
const dy = origin[1] - prevPointBetweenFingers.y

prevPointBetweenFingers.x = origin[0]
prevPointBetweenFingers.y = origin[1]
```

Lines 231-235

Delta represents frame-to-frame movement of the midpoint between fingers.

### Pinch end event

```typescript
const scale = offset[0] ** editor.getCameraOptions().zoomSpeed

pinchState = 'not sure' // Reset state

editor.timers.requestAnimationFrame(() => {
	editor.dispatch({
		type: 'pinch',
		name: 'pinch_end',
		point: { x: origin[0], y: origin[1], z: scale },
		delta: { x: origin[0], y: origin[1] },
		// ... modifier keys
	})
})
```

Lines 280-296

State resets to "not sure" after gesture ends (line 282).

## Editor pinch event handling

Located in `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/editor/Editor.ts`

### Camera locking check

```typescript
case 'pinch': {
    if (cameraOptions.isLocked) return
    // ...
}
```

Lines 10332-10333

If camera is locked, all pinch events are ignored.

### Pinch start handling

```typescript
case 'pinch_start': {
    if (inputs.getIsPinching()) return

    if (!inputs.getIsEditing()) {
        if (!this._selectedShapeIdsAtPointerDown.length) {
            this._selectedShapeIdsAtPointerDown = [...pageState.selectedShapeIds]
        }
        if (this.getInstanceState().isCoarsePointer) {
            inputs.setIsPinching(true)
            return
        }
        this.interrupt()
    }

    return // Stop here!
}
```

Lines 10338-10353

- Sets `isPinching` flag to true
- Stores selected shape IDs
- Calls `interrupt()` to cancel current tool operation

### Pinch (during) handling

```typescript
case 'pinch': {
    if (!inputs.getIsPinching()) return

    const {
        point: { z = 1 },
        delta: { x: dx, y: dy },
    } = info

    const { x: cx, y: cy, z: cz } = this.getCamera()

    this.setCamera(
        {
            x: cx + dx / cz - (z - cz) * (info.point.x / cz - cx),
            y: cy + dy / cz - (z - cz) * (info.point.y / cz - cy),
            z,
        },
        { immediate: true }
    )

    return // Stop here!
}
```

Lines 10355-10387

**Camera calculation breakdown:**

Pan component:

- `dx / cz` - Delta x normalized by current zoom
- `dy / cz` - Delta y normalized by current zoom

Zoom component (keeps pinch point stable):

- `(z - cz)` - Change in zoom level
- `(info.point.x / cz - cx)` - Distance from camera to pinch point in x
- `(z - cz) * (info.point.x / cz - cx)` - Camera offset needed to keep pinch point stable

The formula ensures the point under the user's fingers stays in the same screen position during zoom.

### Pinch end handling

```typescript
case 'pinch_end': {
    if (!inputs.getIsPinching()) return this

    // Stop pinching
    inputs.setIsPinching(false)
    // ...
}
```

Lines 10389-10393

Clears the `isPinching` flag.

## Vector math utilities

Located in `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/primitives/Vec.ts`

### Vec.Dist - Euclidean distance

```typescript
static Dist(A: VecLike, B: VecLike): number {
    return ((A.y - B.y) ** 2 + (A.x - B.x) ** 2) ** 0.5
}
```

Lines 317-319

Standard distance formula: √((x₂-x₁)² + (y₂-y₁)²)

### Vec.Sub - Vector subtraction

```typescript
static Sub(A: VecLike, B: VecLike): Vec {
    return new Vec(A.x - B.x, A.y - B.y)
}
```

Lines 269-271

### Vec.Average - Midpoint of multiple points

```typescript
static Average(arr: VecLike[]) {
    const len = arr.length
    const avg = new Vec(0, 0)
    if (len === 0) {
        return avg
    }
    for (let i = 0; i < len; i++) {
        avg.add(arr[i])
    }
    return avg.div(len)
}
```

Lines 575-584

Sum all points, divide by count.

## Camera options and zoom configuration

Located in `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/constants.ts`

### Default camera options

```typescript
export const DEFAULT_CAMERA_OPTIONS: TLCameraOptions = {
	isLocked: false,
	wheelBehavior: 'pan',
	panSpeed: 1,
	zoomSpeed: 1,
	zoomSteps: [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8],
}
```

Lines 5-11

**zoomSpeed:**

- Default: 1
- Controls non-linearity of zoom response
- Used as exponent: `offset ** zoomSpeed`

**zoomSteps:**

- Discrete zoom levels for zoom-in/zoom-out buttons
- First value (0.05) = min zoom (5%)
- Last value (8) = max zoom (800%)
- Editor constrains pinch zoom to these bounds

### Camera options type definition

Located in `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/editor/types/misc-types.ts`

```typescript
export interface TLCameraOptions {
	/** Whether the camera is locked. */
	isLocked: boolean
	/** The speed of a scroll wheel / trackpad pan. Default is 1. */
	panSpeed: number
	/** The speed of a scroll wheel / trackpad zoom. Default is 1. */
	zoomSpeed: number
	/** The steps that a user can zoom between with zoom in / zoom out.
        The first and last value will determine the min and max zoom. */
	zoomSteps: number[]
	/** Controls whether the wheel pans or zooms. */
	wheelBehavior: 'zoom' | 'pan' | 'none'
	/** The camera constraints. */
	constraints?: TLCameraConstraints
}
```

Lines 93-111

## Event types

Located in `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/editor/types/event-types.ts`

### TLPinchEventInfo type

```typescript
export type TLPinchEventInfo = TLBaseEventInfo & {
	type: 'pinch'
	name: TLPinchEventName
	point: VecModel
	delta: VecModel
}
```

Lines 85-90

### TLPinchEventName type

```typescript
export type TLPinchEventName = 'pinch_start' | 'pinch' | 'pinch_end'
```

Line 28

### TLBaseEventInfo

```typescript
export interface TLBaseEventInfo {
	type: UiEventType
	shiftKey: boolean
	altKey: boolean
	ctrlKey: boolean
	metaKey: boolean
	accelKey: boolean
}
```

Lines 46-53

All events include modifier key states.

## "Not sure" state latency cost

**Delay characteristics:**

- Maximum delay: Until gesture crosses threshold (24px zoom or 16px pan)
- Typical delay: 1-2 frames for decisive gestures
- No events dispatched while in "not sure" state (lines 239-270 switch statement only handles 'zooming' and 'panning')

**Trade-off analysis:**

- Cost: Few milliseconds of input latency
- Benefit: Avoids misclassifying cheap pan as expensive zoom
- Result: Slight latency is imperceptible, prevents noticeable jank

## Wheel event interaction

```typescript
const onWheel: Handler<'wheel', WheelEvent> = ({ event }) => {
	if (!editor.getInstanceState().isFocused) {
		return
	}

	pinchState = 'not sure' // Reset pinch state

	if (isWheelEndEvent(Date.now())) {
		return
	}
	// ... handle wheel event
}
```

Lines 84-134

Any wheel event resets pinch state to "not sure" (line 89). This prevents conflicts between wheel and pinch gestures.

### Wheel momentum filtering

```typescript
let lastWheelTime = undefined as undefined | number

const isWheelEndEvent = (time: number) => {
	if (lastWheelTime === undefined) {
		lastWheelTime = time
		return false
	}

	if (time - lastWheelTime > 120 && time - lastWheelTime < 160) {
		lastWheelTime = time
		return true
	}

	lastWheelTime = time
	return false
}
```

Lines 61-76

Comment (lines 53-60):

```
GOTCHA

UseGesture fires a wheel event 140ms after the gesture actually ends, with a momentum-adjusted
delta. This creates a messed up interaction where after you stop scrolling suddenly the dang page
jumps a tick. why do they do this? you are asking the wrong person. it seems intentional though.
anyway we want to ignore that last event, but there's no way to directly detect it so we need to
keep track of timestamps. Yes this is awful, I am sorry.
```

Filters out spurious wheel events that arrive 120-160ms after the last real event.

## Scroll interference prevention

```typescript
const editingShapeId = editor.getEditingShapeId()
if (editingShapeId) {
	const shape = editor.getShape(editingShapeId)
	if (shape) {
		const util = editor.getShapeUtil(shape)
		if (util.canScroll(shape)) {
			const bounds = editor.getShapePageBounds(editingShapeId)
			if (bounds?.containsPoint(editor.inputs.getCurrentPagePoint())) {
				return // Don't handle wheel event
			}
		}
	}
}
```

Lines 101-113

If user is editing a scrollable shape (like a text box with overflow) and the pointer is over that shape, don't intercept wheel events—let the shape handle scrolling internally.

## Distance between touches

The gesture library provides `da[0]` (distance and angle array, first element is distance).

**Initial capture:**

```typescript
const onPinchStart: PinchHandler = (gesture) => {
	const { origin, da } = gesture
	// ...
	initDistanceBetweenFingers = da[0]
	// ...
}
```

Lines 142-169, specifically line 155

**Current distance update:**

```typescript
const onPinch: PinchHandler = (gesture) => {
	const { da } = gesture
	// ...
	currDistanceBetweenFingers = da[0]
	// ...
}
```

Lines 210-271, specifically line 224

## Inputs manager pinching state

Located in `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/editor/managers/InputsManager/InputsManager.ts`

```typescript
/**
 * Whether the user is pinching.
 */
getIsPinching() {
    return this._isPinching.get()
}

/**
 * @param isPinching - Whether the user is pinching.
 * @internal
 */
setIsPinching(isPinching: boolean) {
    this._isPinching.set(isPinching)
}
```

Lines 338-358

The `_isPinching` is a reactive atom that other parts of the editor can observe.

## Edge cases and special handling

### Very small finger distances

Comment in code (lines 226-229):

```
Only update the zoom if the pointers are far enough apart;
a very small touchDistance means that the user has probably
pinched out and their fingers are touching; this produces
very unstable zooming behavior.
```

When fingers are nearly touching, distance calculations become unstable. The state machine helps by requiring 24+ pixels before committing to zoom.

### Event target validation

```typescript
const elm = ref.current
if (event instanceof WheelEvent) return
if (!(event.target === elm || elm?.contains(event.target as Node))) return
```

Lines 143, 148-149 (onPinchStart)
Lines 214-215 (onPinch)
Lines 277-278 (onPinchEnd)

Only handle events that target the editor canvas or its descendants.

### Animation frame for pinch end

```typescript
editor.timers.requestAnimationFrame(() => {
	editor.dispatch({
		type: 'pinch',
		name: 'pinch_end',
		// ...
	})
})
```

Lines 284-296

Pinch end event is dispatched on next animation frame rather than immediately.

## Constants and magic numbers

**Gesture classification thresholds:**

- Initial zoom threshold: 24 pixels (line 193)
- Initial pan threshold: 16 pixels (line 195)
- Panning-to-zooming transition: 64 pixels (line 202)

**Wheel momentum detection:**

- Time window: 120-160ms after last wheel event (line 69)
- Purpose: Filter spurious momentum events from @use-gesture library

**Default zoom configuration:**

- Min zoom: 5% (0.05)
- Max zoom: 800% (8)
- Default zoom speed: 1 (no non-linearity)
- Default pan speed: 1

## Key source files

- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/hooks/useGestureEvents.ts` - Main pinch state machine and gesture handlers (330 lines)
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/editor/Editor.ts` - Pinch event processing and camera updates (lines ~10327-10394)
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/primitives/Vec.ts` - Vector math utilities
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/editor/types/event-types.ts` - Event type definitions
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/editor/types/misc-types.ts` - Camera options interface
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/constants.ts` - Default camera configuration
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/editor/managers/InputsManager/InputsManager.ts` - Pinching state management

## External dependencies

**@use-gesture library:**

- Package: `@use-gesture/react`
- Provides cross-browser gesture detection
- Handles touch event normalization
- Manages pinch scale/rotation calculations
- Has quirk: emits spurious wheel event 140ms after gesture end

## Implementation notes from code comments

From lines 11-42 in useGestureEvents.ts:

```
# How does pinching work?

The pinching handler is fired under two circumstances:
- when a user is on a MacBook trackpad and is ZOOMING with a two-finger pinch
- when a user is on a touch device and is ZOOMING with a two-finger pinch
- when a user is on a touch device and is PANNING with two fingers

Zooming is much more expensive than panning (because it causes shapes to render),
so we want to be sure that we don't zoom while two-finger panning.

In order to do this, we keep track of a "pinchState", which is either:
- "zooming"
- "panning"
- "not sure"

If a user is on a trackpad, the pinchState will be set to "zooming".

If the user is on a touch screen, then we start in the "not sure" state and switch back and forth
between "zooming", "panning", and "not sure" based on what the user is doing with their fingers.

In the "not sure" state, we examine whether the user has moved the center of the gesture far enough
to suggest that they're panning; or else that they've moved their fingers further apart or closer
together enough to suggest that they're zooming.

In the "panning" state, we check whether the user's fingers have moved far enough apart to suggest
that they're zooming. If they have, we switch to the "zooming" state.

In the "zooming" state, we just stay zooming—it's not YET possible to switch back to panning.

todo: compare velocities of change in order to determine whether the user has switched back to panning
```

## Future improvements

From todo comment (line 42):

> compare velocities of change in order to determine whether the user has switched back to panning

Would enable zooming → panning transition by comparing:

- Rate of distance change (finger separation velocity)
- Rate of midpoint movement (translation velocity)

If midpoint velocity >> distance change velocity, likely switched from zoom to pan.
