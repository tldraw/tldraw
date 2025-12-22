---
title: Edge scrolling - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - edge
  - scrolling
status: published
date: 12/21/2025
order: 3
---

# Edge scrolling: raw notes

Internal research notes for the edge-scrolling.md article.

## Core problem

Edge scrolling must work seamlessly for both mouse (precise, single-pixel pointer) and touch (imprecise, finger-sized contact area). The browser only reports the center point of a touch contact, but the actual contact area can reach 12 pixels from center. Without compensation, touch users would need to push their finger past the viewport edge to trigger scrolling, creating a frustrating experience.

## Pointer width compensation

**Touch contact area reality:**

- Browser reports only the center point of touch contact
- Actual finger contact area extends roughly 12 pixels in all directions from center
- User's finger might reach viewport edge before the reported center point does
- Edge scrolling triggered only by reported position would be too late for touch users

**Implementation:**
Located in `packages/editor/src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.ts:64-84`

```typescript
private getEdgeProximityFactors(
    position: number,
    dimension: number,
    isCoarse: boolean,
    insetStart: boolean,
    insetEnd: boolean
) {
    const { editor } = this
    const dist = editor.options.edgeScrollDistance
    const pw = isCoarse ? editor.options.coarsePointerWidth : 0 // pointer width
    const pMin = position - pw
    const pMax = position + pw
    const min = insetStart ? 0 : dist
    const max = insetEnd ? dimension : dimension - dist
    if (pMin < min) {
        return Math.min(1, (min - pMin) / dist)
    } else if (pMax > max) {
        return -Math.min(1, (pMax - max) / dist)
    }
    return 0
}
```

**Key constants:**
From `packages/editor/src/lib/options.ts:136-140`:

```typescript
edgeScrollDelay: 200,           // ms before scrolling starts
edgeScrollEaseDuration: 200,    // ms to ramp from 0 to full speed
edgeScrollSpeed: 25,            // base pixel speed per tick
edgeScrollDistance: 8,          // edge zone width in pixels
coarsePointerWidth: 12,         // touch pointer width extension in pixels
```

**Pointer width logic:**

- Mouse: `pw = 0`, pointer treated as single pixel
- Touch: `pw = 12`, creates effective range `[position - 12, position + 12]`
- Proximity calculation uses `pMin` for left/top edges, `pMax` for right/bottom edges
- Touch pointer at x=20 with edge zone at x=8: `pMin = 20 - 12 = 8`, triggers scrolling
- Mouse pointer at x=20 with edge zone at x=8: `pMin = 20 - 0 = 20`, does not trigger

**Coarse pointer detection:**
From `packages/tlschema/src/records/TLInstance.ts:64-68`:

```typescript
/**
 * This is whether the primary input mechanism includes a pointing device of limited accuracy,
 * such as a finger on a touchscreen.
 */
isCoarsePointer: boolean
```

Stored in instance state, determined by CSS media query `@media (pointer: coarse)`.

## Two-phase acceleration timing

**Phase 1: Delay (0-200ms)**

- No camera movement
- Prevents accidental triggers when dragging near edge
- Timer starts when entering edge zone
- Resets to zero if leaving edge zone

**Phase 2: Cubic ease-in (200-400ms)**

- Velocity ramps from 0 to full speed using t³ curve
- Total duration: 200ms delay + 200ms ease = 400ms to full speed

**Cubic easing implementation:**
From `packages/editor/src/lib/primitives/easings.ts:7`:

```typescript
easeInCubic: (t: number) => t * t * t,
```

From `EdgeScrollManager.ts:36-46`:

```typescript
if (this._edgeScrollDuration > editor.options.edgeScrollDelay) {
	const eased =
		editor.options.edgeScrollEaseDuration > 0
			? EASINGS.easeInCubic(
					Math.min(
						1,
						this._edgeScrollDuration /
							(editor.options.edgeScrollDelay + editor.options.edgeScrollEaseDuration)
					)
				)
			: 1
	this.moveCameraWhenCloseToEdge({
		x: edgeScrollProximityFactor.x * eased,
		y: edgeScrollProximityFactor.y * eased,
	})
}
```

**Why cubic curve:**

- Linear ramp (t): 50% speed at 50% time
- Cubic curve (t³): 12.5% speed at 50% time (0.5³ = 0.125)
- Front-loads the slow phase where users need fine control
- Hard acceleration in second half

**Timing breakdown:**

- 0-200ms: Delay, no motion, `eased = 0`
- 200-300ms: Slow phase, eased = 0.000 to 0.125 (0-12.5% speed)
- 300-400ms: Fast acceleration, eased = 0.125 to 1.0 (12.5-100% speed)
- 400ms+: Full speed sustained

**Duration accumulation:**
From `EdgeScrollManager.ts:22-35`:

```typescript
updateEdgeScrolling(elapsed: number) {
    const { editor } = this
    const edgeScrollProximityFactor = this.getEdgeScroll()
    if (edgeScrollProximityFactor.x === 0 && edgeScrollProximityFactor.y === 0) {
        if (this._isEdgeScrolling) {
            this._isEdgeScrolling = false
            this._edgeScrollDuration = 0
        }
    } else {
        if (!this._isEdgeScrolling) {
            this._isEdgeScrolling = true
            this._edgeScrollDuration = 0
        }
        this._edgeScrollDuration += elapsed
        // ... apply scrolling
    }
}
```

Duration resets to 0 when leaving edge zone, fresh delay on re-entry.

## Proximity factor calculation

**Algorithm:**
From `EdgeScrollManager.ts:78-83`:

```typescript
if (pMin < min) {
	return Math.min(1, (min - pMin) / dist)
} else if (pMax > max) {
	return -Math.min(1, (pMax - max) / dist)
}
return 0
```

**Left/top edge (pMin < min):**

- Returns positive value 0-1
- At edge zone boundary: `proximity = (min - pMin) / dist = 0 / 8 = 0`
- Halfway into zone: `proximity = 4 / 8 = 0.5`
- At viewport edge: `proximity = 8 / 8 = 1.0`
- Beyond edge: clamped at 1.0

**Right/bottom edge (pMax > max):**

- Returns negative value 0 to -1
- Sign indicates scroll direction
- Same distance calculation but negative result

**Touch example:**

- Edge zone extends 8 pixels from left edge
- Touch pointer at x=20, coarsePointerWidth=12
- `pMin = 20 - 12 = 8`
- `pMin < min` check: `8 < 8` is false
- Just outside edge zone, no scrolling
- Touch pointer at x=19: `pMin = 7`, `proximity = (8-7)/8 = 0.125`
- Touch pointer at x=12: `pMin = 0`, `proximity = (8-0)/8 = 1.0`

**Mouse example:**

- Same edge zone at 8 pixels
- Mouse pointer at x=8, coarsePointerWidth=0
- `pMin = 8 - 0 = 8`
- `pMin < min` check: `8 < 8` is false
- Exactly at boundary, no scrolling
- Mouse pointer at x=7: `pMin = 7`, `proximity = (8-7)/8 = 0.125`
- Mouse pointer at x=4: `proximity = (8-4)/8 = 0.5`

**Combining easing and proximity:**
Final velocity factor = `eased × proximity`

Example at 300ms (100ms into ease), 4 pixels from edge:

- `eased = 0.5³ = 0.125`
- `proximity = 4/8 = 0.5`
- `velocity_factor = 0.125 × 0.5 = 0.0625` (6.25% of max speed)

Move 2 pixels closer:

- `eased = 0.125` (unchanged)
- `proximity = 6/8 = 0.75`
- `velocity_factor = 0.125 × 0.75 = 0.09375` (9.375% of max speed)

## Screen size factor: the 0.612 mystery

**Implementation:**
From `EdgeScrollManager.ts:122-123`:

```typescript
const screenSizeFactorX = screenBounds.w < 1000 ? 0.612 : 1
const screenSizeFactorY = screenBounds.h < 1000 ? 0.612 : 1
```

**Mathematical significance:**

- 0.612 ≈ 1/φ ≈ 0.618
- φ (phi) is the golden ratio ≈ 1.618
- 1/φ = (√5 - 1)/2 ≈ 0.618
- Whether intentional or empirical is unclear from code

**Practical effect:**

- Screens under 1000px in dimension get ~38.8% speed reduction (multiply by 0.612)
- Full-speed edge scrolling on phone-sized screens is disorienting
- Reduction makes scrolling feel controlled on small viewports

**Independent axis application:**

- 800×1200 screen: X-axis reduced (0.612), Y-axis full speed (1.0)
- 1200×800 screen: X-axis full speed (1.0), Y-axis reduced (0.612)
- 600×400 screen: Both axes reduced (0.612)

**Threshold rationale:**

- 1000px chosen as rough boundary between mobile/desktop viewport sizes
- Most phones under 1000px in both dimensions
- Most desktops/tablets over 1000px in at least one dimension

## Zoom level compensation

**Implementation:**
From `EdgeScrollManager.ts:126-129`:

```typescript
const zoomLevel = editor.getZoomLevel()
const pxSpeed = editor.user.getEdgeScrollSpeed() * editor.options.edgeScrollSpeed
const scrollDeltaX = (pxSpeed * proximityFactor.x * screenSizeFactorX) / zoomLevel
const scrollDeltaY = (pxSpeed * proximityFactor.y * screenSizeFactorY) / zoomLevel
```

**Why divide by zoom:**

- At 2× zoom, canvas coordinate space is magnified
- Moving camera 10 pixels covers only 5 pixels of visible canvas
- Dividing by zoom keeps perceived scroll speed constant
- Visual rate of change remains same regardless of zoom level

**Example:**

- Base speed: 25 pixels/tick
- Proximity: 1.0 (at edge)
- Screen factor: 1.0 (large screen)
- Easing: 1.0 (after 400ms)

Zoom 1×: `delta = (25 × 1.0 × 1.0) / 1.0 = 25` canvas units
Zoom 2×: `delta = (25 × 1.0 × 1.0) / 2.0 = 12.5` canvas units

On screen, both appear to scroll at same visual speed.

## User preference multiplier

**User edge scroll speed:**
From `packages/editor/src/lib/editor/managers/UserPreferencesManager/UserPreferencesManager.ts:73-75`:

```typescript
@computed getEdgeScrollSpeed() {
    return this.user.userPreferences.get().edgeScrollSpeed ?? defaultUserPreferences.edgeScrollSpeed
}
```

From `packages/editor/src/lib/config/TLUserPreferences.ts:164`:

```typescript
edgeScrollSpeed: 1,  // default multiplier
```

**Integration:**
From `EdgeScrollManager.ts:127`:

```typescript
const pxSpeed = editor.user.getEdgeScrollSpeed() * editor.options.edgeScrollSpeed
```

- User preference is multiplier (default 1.0)
- Final speed: `25 × user_preference × proximity × easing × screen_factor / zoom`
- User preference of 0 disables edge scrolling
- User preference of 2 doubles speed

**Storage:**
From `TLUserPreferences.ts:21`:

```typescript
edgeScrollSpeed?: number | null
```

Stored in browser localStorage, migrated across schema versions.

## Viewport insets

**Purpose:**
UI elements (toolbars, sidebars) may cover viewport edges. Insets disable edge scrolling on those edges.

**Structure:**
From `packages/tlschema/src/records/TLInstance.ts:56`:

```typescript
insets: boolean[]  // [top, right, bottom, left]
```

**Usage:**
From `EdgeScrollManager.ts:91-96`:

```typescript
const {
	isCoarsePointer,
	insets: [t, r, b, l],
} = editor.getInstanceState()
const proximityFactorX = this.getEdgeProximityFactors(x, screenBounds.w, isCoarsePointer, l, r)
const proximityFactorY = this.getEdgeProximityFactors(y, screenBounds.h, isCoarsePointer, t, b)
```

From `EdgeScrollManager.ts:76-77`:

```typescript
const min = insetStart ? 0 : dist
const max = insetEnd ? dimension : dimension - dist
```

**Effect:**

- `insetStart = true` for left/top: Sets edge zone boundary at 0 (completely disabled)
- `insetEnd = true` for right/bottom: Sets edge zone boundary at dimension (completely disabled)
- Prevents edge scrolling under UI elements

## Activation conditions

**Three required conditions:**
From `EdgeScrollManager.ts:110-115`:

```typescript
if (
	!editor.inputs.getIsDragging() ||
	editor.inputs.getIsPanning() ||
	editor.getCameraOptions().isLocked
)
	return
```

1. **Must be dragging:** `editor.inputs.getIsDragging() === true`
   - Dragging a shape, selection, or other object
   - Not just hovering or moving cursor

2. **Must not be panning:** `editor.inputs.getIsPanning() === false`
   - Panning is explicit camera movement (two-finger touch, middle mouse)
   - Edge scroll would conflict with user's pan gesture

3. **Camera must be unlocked:** `editor.getCameraOptions().isLocked === false`
   - Locked camera prevents all movement
   - No point in edge scrolling if camera can't move

**When these fail:**

- Returns early, no camera movement applied
- Edge scroll state may still update (timer continues)

## Camera update mechanism

**Implementation:**
From `EdgeScrollManager.ts:131-133`:

```typescript
const { x, y, z } = editor.getCamera()
editor.setCamera(new Vec(x + scrollDeltaX, y + scrollDeltaY, z))
```

**Vec class:**
From `packages/editor/src/lib/primitives/Vec.ts:9-14`:

```typescript
export class Vec {
	constructor(
		public x = 0,
		public y = 0,
		public z = 1
	) {}
}
```

- x, y: Camera position in canvas coordinate space
- z: Zoom level (preserved, not modified by edge scroll)
- Camera position is top-left corner of viewport in canvas space

**Delta application:**

- Positive scrollDeltaX: Camera moves right, canvas appears to move left
- Negative scrollDeltaX: Camera moves left, canvas appears to move right
- Same for Y axis

**Screen point to canvas space:**
From `EdgeScrollManager.ts:88-89`:

```typescript
const { x, y } = editor.inputs.getCurrentScreenPoint()
const screenBounds = editor.getViewportScreenBounds()
```

Uses screen coordinates (pixels from top-left of viewport) for proximity calculations.

## Edge case handling

**Zero elapsed time:**
From test file `EdgeScrollManager.test.ts:344-347`:

```typescript
it('should handle negative elapsed time', () => {
	mockInputs.setCurrentScreenPoint(new Vec(5, 300))
	expect(() => edgeScrollManager.updateEdgeScrolling(-16)).not.toThrow()
})
```

Negative or zero elapsed doesn't break, but won't advance timer.

**Zero user speed:**
From test file `EdgeScrollManager.test.ts:356-367`:

```typescript
it('should handle zero user edge scroll speed', () => {
	editor.user.getEdgeScrollSpeed.mockReturnValue(0)
	mockInputs.setCurrentScreenPoint(new Vec(5, 300))
	edgeScrollManager.updateEdgeScrolling(300)
	if (editor.setCamera.mock.calls.length > 0) {
		const callArgs = editor.setCamera.mock.calls[0][0] as Vec
		expect(callArgs.x).toBe(0)
		expect(callArgs.y).toBe(0)
	}
})
```

Zero speed results in zero delta, effectively disabling edge scroll.

**Extreme zoom levels:**
From test file `EdgeScrollManager.test.ts:369-377`:

```typescript
it('should handle extreme zoom levels', () => {
	mockInputs.setCurrentScreenPoint(new Vec(5, 300))
	editor.getZoomLevel.mockReturnValue(0.01) // Very zoomed out
	expect(() => edgeScrollManager.updateEdgeScrolling(300)).not.toThrow()
	editor.getZoomLevel.mockReturnValue(100) // Very zoomed in
	expect(() => edgeScrollManager.updateEdgeScrolling(300)).not.toThrow()
})
```

Division by zoom handles extreme values without crashing.

**Corner proximity:**
From test file `EdgeScrollManager.test.ts:206-214`:

```typescript
it('should handle corner proximity (both x and y)', () => {
	mockInputs.setCurrentScreenPoint(new Vec(5, 5))
	edgeScrollManager.updateEdgeScrolling(300)
	expect(editor.setCamera).toHaveBeenCalled()
	const callArgs = editor.setCamera.mock.calls[0][0] as Vec
	expect(callArgs.x).toBeGreaterThan(0) // Should scroll right
	expect(callArgs.y).toBeGreaterThan(0) // Should scroll down
})
```

X and Y proximity calculated independently, can scroll diagonally.

## State tracking

**Private state variables:**
From `EdgeScrollManager.ts:9-10`:

```typescript
private _isEdgeScrolling = false
private _edgeScrollDuration = -1
```

**Public accessor:**
From `EdgeScrollManager.ts:12-14`:

```typescript
getIsEdgeScrolling() {
    return this._isEdgeScrolling
}
```

**State transitions:**

- Not scrolling → Scrolling: When proximity factor becomes non-zero
- Scrolling → Not scrolling: When proximity factor returns to zero
- Duration resets to 0 on each transition

From `EdgeScrollManager.ts:25-34`:

```typescript
if (edgeScrollProximityFactor.x === 0 && edgeScrollProximityFactor.y === 0) {
	if (this._isEdgeScrolling) {
		this._isEdgeScrolling = false
		this._edgeScrollDuration = 0
	}
} else {
	if (!this._isEdgeScrolling) {
		this._isEdgeScrolling = true
		this._edgeScrollDuration = 0
	}
	this._edgeScrollDuration += elapsed
}
```

## Tick integration

**Update frequency:**
Edge scroll manager runs on every editor tick during drag operations. From context in article:

> The edge scroll manager runs on every editor tick while these conditions are met.

**Typical tick rate:**
~60 FPS (16-17ms per tick) for smooth animation.

**Test elapsed values:**
From test file examples:

- 16ms: Single frame at 60 FPS
- 100ms: Multiple frames accumulated
- 200ms: Delay threshold
- 300ms: Past delay, into easing phase

## Formula summary

**Final scroll delta calculation:**

```
scrollDelta = (baseSpeed × userPref × proximity × easing × screenFactor) / zoom
```

Where:

- `baseSpeed` = 25 (from options.edgeScrollSpeed)
- `userPref` = User preference multiplier (default 1.0)
- `proximity` = Distance factor 0-1 from edge zone calculation
- `easing` = Cubic ease value 0-1 from duration calculation
- `screenFactor` = 0.612 if dimension < 1000px, else 1.0
- `zoom` = Current zoom level

**Example maximum speed (large screen, 1× zoom, at edge, after 400ms):**

```
scrollDelta = (25 × 1.0 × 1.0 × 1.0 × 1.0) / 1.0 = 25 pixels per tick
```

At 60 FPS: 25 × 60 = 1500 pixels/second

**Example slow speed (small screen, 2× zoom, halfway into zone, 250ms elapsed):**

```
easing at 250ms: (250 / 400)³ = 0.625³ = 0.244
proximity halfway: 0.5
scrollDelta = (25 × 1.0 × 0.5 × 0.244 × 0.612) / 2.0 = 0.93 pixels per tick
```

At 60 FPS: 0.93 × 60 = 56 pixels/second

## Constants tuning notes

From article conclusion:

> The implementation is straightforward—a few dozen lines of math—but getting the constants right (8-pixel zone, 200ms delay, 200ms ease, 12-pixel touch width, 0.612 small screen factor) required real-world testing. Change any one of these and the feel degrades noticeably.

**Critical constants:**

- `edgeScrollDistance: 8` - Too small: hard to trigger. Too large: triggers accidentally
- `edgeScrollDelay: 200` - Too short: triggers accidentally. Too long: feels laggy
- `edgeScrollEaseDuration: 200` - Too short: jarring acceleration. Too long: sluggish
- `coarsePointerWidth: 12` - Based on typical finger contact area
- Screen size factor `0.612` - Empirically tuned (or mathematical constant)
- Screen size threshold `1000` - Rough mobile/desktop boundary

## Key source files

- `packages/editor/src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.ts` - Main implementation (135 lines)
- `packages/editor/src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.test.ts` - Comprehensive test suite (425 lines)
- `packages/editor/src/lib/options.ts:136-140` - Configuration defaults
- `packages/editor/src/lib/primitives/easings.ts:7` - Cubic easing function
- `packages/editor/src/lib/editor/managers/UserPreferencesManager/UserPreferencesManager.ts:73-75` - User preference getter
- `packages/editor/src/lib/config/TLUserPreferences.ts:164` - Default user preference
- `packages/tlschema/src/records/TLInstance.ts:56,64-68` - Instance state (insets, isCoarsePointer)
- `packages/editor/src/lib/primitives/Vec.ts` - Vector class for camera updates
