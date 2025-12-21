---
title: SVG paths from hand-drawn points - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - freehand
  - ink
---

# SVG paths from hand-drawn points: raw notes

Internal research notes for the freehand-ink.md article.

## Core problem

Raw pointer input generates discrete points at device-dependent sampling rates (60 Hz trackpad, 100+ Hz stylus). Direct line segments between points produce jagged, visually unappealing strokes. Need smooth curves that preserve the intended gesture.

## Solution: quadratic Bézier chain with averaged endpoints

**Key insight:** SVG quadratic Bézier curves (`Q`) can be chained smoothly by placing endpoints at the midpoint between consecutive input points and using original input points as control points.

### Mathematical basis

For three consecutive input points A, B, C:
- Control point: B (the actual input point)
- Start point: midpoint of A and B
- End point: midpoint of B and C

The quadratic curve from mid(A,B) to mid(B,C) with control point B naturally flows into the next curve because curves meet at their shared endpoint.

### SVG T command optimization

The `T` command ("smooth quadratic") reflects the previous control point across the current position to maintain tangent continuity. This allows chaining many curves with only endpoint coordinates - the browser infers all intermediate control points.

## Implementation details

### Core helper functions

**Location:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/primitives/utils.ts`

**Precision function (lines 351-353):**
```typescript
export function toDomPrecision(v: number) {
	return Math.round(v * 1e4) / 1e4
}
```
- Rounds to 4 decimal places (0.0001 precision)
- DOM rendering doesn't benefit from higher precision
- Reduces path string size

**Point formatting (line 4-6):**
```typescript
export function precise(A: VecLike) {
	return `${toDomPrecision(A.x)},${toDomPrecision(A.y)} `
}
```
- Formats point as "x,y " string with trailing space
- Used for actual input point positions

**Averaging function (line 9-11):**
```typescript
export function average(A: VecLike, B: VecLike) {
	return `${toDomPrecision((A.x + B.x) / 2)},${toDomPrecision((A.y + B.y) / 2)} `
}
```
- Returns formatted midpoint string
- Core of the smoothing algorithm

### Main path generation

**Location:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/utils/getSvgPathFromPoints.ts`

**Function signature (line 12):**
```typescript
export function getSvgPathFromPoints(points: VecLike[], closed = true): string
```

**Edge cases:**

1. **Less than 2 points (line 15-17):**
```typescript
if (len < 2) {
	return ''
}
```
Empty path - nothing to render

2. **Exactly 2 points (line 22-25):**
```typescript
if (len === 2) {
	return `M${precise(a)}L${precise(b)}`
}
```
Straight line - no smoothing possible

**Midpoint accumulation (line 29-33):**
```typescript
for (let i = 2, max = len - 1; i < max; i++) {
	a = points[i]
	b = points[i + 1]
	result += average(a, b)
}
```
- Starts at index 2 (third point)
- Stops at `len - 1` (second-to-last point)
- Accumulates midpoint strings for T command chain

**Open path format (line 45-48):**
```typescript
return `M${precise(points[0])}Q${precise(points[1])}${average(points[1], points[2])}${
	points.length > 3 ? 'T' : ''
}${result}L${precise(points[len - 1])}`
```

Breakdown:
- `M${precise(points[0])}` - Move to first point exactly
- `Q${precise(points[1])}` - Quadratic curve with points[1] as control
- `${average(points[1], points[2])}` - End at midpoint of points 1-2
- `${points.length > 3 ? 'T' : ''}` - Add T only if 4+ points
- `${result}` - Chain of averaged midpoints
- `L${precise(points[len - 1])}` - Line to last point exactly

**Why start/end at actual points:**
- User places pointer at specific start location - honor that
- User releases at specific end location - reach it exactly
- Only intermediate sections get smoothed

**Closed path format (line 37-40):**
```typescript
return `M${average(points[0], points[1])}Q${precise(points[1])}${average(
	points[1], points[2]
)}T${result}${average(points[len - 1], points[0])}${average(points[0], points[1])}Z`
```

Breakdown:
- `M${average(points[0], points[1])}` - Start at midpoint of first two points
- `Q${precise(points[1])}` - Control point at points[1]
- `${average(points[1], points[2])}` - End at midpoint
- `T${result}` - Chain through all intermediate midpoints
- `${average(points[len - 1], points[0])}` - Midpoint wrapping to start
- `${average(points[0], points[1])}` - Back to starting midpoint
- `Z` - Close path

**Why close at midpoints:**
- No "start" or "end" in a closed loop
- Starting/ending at midpoints ensures smooth closure
- Loop wraps seamlessly because start and end are the same calculated midpoint

## VecLike type definition

**Location:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/primitives/Vec.ts`

**Type (line 6):**
```typescript
export type VecLike = Vec | VecModel
```

**Vec class (line 9-14):**
```typescript
export class Vec {
	constructor(
		public x = 0,
		public y = 0,
		public z = 1
	) {}
```
- `x, y` - coordinates
- `z` - pressure value (default 1)
- `z` accessed via `pressure` getter (line 17-19)

## Pressure-sensitive variant

**Location:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/freehand/svg.ts`

**Function (line 12):**
```typescript
export function getSvgPathFromStrokePoints(points: StrokePoint[], closed = false): string
```

**Key difference:**
```typescript
let a = points[0].point
let b = points[1].point
```
StrokePoint wraps the actual Vec in a `.point` property. Otherwise identical algorithm.

**StrokePoint structure:**

**Location:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/freehand/types.ts` (line 41-49)

```typescript
export interface StrokePoint {
	point: Vec           // adjusted/smoothed position
	input: Vec           // original input position
	vector: Vec          // direction vector
	pressure: number     // normalized pressure 0-1
	distance: number     // distance from previous point
	runningLength: number // cumulative distance
	radius: number       // stroke radius at this point
}
```

Used by perfect-freehand library for variable-width strokes. The `getSvgPathFromStrokePoints` function processes outline points (the boundary of the stroke shape) rather than centerline points.

## Perfect-freehand integration

**getStroke pipeline:**

**Location:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/freehand/getStroke.ts` (line 18-23)

```typescript
export function getStroke(points: VecLike[], options: StrokeOptions = {}): Vec[] {
	return getStrokeOutlinePoints(
		setStrokePointRadii(getStrokePoints(points, options), options),
		options
	)
}
```

Pipeline stages:
1. `getStrokePoints` - convert raw input to StrokePoint array with metadata
2. `setStrokePointRadii` - calculate stroke width at each point based on pressure/velocity
3. `getStrokeOutlinePoints` - generate left and right boundary points
4. Returns outline points forming a closed polygon

The outline points are then fed to `getSvgPathFromStrokePoints` for smoothing.

### Pressure handling

**Location:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/freehand/getStrokePoints.ts`

**Constants (line 4-5):**
```typescript
const MIN_START_PRESSURE = 0.025
const MIN_END_PRESSURE = 0.01
```

**Pressure stripping (line 35-53):**
- Removes low-pressure points from start until pressure >= 0.025
- Removes low-pressure points from end until pressure >= 0.01
- Only when NOT simulating pressure
- Prevents wisps from stylus lift-off

**Point thinning (line 68-86):**
- Removes points too close to first point (within `size/3` distance)
- Removes points too close to last point (within `size/3` distance)
- Uses squared distance for performance: `Vec.Dist2(pt, pts[0]) > (size / 3) ** 2`
- Keeps maximum pressure value when merging points

**Streamline parameter (line 22, 28):**
```typescript
const streamline = 0.5
const t = 0.15 + (1 - streamline) * 0.85
```
- Controls interpolation between raw input and smoothed points
- Higher streamline = smoother but more latency
- Range: 0.15 to 1.0 (after transformation)

### Stroke options

**Location:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/draw/getPath.ts`

**Simulated pressure settings (line 16-25):**
```typescript
const simulatePressureSettings = (strokeWidth: number): StrokeOptions => {
	return {
		size: strokeWidth,
		thinning: 0.5,              // 50% pressure effect
		streamline: modulate(strokeWidth, [9, 16], [0.64, 0.74], true),
		smoothing: 0.62,
		easing: EASINGS.easeOutSine,
		simulatePressure: true,
	}
}
```

**Real pressure settings (line 27-36):**
```typescript
const realPressureSettings = (strokeWidth: number): StrokeOptions => {
	return {
		size: 1 + strokeWidth * 1.2,
		thinning: 0.62,             // 62% pressure effect
		streamline: 0.62,
		smoothing: 0.62,
		simulatePressure: false,
		easing: PEN_EASING,         // Custom curve
	}
}
```

**Pen easing (line 14):**
```typescript
const PEN_EASING = (t: number) => t * 0.65 + SIN((t * PI) / 2) * 0.35
```
- 65% linear, 35% sinusoidal
- Produces more natural pressure response for stylus

**Solid settings (line 38-47):**
```typescript
const solidSettings = (strokeWidth: number): StrokeOptions => {
	return {
		size: strokeWidth,
		thinning: 0,                // No thinning
		streamline: modulate(strokeWidth, [9, 16], [0.64, 0.74], true),
		smoothing: 0.62,
		simulatePressure: false,
		easing: EASINGS.linear,
	}
}
```
Used for solid line styles (not "draw" style).

## Scribble usage

**Location:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/components/default-components/DefaultScribble.tsx`

**Component (line 16-31):**
```typescript
export function DefaultScribble({ scribble, zoom, color, opacity, className }: TLScribbleProps) {
	if (!scribble.points.length) return null

	return (
		<svg className={className ? classNames('tl-overlays__item', className) : className}>
			<path
				className="tl-scribble"
				d={getSvgPathFromPoints(scribble.points, false)}
				stroke={color ?? `var(--tl-color-${scribble.color})`}
				fill="none"
				strokeWidth={8 / zoom}
				opacity={opacity ?? scribble.opacity}
			/>
		</svg>
	)
}
```

**Key details:**
- Uses `closed = false` for scribbles (always open paths)
- Stroke width inversely scaled by zoom: `8 / zoom` keeps visual size constant
- No fill - scribbles are strokes only
- Used for brush selection, laser pointer, and other temporary overlays

**Scribble point management:**

**Location:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts`

**Point addition (line 74-83):**
```typescript
addPoint(id: ScribbleItem['id'], x: number, y: number, z = 0.5) {
	const item = this.scribbleItems.get(id)
	if (!item) throw Error(`Scribble with id ${id} not found`)
	const { prev } = item
	const point = { x, y, z }
	if (!prev || Vec.Dist(prev, point) >= 1) {
		item.next = point
	}
	return item
}
```

**Point thinning:**
- Only adds point if distance from previous >= 1 pixel
- Prevents redundant points from overwhelming the path generation
- Happens before the quadratic smoothing

## Draw shape implementation

**Location:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/draw/DrawShapeUtil.tsx`

**Geometry calculation (line 105-109):**
```typescript
const strokePoints = getStrokePoints(
	points,
	getFreehandOptions(shape.props, sw, shape.props.isPen, true)
).map((p) => p.point)
```
- Processes all segment points through freehand pipeline
- Extracts just the `.point` field (center of stroke)
- Used for hit testing and bounds calculation

**Stroke width (line 90):**
```typescript
const sw = (STROKE_SIZES[shape.props.size] + 1) * shape.props.scale
```

**STROKE_SIZES constant:**

**Location:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/default-shape-constants.ts` (line 13-18)

```typescript
export const STROKE_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 2,
	m: 3.5,
	l: 5,
	xl: 10,
}
```

Base sizes in pixels, multiplied by shape scale factor.

**Dot detection (line 93-103):**
```typescript
if (shape.props.segments.length === 1) {
	const box = Box.FromPoints(points)
	if (box.width < sw * 2 && box.height < sw * 2) {
		return new Circle2d({
			x: -sw,
			y: -sw,
			radius: sw,
			isFilled: true,
		})
	}
}
```
If single segment fits within stroke width, treat as dot instead of line.

## Performance characteristics

**Time complexity:**
- O(n) where n = number of points
- Single pass through points array
- String concatenation per point

**String concatenation:**
- Modern JavaScript engines optimize string concatenation
- Template literals compile to efficient concatenation
- Resulting path string parsed once by SVG engine

**Typical point counts:**
- Short gesture: 10-50 points
- Medium stroke: 50-200 points
- Long freehand: 200-600 points (maxPointsPerShape limit)

**Max points per shape:**

**Location:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/draw/DrawShapeUtil.tsx` (line 53-55)

```typescript
override options: DrawShapeOptions = {
	maxPointsPerShape: 600,
}
```

When drawing exceeds 600 points, tool begins a new shape. Prevents performance degradation on very long continuous strokes.

**Path generation timing:**
- Tens of points: < 0.1ms
- Hundreds of points: < 1ms
- Main cost is SVG rendering, not path string generation

## Why quadratic instead of cubic?

**Cubic Bézier (`C` command):**
- Two control points per segment
- More control, but requires more computation
- More complex tangent continuity calculations
- Generates longer path strings (more coordinates)

**Quadratic Bézier (`Q` command):**
- One control point per segment
- Natural C1 continuity with averaged endpoints
- Simpler math, faster parsing
- Shorter path strings
- T command enables extreme compression (just endpoints)

For smoothing discrete point samples, quadratic curves provide sufficient quality with better performance.

## Alternative approaches considered

**Catmull-Rom splines:**
- Pass through all control points (we want smoothing, not interpolation)
- More complex to convert to SVG commands
- No native SVG support (must approximate with Béziers)

**Cubic Bézier with calculated control points:**
- Could achieve slightly smoother curves
- Significant additional computation
- Negligible visual benefit for typical use cases
- No T-command equivalent for cubic (must specify both control points)

**Direct line segments:**
- Simplest approach, fastest generation
- Visually poor - jagged, artificial looking
- Unacceptable for hand-drawn aesthetic

## SVG T command technical details

**From SVG specification:**
- T (smooth quadratic) command
- Assumes previous command was Q or T
- Reflects previous control point across current position
- Creates smooth curve with automatic tangent matching

**Example expansion:**
```
Q10,10 15,15 T20,20 T25,25
```
Equivalent to:
```
Q10,10 15,15 Q20,20 20,20 Q25,25 25,25
```
(Browser calculates intermediate control points automatically)

**Why this works for chained midpoints:**
- Each endpoint is equidistant from surrounding input points
- Reflection naturally produces correct control point position
- No need to manually calculate or store control points
- Massive reduction in path data size

## svgInk advanced variant

**Location:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/freehand/svgInk.ts`

More sophisticated variant that:
- Partitions stroke at sharp angles ("elbows")
- Renders each partition separately
- Adds rounded caps at partition endpoints
- Prevents overlap artifacts at hard corners

**Elbow detection (line 44):**
```typescript
if (dpr < -0.8) {
	// acute angle detected
}
```
`dpr` = dot product of consecutive direction vectors. Values < -0.8 indicate sharp reversal (> 143° turn).

**Partition rendering (line 163):**
```typescript
let svg = `M${precise(left[0])}T`
```
Uses same T command chain for left track, right track, with arc caps.

This addresses visual artifacts when basic path approach produces overlapping segments at sharp corners.

## Integration points

**Where simple smoothing is used:**
- Scribbles (brush selection, laser pointer)
- Simple polylines without pressure
- Preview paths during drawing

**Where stroke points variant is used:**
- Draw shapes with "draw" style
- Any shape with simulated or real pressure
- Highlight shapes
- Variable-width strokes

Both use the same quadratic smoothing algorithm, just different input data structures.

## Constants summary

**toDomPrecision:** 4 decimal places (1e4 multiplier)
**MIN_START_PRESSURE:** 0.025
**MIN_END_PRESSURE:** 0.01
**Point thinning threshold:** size / 3
**Scribble point minimum distance:** 1 pixel
**Max points per draw shape:** 600
**Stroke sizes:** s=2, m=3.5, l=5, xl=10 pixels
**Scribble stroke width:** 8 / zoom

## Key source files

- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/utils/getSvgPathFromPoints.ts` - Main algorithm for simple points
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/primitives/utils.ts` - Helper functions (average, precise, toDomPrecision)
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/freehand/svg.ts` - Variant for stroke points
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/freehand/svgInk.ts` - Advanced variant with elbow detection
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/freehand/getStroke.ts` - Perfect-freehand entry point
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/freehand/getStrokePoints.ts` - Point processing and thinning
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/freehand/getStrokeOutlinePoints.ts` - Outline generation
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/freehand/types.ts` - Type definitions
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/draw/DrawShapeUtil.tsx` - Draw shape implementation
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/draw/getPath.ts` - Stroke options configuration
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/components/default-components/DefaultScribble.tsx` - Scribble rendering
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts` - Scribble point management
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/primitives/Vec.ts` - Vector type definitions
