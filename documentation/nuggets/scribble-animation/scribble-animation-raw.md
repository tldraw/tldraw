---
title: Scribble animation - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - scribble
  - animation
status: published
date: 12/21/2025
order: 3
---

# Scribble animation - raw notes

## Source files

### Core implementation

- `/packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts` (186 lines)
  - Main scribble state machine and point management
- `/packages/tlschema/src/misc/TLScribble.ts` (140 lines)
  - Type definitions and validators for TLScribble
- `/packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.test.ts` (622 lines)
  - Comprehensive test suite showing all edge cases

### Rendering components

- `/packages/tldraw/src/lib/canvas/TldrawScribble.tsx` (40 lines)
  - Variable-width SVG rendering using getStroke
- `/packages/editor/src/lib/components/default-components/DefaultScribble.tsx` (32 lines)
  - Simple constant-width trail rendering (stroke-based, not fill-based)

### Tool implementations

- `/packages/tldraw/src/lib/tools/EraserTool/childStates/Erasing.ts` (174 lines)
  - Eraser tool with immediate feedback (no delay)
  - Lines 51-54: Creates scribble with color 'muted-1' and size 12
- `/packages/tldraw/src/lib/tools/LaserTool/childStates/Lasering.ts` (54 lines)
  - Laser tool with 1200ms delay
  - Lines 9-16: Creates scribble with specific delay and shrink rate
- `/packages/tldraw/src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts` (179 lines)
  - Selection lasso (alt-drag)
  - Lines 31-35: Creates scribble with 'selection-stroke' color

### Stroke generation

- `/packages/tldraw/src/lib/shapes/shared/freehand/getStroke.ts` (23 lines)
  - Main entry point: `getStroke(points, options) => Vec[]`
  - Calls: getStrokePoints -> setStrokePointRadii -> getStrokeOutlinePoints
- `/packages/tldraw/src/lib/shapes/shared/freehand/types.ts` (50 lines)
  - StrokeOptions interface definition
- `/packages/tldraw/src/lib/shapes/shared/freehand/getStrokePoints.ts`
  - Lines 0-59 show streamline calculation and pressure handling
  - Line 28: Interpolation formula `t = 0.15 + (1 - streamline) * 0.85`
  - Lines 3-4: Constants MIN_START_PRESSURE = 0.025, MIN_END_PRESSURE = 0.01

## Data structures

### ScribbleItem interface (ScribbleManager.ts, lines 6-14)

```typescript
export interface ScribbleItem {
	id: string
	scribble: TLScribble
	timeoutMs: number // Accumulates elapsed time, resets at 16ms
	delayRemaining: number // Countdown timer for delay queue
	prev: null | VecModel // Previous point (for deduplication)
	next: null | VecModel // Next point to add
}
```

### TLScribble interface (TLScribble.ts, lines 76-95)

```typescript
export interface TLScribble {
	id: string
	points: VecModel[] // Array of {x, y, z} points
	size: number // Brush size/width
	color: TLCanvasUiColor
	opacity: number // 0-1
	state: 'starting' | 'paused' | 'active' | 'stopping'
	delay: number // Time in ms before points start being removed
	shrink: number // Amount to shrink (0-1), applied as multiplier
	taper: boolean // Whether to taper ends
}
```

### VecModel

```typescript
{ x: number, y: number, z: number }
```

Where z is pressure (0-1), defaults to 0.5 when added

## Constants and defaults

### Default scribble values (ScribbleManager.ts, lines 26-36)

```typescript
{
	size: 20,
	color: 'accent',
	opacity: 0.8,
	delay: 0,
	points: [],
	shrink: 0.1,              // 10% shrink per frame
	taper: true,
	state: 'starting',
}
```

### Editor options (options.ts, line 148)

```typescript
laserDelayMs: 1200 // Default laser pointer delay
```

### Timing constants

- **16ms throttle**: Point removal happens every 16ms (ScribbleManager.ts, line 115)
  - Approximately 60fps frame rate
  - Ensures consistent removal rate regardless of actual frame rate
- **200ms cap on stopping delay**: When stop() is called, delay is capped at 200ms (ScribbleManager.ts, line 60)
  - Prevents trails from lingering too long after tool exit
- **8 point minimum**: Scribbles need > 8 points before transitioning from 'starting' to 'active' (ScribbleManager.ts, lines 104, 129)
  - Ensures smooth rendering before sliding window starts
- **1 pixel deduplication distance**: Points within 1px are ignored (ScribbleManager.ts, line 79)
  - Uses `Vec.Dist(prev, point) >= 1`

### Stroke rendering options (TldrawScribble.tsx, lines 9-15)

```typescript
const stroke = getStroke(scribble.points, {
	size: scribble.size / zoom,
	start: { taper: scribble.taper, easing: EASINGS.linear },
	last: scribble.state === 'stopping',
	simulatePressure: false,
	streamline: 0.32,
})
```

### EASINGS (easings.ts, line 2)

```typescript
EASINGS = {
	linear: (t: number) => t,
	easeInQuad: (t: number) => t * t,
	easeOutQuad: (t: number) => t * (2 - t),
	easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
	// ... many more easing functions
}
```

Scribbles use `EASINGS.linear` for start taper

### Streamline parameter

- Default: 0.5 (getStrokePoints.ts, line 21)
- Scribbles use: 0.32 (TldrawScribble.tsx, line 14)
- Formula: `t = 0.15 + (1 - streamline) * 0.85` (getStrokePoints.ts, line 28)
  - Lower streamline = more interpolation = smoother curves
  - 0.32 gives `t = 0.15 + 0.68 * 0.85 = 0.728`

## State machine

### States (TLScribble.ts, line 32)

```typescript
TL_SCRIBBLE_STATES = new Set(['starting', 'paused', 'active', 'stopping'])
```

### State transitions (ScribbleManager.ts)

**Starting state** (lines 97-108):

- Initial state for all new scribbles
- Collects first 8+ points without removal
- Adds point if `next !== prev`
- Transitions to 'active' when `points.length > 8`

**Active state** (lines 122-144):

- Main operational state
- Two behaviors:
  1. **Moving** (lines 123-132): When `next && next !== prev`
     - Push new point to array
     - If `delayRemaining === 0` and `points.length > 8`: shift oldest point
     - Creates sliding window effect
  2. **Idle** (lines 134-142): When not moving
     - If `timeoutMs === 0` (16ms elapsed):
       - Shift points if `points.length > 1`
       - Reset delay when down to 1 point

**Stopping state** (lines 146-164):

- Entered via `stop()` method
- No new points accepted
- Delay capped at 200ms
- When `delayRemaining === 0` and `timeoutMs === 0`:
  - Remove scribble when only 1 point remains (line 151)
  - Apply shrink factor: `size = Math.max(1, size * (1 - shrink))` (line 157)
  - Shift oldest point (line 161)

**Paused state** (lines 166-169):

- Does nothing during tick
- Not used in current tool implementations

## Algorithms

### Point deduplication (ScribbleManager.ts, lines 74-83)

```typescript
addPoint(id: ScribbleItem['id'], x: number, y: number, z = 0.5) {
	const item = this.scribbleItems.get(id)
	const { prev } = item
	const point = { x, y, z }
	if (!prev || Vec.Dist(prev, point) >= 1) {
		item.next = point
	}
	return item
}
```

- Only sets `item.next` if distance >= 1 pixel from previous point
- Prevents redundant points during slow movement
- Critical for maintaining consistent trail length/duration

### Delay queue logic (ScribbleManager.ts, lines 110-117)

```typescript
if (item.delayRemaining > 0) {
	item.delayRemaining = Math.max(0, item.delayRemaining - elapsed)
}

item.timeoutMs += elapsed
if (item.timeoutMs >= 16) {
	item.timeoutMs = 0
}
```

- `delayRemaining` counts down from initial delay value
- While > 0: points accumulate without removal
- When = 0: sliding window begins (add at head, remove at tail)
- `timeoutMs` throttles operations to 16ms intervals

### Shrink calculation (ScribbleManager.ts, line 157)

```typescript
scribble.size = Math.max(1, scribble.size * (1 - scribble.shrink))
```

- Applied each frame during 'stopping' state
- Example: size=20, shrink=0.1
  - Frame 1: 20 \* 0.9 = 18
  - Frame 2: 18 \* 0.9 = 16.2
  - Frame 3: 16.2 \* 0.9 = 14.58
  - Exponential decay toward minimum of 1
- Laser uses shrink=0.05 (slower), eraser uses default 0.1 (faster)

### Instance state update (ScribbleManager.ts, lines 175-182)

```typescript
this.editor.updateInstanceState({
	scribbles: Array.from(this.scribbleItems.values())
		.map(({ scribble }) => ({
			...scribble,
			points: [...scribble.points], // Deep copy points array
		}))
		.slice(-5), // Limit to last 5 scribbles
})
```

- Runs every tick after processing all scribbles
- Creates immutable copies (store requirement)
- Limits to 5 concurrent scribbles as sanity check

## Tool-specific configurations

### Eraser tool (Erasing.ts, lines 51-54)

```typescript
const scribble = this.editor.scribbles.addScribble({
	color: 'muted-1',
	size: 12,
	// delay defaults to 0
	// shrink defaults to 0.1
})
```

- No delay: immediate feedback
- Smaller size (12 vs default 20)
- Fast shrink for quick disappearance

### Laser tool (Lasering.ts, lines 9-16)

```typescript
const scribble = this.editor.scribbles.addScribble({
	color: 'laser',
	opacity: 0.7,
	size: 4,
	delay: this.editor.options.laserDelayMs, // 1200ms
	shrink: 0.05, // Slower shrink
	taper: true,
})
```

- 1200ms delay: trail persists for audience
- Small size (4): precise pointer
- Slow shrink (0.05): dramatic fade effect
- Reduced opacity (0.7): less obtrusive

### Selection lasso (ScribbleBrushing.ts, lines 31-35)

```typescript
const scribbleItem = this.editor.scribbles.addScribble({
	color: 'selection-stroke',
	opacity: 0.32,
	size: 12,
	// delay defaults to 0
})
```

- No delay: immediate visual feedback
- Low opacity (0.32): semi-transparent
- Medium size (12)
- Uses default shrink (0.1)

## Rendering details

### TldrawScribble (variable-width rendering)

- Uses `getStroke()` to generate variable-width outline
- Renders as filled SVG path
- Fallback for < 4 stroke points: render as circle (lines 19-23)

  ```typescript
  if (stroke.length < 4) {
  	const r = scribble.size / zoom / 2
  	const { x, y } = scribble.points[scribble.points.length - 1]
  	d = `M ${x - r},${y} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0`
  }
  ```

  - Creates circle path using SVG arc commands
  - Prevents malformed paths from too few points

### DefaultScribble (constant-width rendering)

- Simple stroked path (no fill)
- Fixed strokeWidth: `8 / zoom` (line 26)
- Uses `getSvgPathFromPoints()` directly
- Lighter-weight alternative to TldrawScribble

### StrokeOptions interface (types.ts, lines 8-34)

```typescript
export interface StrokeOptions {
	size?: number // Base diameter
	thinning?: number // Pressure effect on size
	smoothing?: number // Edge softening
	streamline?: number // Point interpolation
	easing?(pressure: number): number
	simulatePressure?: boolean // Velocity-based pressure
	start?: {
		cap?: boolean
		taper?: number | boolean // Start tapering
		easing?(distance: number): number
	}
	end?: {
		cap?: boolean
		taper?: number | boolean // End tapering
		easing?(distance: number): number
	}
	last?: boolean // Whether stroke is complete
}
```

## Edge cases and behaviors

### Empty scribbles

- ScribbleManager.tick() returns early if `scribbleItems.size === 0` (line 92)
- TldrawScribble returns null if `!scribble.points.length` (line 7)
- DefaultScribble also returns null if no points (line 17)

### Point removal constraints

- Starting state: Never removes points (builds to 8+)
- Active state: Only removes if `points.length > 8` (line 129)
- Active idle: Only removes if `points.length > 1` (line 136)
- Stopping state: Removes until only 1 point remains, then deletes scribble (lines 150-152)

### Delay behavior

- Active state: When idle and down to 1 point, resets delay (lines 139-140)
  - Allows trail to grow again if movement resumes
- Stopping state: Delay capped at 200ms (line 60)
  - Prevents long delays from making trail linger after stop

### Multiple scribbles

- Instance state limited to 5 scribbles (line 181)
- No automatic cleanup beyond this limit
- Tools typically only create one scribble at a time

### Frame rate independence

- 16ms throttle ensures consistent behavior (line 115)
- Point removal happens at ~60fps regardless of actual frame rate
- Delay countdown uses actual elapsed time (line 111)

## Test coverage

### ScribbleManager.test.ts highlights

- Lines 42-62: Default values verification
- Lines 135-160: Stop behavior and delay capping
- Lines 194-205: Point deduplication logic (distance >= 1)
- Lines 272-284: Starting state transition at 8 points
- Lines 305-317: Active state sliding window (add + remove)
- Lines 319-328: Idle shrinking behavior
- Lines 376-422: Stopping state shrink and removal
- Lines 499-511: 5 scribble limit enforcement
- Lines 582-608: Full lifecycle integration test

## Performance characteristics

### Memory

- Each point: ~24 bytes (3 doubles)
- Max 8+ points per scribble during active state
- Max 5 scribbles: ~1KB total (negligible)
- Points array mutated in place, then copied for store

### CPU

- One array operation per scribble per 16ms
- `shift()` is O(n) but n is small (8-20 points typically)
- `Vec.Dist()` calculation for deduplication: sqrt((x2-x1)^2 + (y2-y1)^2)
- `getStroke()` call on every render (can be expensive for long paths)

### Rendering

- SVG path updates every frame
- Variable-width stroke calculation via getStroke
- Path string generation via getSvgPathFromPoints
- No canvas 2D operations (pure SVG)

## Mathematical foundations

### Distance calculation (Vec.Dist)

```
distance = sqrt((x2 - x1)^2 + (y2 - y1)^2)
```

Used for point deduplication threshold (>= 1 pixel)

### Exponential decay (shrink)

```
size(t+1) = max(1, size(t) * (1 - shrink))
```

Half-life calculation for shrink=0.1:

- 0.9^n = 0.5
- n = ln(0.5) / ln(0.9) ≈ 6.6 frames
- At 60fps: ~110ms to half size

### Streamline interpolation

```
t = 0.15 + (1 - streamline) * 0.85
```

Controls smoothness of curve through points

- streamline=0: t=1.0 (no smoothing, angular)
- streamline=0.5: t=0.575 (moderate smoothing)
- streamline=1.0: t=0.15 (maximum smoothing, very curved)

## Related systems

### Editor integration

- ScribbleManager created in Editor constructor
- Accessed via `editor.scribbles`
- Tick called from Editor's animation frame loop

### Instance state

- Scribbles stored in editor instance state
- Triggers React re-renders when updated
- Immutable data structure required

### StateNode integration

- Tools (StateNode subclasses) create scribbles in onEnter
- Update scribbles on onPointerMove
- Stop scribbles in onExit
- Pattern: store scribbleId, call addPoint/stop as needed

### Geometry hit testing

- Eraser uses line segment hit testing (Erasing.ts, line 138)
  - `geometry.hitTestLineSegment(A, B, minDist)`
- Selection lasso uses same pattern (ScribbleBrushing.ts, line 141)
- Scribble path itself drives hit detection logic

## Potential extensions

### Use cases mentioned in article

- Touch gesture trails
- Loading indicators following cursor
- Path prediction based on motion
- Audio visualization with time window
- Debug overlays (frame timing, etc.)

### Implementation patterns

- Same delay queue approach
- Adjust delay for different persistence
- Adjust shrink for different fade effects
- Custom rendering for different visual styles
- Multiple concurrent trails (up to 5 limit)
