# Wheel momentum filtering: raw notes

Internal research notes for the wheel-momentum.md article.

## Core problem

The `@use-gesture/react` library fires a phantom wheel event approximately 140ms after momentum scrolling ends. This event:
- Contains a momentum-adjusted delta representing the "final destination"
- Arrives after all real scroll events have been processed
- Causes an unwanted jump in the canvas right as scrolling should settle
- Has no explicit flag identifying it as a synthetic end event

**Library version affected:**
- `@use-gesture/react`: `^10.3.1` (from `packages/editor/package.json:61`)

## The phantom event characteristics

**Timing:**
- Fires approximately 140ms after the last real wheel event
- Timing is consistent regardless of scroll speed or direction
- Appears intentional in use-gesture's implementation (not a bug)

**Delta characteristics:**
- Carries a non-zero delta value
- Represents momentum-adjusted "where scroll would have ended" position
- Not what tldraw wants - we handle scroll frame-by-frame as events arrive

**User experience impact:**
- Canvas drifts smoothly as momentum decays
- Small jump (few pixels) occurs right at the end
- More noticeable at higher zoom levels (small pixel movements = larger canvas movements)
- More noticeable on trackpads than mice (trackpad scrolling produces more momentum events)
- Breaks the illusion of physical momentum

## Detection strategy: timestamp analysis

**Core implementation:**
Located in `packages/editor/src/lib/hooks/useGestureEvents.ts:61-76`

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

**Module-level state:**
- `lastWheelTime` stored as module-level variable (not in React state)
- Undefined initially, then tracks timestamp of each wheel event
- Persists across all wheel events for the lifetime of the module

**Detection logic:**
1. First event: Initialize `lastWheelTime`, return `false` (not phantom)
2. Subsequent events: Check time gap
3. If gap is between 120-160ms: Flag as phantom, return `true`
4. Otherwise: Update timestamp, return `false` (legitimate event)

**Timing window rationale:**
- Center point: 140ms (observed phantom event delay)
- Lower bound: 120ms (140 - 20ms tolerance)
- Upper bound: 160ms (140 + 20ms tolerance)
- 20ms tolerance accounts for:
  - Timer variability (`setTimeout`, `requestAnimationFrame`)
  - Browser and system load variations
  - Slight timing differences across browsers

**Why this window works:**
- Real scroll events rarely have exactly 140ms gaps
- Users don't naturally scroll in bursts with 140ms pauses
- Narrower window would miss some phantom events
- Wider window risks filtering legitimate user input

## Integration with wheel event handler

**Handler location:**
`packages/editor/src/lib/hooks/useGestureEvents.ts:84-134`

**Handler structure:**
```typescript
const onWheel: Handler<'wheel', WheelEvent> = ({ event }) => {
	if (!editor.getInstanceState().isFocused) {
		return
	}

	pinchState = 'not sure'

	if (isWheelEndEvent(Date.now())) {
		// ignore wheelEnd events
		return
	}

	// ... process legitimate wheel event
}
```

**Execution order (critical):**
1. **Line 85-87:** Check if editor is focused
2. **Line 89:** Reset `pinchState = 'not sure'` (unconditional)
3. **Line 91-94:** Check for phantom event, early return if detected
4. **Line 96-133:** Process legitimate wheel event

**Why `pinchState` resets before phantom check:**
- Ensures pinch disambiguation starts fresh even if wheel event is filtered
- State cleanup happens unconditionally
- Event dispatch is conditional (only for non-phantom events)
- Maintains consistent state machine behavior

## Wheel event processing flow

**After phantom filter passes:**

1. **Scrollable shape check (lines 96-113):**
   - If a shape is being edited that can scroll (e.g., text box)
   - And the cursor is over that shape's bounds
   - Let the shape handle scrolling, don't process as canvas scroll

2. **Prevent default (lines 115-116):**
   ```typescript
   preventDefault(event)
   event.stopPropagation()
   ```

3. **Normalize wheel delta (line 117):**
   ```typescript
   const delta = normalizeWheel(event)
   ```
   Calls `normalizeWheel()` from `packages/editor/src/lib/utils/normalizeWheel.ts`

4. **Zero delta check (line 119):**
   ```typescript
   if (delta.x === 0 && delta.y === 0) return
   ```

5. **Build event info (lines 121-131):**
   ```typescript
   const info: TLWheelEventInfo = {
       type: 'wheel',
       name: 'wheel',
       delta,
       point: new Vec(event.clientX, event.clientY),
       shiftKey: event.shiftKey,
       altKey: event.altKey,
       ctrlKey: event.metaKey || event.ctrlKey,
       metaKey: event.metaKey,
       accelKey: isAccelKey(event),
   }
   ```

6. **Dispatch to editor (line 133):**
   ```typescript
   editor.dispatch(info)
   ```

## Wheel delta normalization

**File location:**
`packages/editor/src/lib/utils/normalizeWheel.ts`

**Constants:**
```typescript
const MAX_ZOOM_STEP = 10
const IS_DARWIN = /Mac|iPod|iPhone|iPad/.test(
    typeof window === 'undefined' ? 'node' : window.navigator.platform
)
```

**Normalization logic:**
```typescript
export function normalizeWheel(event: WheelEvent | React.WheelEvent<HTMLElement>) {
	let { deltaY, deltaX } = event
	let deltaZ = 0

	// wheeling with modifier keys = zoom
	if (event.ctrlKey || event.altKey || event.metaKey) {
		deltaZ = (Math.abs(deltaY) > MAX_ZOOM_STEP ? MAX_ZOOM_STEP * Math.sign(deltaY) : deltaY) / 100
	} else {
		// shift key on non-Darwin = convert vertical scroll to horizontal
		if (event.shiftKey && !IS_DARWIN) {
			deltaX = deltaY
			deltaY = 0
		}
	}

	return { x: -deltaX, y: -deltaY, z: -deltaZ }
}
```

**Zoom handling:**
- Ctrl/Alt/Meta + wheel = zoom (deltaZ)
- Clamps deltaZ to ±10 maximum step
- Divides by 100 for zoom sensitivity

**Shift key behavior:**
- On non-macOS: converts vertical scroll to horizontal
- On macOS: shift key has no special effect (natural trackpad behavior)

**Sign inversion:**
- Returns negative deltas (`-deltaX`, `-deltaY`, `-deltaZ`)
- Converts DOM wheel conventions to tldraw conventions

## Event type definitions

**TLWheelEventInfo structure:**
Located in `packages/editor/src/lib/editor/types/event-types.ts:93-98`

```typescript
export type TLWheelEventInfo = TLBaseEventInfo & {
	type: 'wheel'
	name: 'wheel'
	delta: VecModel
	point: VecModel
}
```

**TLBaseEventInfo:**
Located in `packages/editor/src/lib/editor/types/event-types.ts:46-53`

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

## PinchState interaction

**Why wheel events reset pinchState:**
- Wheel events can be confused with pinch gestures on some devices
- Two-finger trackpad scrolling can register as either wheel or pinch
- Resetting to `'not sure'` allows the pinch state machine to re-evaluate
- See `packages/editor/src/lib/hooks/useGestureEvents.ts:11-43` for full pinch disambiguation logic

**PinchState values:**
```typescript
let pinchState = 'not sure' as 'not sure' | 'zooming' | 'panning'
```

**State transitions:**
- `'not sure'` → Initial state, evaluating gesture intent
- `'zooming'` → Two fingers moving apart/together (expensive, triggers re-renders)
- `'panning'` → Two fingers moving in parallel (cheap, just camera movement)

**Threshold values (from pinch logic):**
- Touch distance > 24px → zooming from "not sure"
- Origin distance > 16px → panning from "not sure"
- Touch distance > 64px → zooming from "panning" (requires more movement to override)

## The GOTCHA comment

**Full comment text:**
Located in `packages/editor/src/lib/hooks/useGestureEvents.ts:52-60`

```typescript
/**
 * GOTCHA
 *
 * UseGesture fires a wheel event 140ms after the gesture actually ends, with a momentum-adjusted
 * delta. This creates a messed up interaction where after you stop scrolling suddenly the dang page
 * jumps a tick. why do they do this? you are asking the wrong person. it seems intentional though.
 * anyway we want to ignore that last event, but there's no way to directly detect it so we need to
 * keep track of timestamps. Yes this is awful, I am sorry.
 */
```

**Key acknowledgments:**
- Explicitly labeled as a workaround, not a proper solution
- Behavior appears intentional in use-gesture (not a bug to be fixed)
- No direct detection method available (no event flag)
- Requires timestamp tracking (fragile heuristic)
- Apologetic tone indicates awareness of code smell

## Fragility and future concerns

**Current version stability:**
- Works reliably with `@use-gesture/react` 10.3.1
- Has survived several minor version updates
- Timing behavior appears stable even if undocumented

**Potential breaking changes:**
- use-gesture might change phantom event timing
- Could start missing phantom events (if timing shifts)
- Could start filtering real events (if timing becomes variable)
- No documented API guarantees this behavior

**Alternative approaches (not implemented):**
1. **Explicit end event:**
   - use-gesture could add an event type like `wheel_end`
   - Would not masquerade as a real wheel event
   - Would require library changes

2. **Configurable timing:**
   - Allow phantom event delay to be configured
   - Could disable entirely
   - Would require library changes

3. **Velocity-based detection:**
   - Track velocity of scroll events
   - Phantom events have momentum-level deltas but zero preceding velocity
   - Would be more robust than timestamp detection
   - More complex to implement, may have false positives

4. **Delta discontinuity detection:**
   - Compare phantom delta to recent delta patterns
   - Phantom deltas often don't match momentum curve
   - Requires maintaining velocity history
   - Complex, CPU-intensive

## Use-gesture library integration

**Import location:**
`packages/editor/src/lib/hooks/useGestureEvents.ts:1-2`

```typescript
import type { AnyHandlerEventTypes, EventTypes, GestureKey, Handler } from '@use-gesture/core/types'
import { createUseGesture, pinchAction, wheelAction } from '@use-gesture/react'
```

**Gesture hook creation:**
`packages/editor/src/lib/hooks/useGestureEvents.ts:50`

```typescript
const useGesture = createUseGesture([wheelAction, pinchAction])
```

**Hook usage:**
`packages/editor/src/lib/hooks/useGestureEvents.ts:307-328`

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

**Configuration:**
- `passive: false` - allows `preventDefault()` to work
- `pinch.from` - returns initial zoom level when pinch starts
- `pinch.scaleBounds` - constrains zoom range based on camera options

## Related event handlers

**onPinchStart (lines 142-169):**
- Initializes pinch state variables
- Sets `pinchState = 'not sure'`
- Dispatches `pinch_start` event

**onPinch (lines 210-271):**
- Updates pinch state based on finger movement
- Dispatches `pinch` events with zoom or pan deltas
- Differentiates Safari trackpad pinch from touch pinch

**onPinchEnd (lines 273-297):**
- Resets `pinchState = 'not sure'`
- Dispatches `pinch_end` event

## Test coverage

**Search results:**
No dedicated tests found for wheel event phantom filtering.

**Potential test approach:**
1. Mock `Date.now()` to control timestamps
2. Fire sequence of wheel events with controlled timing
3. Verify events with 120-160ms gaps are filtered
4. Verify events outside that range are processed
5. Test boundary conditions (exactly 120ms, exactly 160ms)

**Testing challenges:**
- Requires mocking time
- Difficult to reproduce use-gesture's exact behavior
- Would be testing the workaround, not the underlying issue

## Constants and magic numbers

**Timing constants:**
```typescript
120  // Lower bound for phantom event detection (ms)
140  // Observed phantom event delay (ms, not in code)
160  // Upper bound for phantom event detection (ms)
```

**Related constants (from normalizeWheel.ts):**
```typescript
MAX_ZOOM_STEP = 10  // Maximum zoom delta per wheel event
```

## Key source files

- `packages/editor/src/lib/hooks/useGestureEvents.ts:52-76` — The `isWheelEndEvent` function and GOTCHA comment
- `packages/editor/src/lib/hooks/useGestureEvents.ts:84-134` — Wheel event handler with phantom filtering
- `packages/editor/src/lib/utils/normalizeWheel.ts` — Wheel delta normalization (runs after phantom filtering)
- `packages/editor/src/lib/editor/types/event-types.ts:93-98` — TLWheelEventInfo type definition
- `packages/editor/package.json:61` — @use-gesture/react version (10.3.1)

## Related features

- **Pinch gesture disambiguation:** Similar timing-sensitive state machine for two-finger gestures
- **Scrollable shapes:** Allows shape interiors to capture scroll events
- **Camera zoom:** Wheel events with modifiers trigger zoom instead of pan
- **Focus management:** Wheel events ignored when editor is not focused
