# Click detection state machine: raw notes

Internal research notes for the click-state-machine.md article.

## Core problem

Detecting double-clicks, triple-clicks, and quadruple-clicks in a way that:
- Distinguishes clicks from drags
- Handles different input types (mouse vs touch)
- Provides different timeouts for initial vs subsequent multi-clicks
- Works reliably without race conditions
- Emits events at appropriate phases (down, up, settle)

**Naive approach (problematic):**
```typescript
let clickCount = 0
let clickTimeout: number

function onPointerUp() {
  clickCount++
  clearTimeout(clickTimeout)
  clickTimeout = setTimeout(() => {
    if (clickCount === 1) handleSingleClick()
    else if (clickCount === 2) handleDoubleClick()
    else if (clickCount === 3) handleTripleClick()
    clickCount = 0
  }, 300)
}
```

Issues:
- Doesn't handle spatial movement between clicks
- Can't distinguish clicks from drags
- Fixed timeout doesn't match OS conventions (double-click vs triple-click timing)
- Race conditions when multiple sequences overlap
- Difficult to extend (e.g., adding quadruple-click support)

**State machine approach:**
Explicit states replace implicit counters and flags. Each state represents a distinct point in the click sequence.

## State definitions

From `packages/editor/src/lib/editor/managers/ClickManager/ClickManager.ts:7-13`:

```typescript
export type TLClickState =
	| 'idle'
	| 'pendingDouble'
	| 'pendingTriple'
	| 'pendingQuadruple'
	| 'pendingOverflow'
	| 'overflow'
```

**State meanings:**
- `idle` - No recent clicks, waiting for first click
- `pendingDouble` - One click occurred, waiting to see if a second follows
- `pendingTriple` - Two clicks occurred (double-click emitted), waiting for third
- `pendingQuadruple` - Three clicks occurred (triple-click emitted), waiting for fourth
- `pendingOverflow` - Four clicks occurred (quadruple-click emitted), waiting for fifth
- `overflow` - Five or more clicks, no further advancement

## State transitions

### On pointer_down (lines 99-158)

The state machine advances on pointer down, not pointer up:

```typescript
switch (this._clickState) {
  case 'idle': {
    this._clickState = 'pendingDouble'
    break
  }
  case 'pendingDouble': {
    this._clickState = 'pendingTriple'
    return {
      ...info,
      type: 'click',
      name: 'double_click',
      phase: 'down',
    }
  }
  case 'pendingTriple': {
    this._clickState = 'pendingQuadruple'
    return {
      ...info,
      type: 'click',
      name: 'triple_click',
      phase: 'down',
    }
  }
  case 'pendingQuadruple': {
    this._clickState = 'pendingOverflow'
    return {
      ...info,
      type: 'click',
      name: 'quadruple_click',
      phase: 'down',
    }
  }
  case 'pendingOverflow': {
    this._clickState = 'overflow'
    break
  }
  default: {
    // overflow state - no further advancement
  }
}
```

**Key insight:** First click transitions from `idle` to `pendingDouble` but returns the normal pointer_down event. Second click transitions to `pendingTriple` and emits `double_click` with phase `down`. This pattern allows immediate response - tools don't wait for pointer up to react.

### On pointer_up (lines 160-195)

Emits the `up` phase event for pending multi-clicks:

```typescript
switch (this._clickState) {
  case 'pendingTriple': {
    return {
      ...this.lastPointerInfo,
      type: 'click',
      name: 'double_click',
      phase: 'up',
    }
  }
  case 'pendingQuadruple': {
    return {
      ...this.lastPointerInfo,
      type: 'click',
      name: 'triple_click',
      phase: 'up',
    }
  }
  case 'pendingOverflow': {
    return {
      ...this.lastPointerInfo,
      type: 'click',
      name: 'quadruple_click',
      phase: 'up',
    }
  }
  default: {
    // idle, pendingDouble, overflow - no up event
  }
}
```

Note: Uses `lastPointerInfo` captured on pointer_down, not the current pointer_up info. This ensures the click event uses the down position.

### Timeout and settle phase (lines 30-76)

Each state transition sets a timeout. When the timeout fires, it emits a `settle` event and returns to `idle`:

```typescript
_getClickTimeout(state: TLClickState, id = uniqueId()) {
  this._clickId = id
  clearTimeout(this._clickTimeout)
  this._clickTimeout = this.editor.timers.setTimeout(
    () => {
      if (this._clickState === state && this._clickId === id) {
        switch (this._clickState) {
          case 'pendingTriple': {
            this.editor.dispatch({
              ...this.lastPointerInfo,
              type: 'click',
              name: 'double_click',
              phase: 'settle',
            })
            break
          }
          case 'pendingQuadruple': {
            this.editor.dispatch({
              ...this.lastPointerInfo,
              type: 'click',
              name: 'triple_click',
              phase: 'settle',
            })
            break
          }
          case 'pendingOverflow': {
            this.editor.dispatch({
              ...this.lastPointerInfo,
              type: 'click',
              name: 'quadruple_click',
              phase: 'settle',
            })
            break
          }
          default: {
            // noop for idle, pendingDouble
          }
        }

        this._clickState = 'idle'
      }
    },
    state === 'idle' || state === 'pendingDouble'
      ? this.editor.options.doubleClickDurationMs
      : this.editor.options.multiClickDurationMs
  )
}
```

## Event phases

From `packages/editor/src/lib/editor/types/event-types.ts:73`:

```typescript
export type TLClickEventInfo = TLBaseEventInfo & {
	type: 'click'
	name: TLCLickEventName
	point: VecLike
	pointerId: number
	button: number
	phase: 'down' | 'up' | 'settle'
} & TLPointerEventTarget
```

**Phase purposes:**
- `down` - Fires immediately when pointer goes down and sequence advances. Allows instant UI feedback (e.g., text selection starts immediately on double-click down, not after release).
- `up` - Fires when pointer releases, confirming the click wasn't dragged. Tools can update visual state.
- `settle` - Fires when timeout expires, confirming no further clicks are coming. Tools use this for final actions like opening dialogs or completing operations.

## Timeout configuration

From `packages/editor/src/lib/options.ts:115-116`:

```typescript
doubleClickDurationMs: 450,
multiClickDurationMs: 200,
```

**Rationale:**
- `doubleClickDurationMs` (450ms) - Longer timeout for the initial double-click. Users deliberately perform double-clicks with some hesitation.
- `multiClickDurationMs` (200ms) - Shorter timeout for subsequent multi-clicks. Once in a multi-click sequence, clicks are rapid-fire.

Matches OS conventions where triple-click to select a paragraph requires fast clicking after the initial double-click.

From line 72-74:
```typescript
state === 'idle' || state === 'pendingDouble'
  ? this.editor.options.doubleClickDurationMs   // 450ms
  : this.editor.options.multiClickDurationMs    // 200ms
```

Only `idle` → `pendingDouble` and `pendingDouble` → `pendingTriple` use the longer timeout. All subsequent transitions use the shorter timeout.

## Race condition prevention

From lines 30-35 and timeout callback check at line 35:

```typescript
_getClickTimeout(state: TLClickState, id = uniqueId()) {
  this._clickId = id
  clearTimeout(this._clickTimeout)
  this._clickTimeout = this.editor.timers.setTimeout(
    () => {
      if (this._clickState === state && this._clickId === id) {
        // Only execute if state and ID still match
```

**Mechanism:**
1. Each timeout gets a unique ID via `uniqueId()` from `@tldraw/utils`
2. ID is stored in `this._clickId` (line 31)
3. When timeout fires, it checks both:
   - `this._clickState === state` - Still in the expected state
   - `this._clickId === id` - No newer click sequence has started

**uniqueId implementation:**
From `packages/utils/src/lib/id.ts:40-59`:
```typescript
function nanoid(size = 21) {
  fillPool((size -= 0))
  let id = ''
  for (let i = poolOffset - size; i < poolOffset; i++) {
    id += urlAlphabet[pool[i] & 63]
  }
  return id
}

export function uniqueId(size = 21) {
  return nanoid(size)
}
```

Uses nanoid algorithm with crypto.getRandomValues for collision-resistant IDs.

**Why this matters:**
If user starts a new click sequence before the timeout fires, the old timeout will find its ID doesn't match and silently no-op. Prevents stale timeouts from dispatching incorrect events.

## Spatial constraints

### Between-click distance

From lines 15, 103-108:

```typescript
const MAX_CLICK_DISTANCE = 40

// In handlePointerEvent for pointer_down:
if (
  this._previousScreenPoint &&
  Vec.Dist2(this._previousScreenPoint, this._clickScreenPoint) > MAX_CLICK_DISTANCE ** 2
) {
  this._clickState = 'idle'
}
```

Clicks must occur within 40 pixels of each other. Moving beyond this resets the sequence to `idle`.

**Why squared distance:**
`Vec.Dist2` returns squared Euclidean distance, avoiding expensive `Math.sqrt()`:

From `packages/editor/src/lib/primitives/Vec.ts:332-334`:
```typescript
static Dist2(A: VecLike, B: VecLike): number {
  return (A.x - B.x) * (A.x - B.x) + (A.y - B.y) * (A.y - B.y)
}
```

Comparison uses `MAX_CLICK_DISTANCE ** 2` (1600) which is equivalent to the squared distance test but avoids square root calculation. Micro-optimization that adds up since this runs on every pointer down.

### Drag detection

From lines 196-211:

```typescript
case 'pointer_move': {
  if (
    this._clickState !== 'idle' &&
    this._clickScreenPoint &&
    Vec.Dist2(this._clickScreenPoint, this.editor.inputs.getCurrentScreenPoint()) >
      (this.editor.getInstanceState().isCoarsePointer
        ? this.editor.options.coarseDragDistanceSquared
        : this.editor.options.dragDistanceSquared)
  ) {
    this.cancelDoubleClickTimeout()
  }
  return info
}
```

Moving the pointer during a click sequence cancels it, treating the interaction as a drag instead.

**Thresholds from `options.ts:117-118`:**
```typescript
coarseDragDistanceSquared: 36, // 6 squared
dragDistanceSquared: 16, // 4 squared
```

- **Touch (coarse pointer):** 6 pixel threshold (36 squared)
- **Mouse (fine pointer):** 4 pixel threshold (16 squared)

Touch requires larger threshold because fingers are imprecise and naturally wobble during taps.

**isCoarsePointer detection:**
Determined by the editor's instance state. Typically true for touch devices, false for mouse input.

## Private state tracking

From lines 21-27:

```typescript
private _clickId = ''
private _clickTimeout?: any
private _clickScreenPoint?: Vec
private _previousScreenPoint?: Vec
```

- `_clickId` - Current sequence's unique identifier
- `_clickTimeout` - Active timeout handle (cleared on new clicks)
- `_clickScreenPoint` - Position of most recent pointer_down in screen space
- `_previousScreenPoint` - Position of previous click in sequence

**Why screen space?**
Spatial checks use screen coordinates rather than page coordinates. This ensures consistent behavior regardless of zoom level or panning. 40 pixels on screen is always 40 pixels visually, while 40 pixels in page space could be any screen size depending on zoom.

## Public state access

From lines 83-93:

```typescript
private _clickState?: TLClickState = 'idle'

// eslint-disable-next-line no-restricted-syntax
get clickState() {
  return this._clickState
}

lastPointerInfo = {} as TLPointerEventInfo
```

- `clickState` - Public getter for current state (read-only)
- `lastPointerInfo` - Last pointer_down event info, used for up/settle events

## Cancellation

From lines 218-222:

```typescript
@bind
cancelDoubleClickTimeout() {
  this._clickTimeout = clearTimeout(this._clickTimeout)
  this._clickState = 'idle'
}
```

Public method to cancel click sequence, used when:
- Pointer moves beyond drag threshold
- External events invalidate the sequence
- Tool transitions occur

## Integration with Editor

**Editor timers:**
Uses `this.editor.timers.setTimeout()` rather than raw `setTimeout()`. The editor provides a timer system that can be mocked for testing and controlled for animations.

**Event dispatch:**
Settle phase events call `this.editor.dispatch()` directly (lines 38, 47, 56). Down/up phase events are returned from `handlePointerEvent()` for the editor to dispatch.

**Options access:**
Timeout durations and drag thresholds come from `this.editor.options`, allowing configuration without changing the ClickManager implementation.

## Event handler mapping

From `packages/editor/src/lib/editor/types/event-types.ts:189-210`:

```typescript
export const EVENT_NAME_MAP: Record<
	Exclude<TLEventName, TLPinchEventName>,
	keyof TLEventHandlers
> = {
  // ...
  double_click: 'onDoubleClick',
  triple_click: 'onTripleClick',
  quadruple_click: 'onQuadrupleClick',
  // ...
}
```

Click events map to handler methods:
- `double_click` → `onDoubleClick`
- `triple_click` → `onTripleClick`
- `quadruple_click` → `onQuadrupleClick`

## Usage in tools

**SelectTool Idle state:**
From `packages/tldraw/src/lib/tools/SelectTool/childStates/Idle.ts:169-356`:

```typescript
override onDoubleClick(info: TLClickEventInfo) {
  if (this.editor.inputs.getShiftKey() || info.phase !== 'up') return

  // Early return if phase is not 'up'
  // Tools typically respond to 'up' or 'settle' for final actions
```

The SelectTool's Idle state:
- Checks `info.phase !== 'up'` to only handle the up phase
- Uses double-click on canvas to create text shapes (if enabled)
- Uses double-click on shapes to start editing
- Calls shape util's `onDoubleClickEdge`, `onDoubleClickCorner`, `onDoubleClickHandle` handlers

**Text selection (implicit usage):**
Text shapes likely use triple-click in `settle` phase to confirm paragraph selection, though this isn't explicitly shown in the SelectTool code. The three-phase system allows immediate visual feedback (down), confirmation (up), and final action (settle).

## Test coverage

From `packages/editor/src/lib/editor/managers/ClickManager/ClickManager.test.ts`:

Tests verify:
- Initial state is `idle` (line 69)
- Single click transitions to `pendingDouble` (line 88)
- Second click within timeout emits `double_click` with `down` phase (lines 115-125)
- Pointer up after double-click down emits `up` phase (lines 128-140)
- Timeout in `pendingTriple` emits `settle` phase and returns to `idle` (lines 142-159)
- Triple and quadruple clicks follow the same pattern (lines 162-232)
- Overflow state prevents infinite advancement (lines 192-203, 412-427)
- Different timeout durations for different states (lines 275-293)
- Distance-based cancellation when clicks too far apart (lines 296-320)
- Drag detection cancels sequence (lines 323-379)
- Coarse pointer uses larger drag threshold (lines 341-367)
- `cancelDoubleClickTimeout()` resets state (lines 382-408)

Test uses `vi.useFakeTimers()` and `vi.advanceTimersByTime()` to control timeout execution without real delays.

## Constants summary

```typescript
// From ClickManager.ts:15
const MAX_CLICK_DISTANCE = 40  // pixels in screen space

// From options.ts:115-118
doubleClickDurationMs: 450      // initial double-click timeout
multiClickDurationMs: 200       // subsequent multi-click timeout
coarseDragDistanceSquared: 36   // 6px threshold for touch
dragDistanceSquared: 16         // 4px threshold for mouse
```

## Edge cases

**Idle state check:**
From line 100: `if (!this._clickState) return info`

Defensive check that shouldn't trigger in normal operation (state initializes to `idle`), but guards against undefined state.

**Overflow state behavior:**
Fifth and subsequent clicks stay in `overflow` state without emitting new click events. Prevents unbounded click counting.

**Phase filtering:**
Tools typically check `info.phase !== 'up'` or `info.phase === 'settle'` to respond only to specific phases. This prevents double-handling the same logical click.

**Shift/Ctrl key filtering:**
From Idle.ts:170: `if (this.editor.inputs.getShiftKey() || info.phase !== 'up') return`

Tools often skip multi-click handling when modifier keys are held, as these indicate different user intent (e.g., shift-clicking to multi-select).

## Architectural benefits

**Explicit over implicit:**
State machine makes all transitions visible and auditable. No hidden counters or flag combinations.

**Testability:**
Each state transition can be tested independently. Mock timers allow deterministic testing without flakiness.

**Extensibility:**
Adding quintuple-click would require:
1. New state `pendingQuintuple` in the enum
2. Transition in `pendingOverflow` case
3. Handler in timeout callback
No refactoring of existing logic needed.

**Race condition immunity:**
Unique IDs and state checks make overlapping sequences impossible. Stale timeouts harmlessly no-op.

**Phase separation:**
Three phases allow progressive enhancement of UX:
- Immediate visual feedback (down)
- Confirmation of click vs drag (up)
- Final action when sequence complete (settle)

## Key source files

- `packages/editor/src/lib/editor/managers/ClickManager/ClickManager.ts` - Complete state machine implementation
- `packages/editor/src/lib/editor/managers/ClickManager/ClickManager.test.ts` - Comprehensive test suite
- `packages/editor/src/lib/options.ts` - Configuration constants (lines 115-118)
- `packages/editor/src/lib/editor/types/event-types.ts` - Type definitions for click events (lines 25, 67-74, 189-210)
- `packages/editor/src/lib/primitives/Vec.ts` - Distance calculation utilities (line 332-334)
- `packages/tldraw/src/lib/tools/SelectTool/childStates/Idle.ts` - Example tool usage (lines 169-356)
- `packages/utils/src/lib/id.ts` - Unique ID generation for race condition prevention
