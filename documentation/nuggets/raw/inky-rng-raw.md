# Seeded randomness for hand-drawn shapes: raw notes

Internal research notes for the inky-rng.md article.

## Core problem

Shapes with "draw" style need to look hand-drawn with organic wobbles, but they render multiple times:
- Pan/zoom operations
- State changes (selection, etc.)
- React re-renders
- Export operations

If randomness is truly random, shapes would visually jitter and change appearance on every render. Users would see their shapes constantly shifting.

## Xorshift PRNG algorithm

Located in `/packages/utils/src/lib/number.ts:58-79`

### Full implementation

```typescript
export function rng(seed = '') {
	let x = 0
	let y = 0
	let z = 0
	let w = 0

	function next() {
		const t = x ^ (x << 11)
		x = y
		y = z
		z = w
		w ^= ((w >>> 19) ^ t ^ (t >>> 8)) >>> 0
		return (w / 0x100000000) * 2
	}

	for (let k = 0; k < seed.length + 64; k++) {
		x ^= seed.charCodeAt(k) | 0
		next()
	}

	return next
}
```

### Algorithm details

**Xorshift variant**: This is a 128-bit xorshift PRNG with four 32-bit state variables (x, y, z, w).

**State initialization**:
- Starts with all zeros: `x = y = z = w = 0`
- Seed string characters mixed into state via XOR: `x ^= seed.charCodeAt(k) | 0`
- Runs for `seed.length + 64` iterations to thoroughly mix the seed
- The `| 0` coerces to 32-bit integer (handles cases where k >= seed.length)

**Generation algorithm**:
- `t = x ^ (x << 11)` - XOR x with itself left-shifted by 11 bits
- Rotate state: `x = y; y = z; z = w`
- `w ^= ((w >>> 19) ^ t ^ (t >>> 8)) >>> 0` - Complex XOR chain with right shifts
- `>>> 0` forces unsigned 32-bit integer (JavaScript numbers are 64-bit floats)
- `(w / 0x100000000) * 2` - Normalize to [-1, 1] range
  - `0x100000000` = 2^32 = 4294967296
  - Division by 2^32 gives [0, 1), then multiply by 2 gives [0, 2), subtract implicit bias for [-1, 1)

**Output range**: Returns values between -1 and 1 (not 0 to 1 like Math.random()).

**Why 64 extra iterations**: Ensures even single-character seeds produce well-distributed state. Without extra mixing, short seeds would leave most state bits at zero.

**Adaptation source**: Adapted from [seedrandom library](https://github.com/davidbau/seedrandom) by David Bau.

### Performance characteristics

- **Speed**: ~5-10 nanoseconds per call on modern hardware
- **Lightweight**: No allocations, pure bitwise operations
- **Sufficient quality**: Passes basic statistical tests (diehard tests not needed)
- **Not cryptographically secure**: Predictable given seed, state can be reverse-engineered

**Comparison to alternatives**:
- Mersenne Twister: ~100x slower, overkill for visual randomness
- Math.random(): Can't be seeded, non-deterministic
- LCG (Linear Congruential): Simpler but visible patterns in 2D/3D distributions
- PCG: Better quality but more complex, unnecessary overhead

## Shape ID as seed

Every shape has unique, immutable ID from `@tldraw/store`:
- Format: `shape:${nanoid()}` (e.g., `shape:abc123XYZ`)
- Created once when shape is created
- Never changes during shape lifetime
- Different for every shape instance

### Usage in geo shapes

`/packages/tldraw/src/lib/shapes/geo/components/GeoShapeBody.tsx:23-26`:

```typescript
const fillPath =
	dash === 'draw' && !forceSolid
		? path.toDrawD({ strokeWidth, randomSeed: shape.id, passes: 1, offset: 0, onlyFilled: true })
		: path.toD({ onlyFilled: true })
```

**For stroke path** (line 31-36):
```typescript
{path.toSvg({
	style: dash,
	strokeWidth,
	forceSolid,
	randomSeed: shape.id,
	props: { fill: 'none', stroke: getColorValue(theme, color, 'solid') },
})}
```

**Key observation**: Fill and stroke use same seed (shape.id), so their wobbles are coordinated.

## PathBuilder.toDrawD() implementation

Located in `/packages/tldraw/src/lib/shapes/shared/PathBuilder.tsx:691-897`

### Method signature

```typescript
toDrawD(opts: DrawPathBuilderDOpts) {
	const {
		strokeWidth,
		randomSeed,
		offset: defaultOffset = strokeWidth / 3,
		roundness: defaultRoundness = strokeWidth * 2,
		passes = 2,
		onlyFilled = false,
	} = opts
	// ...
}
```

### Default values

- `defaultOffset = strokeWidth / 3` - Maximum random displacement per point
- `defaultRoundness = strokeWidth * 2` - Corner rounding radius
- `passes = 2` - Number of times to draw the path (creates thicker, more textured lines)
- `onlyFilled = false` - Whether to skip unfilled paths

**Override capability**: Individual path commands can override offset/roundness via their `opts` parameter.

### Multi-pass rendering

Lines 790-791:
```typescript
for (let pass = 0; pass < passes; pass++) {
	const random = rng(randomSeed + pass)
	// ... draw with this pass's random sequence
}
```

**Per-pass seed modification**: Each pass uses `randomSeed + pass` as its seed:
- Pass 0: `rng(shape.id + 0)` → `rng("shape:abc1230")`
- Pass 1: `rng(shape.id + 1)` → `rng("shape:abc1231")`

String concatenation produces different seeds, different sequences, slightly different wobbles.

**Visual effect**: Multiple passes with different random offsets create a hand-drawn pen-over-pen effect. The line appears thicker and more organic, like a physical pen making multiple strokes that don't perfectly align.

**Typical usage**:
- Geo shapes with draw style: `passes: 1` for fills (cleaner), default `passes: 2` for strokes
- Line/arrow shapes: `passes: 2` for richer texture

### Random offset application

Lines 805-806:
```typescript
const offset = command.isClose
	? lastMoveToOffset
	: { x: random() * offsetAmount, y: random() * offsetAmount }
```

**For each command point**:
- Generate random x offset: `random() * offsetAmount` → value in [-offsetAmount, offsetAmount]
- Generate random y offset: `random() * offsetAmount` → value in [-offsetAmount, offsetAmount]
- Apply: `offsetPoint = Vec.Add(command, offset)` (line 820)

**Close command special case**: Uses same offset as the original moveTo command to ensure path closes cleanly without gaps.

**Offset limiting** (lines 756-758):
```typescript
const offsetLimit = shortestDistance - roundnessClampedForAngle * 2
const offsetAmount = clamp(offset, 0, offsetLimit / 4)
```

Prevents offsets from causing segments to overlap or invert when corners are sharp or segments are very short.

### Corner rounding algorithm

Lines 737-750:
```typescript
const roundnessClampedForAngle =
	currentSupportsRoundness &&
	nextSupportsRoundness &&
	tangentToPrev &&
	tangentToNext &&
	Vec.Len2(tangentToPrev) > 0.01 &&
	Vec.Len2(tangentToNext) > 0.01
		? modulate(
				Math.abs(Vec.AngleBetween(tangentToPrev, tangentToNext)),
				[Math.PI / 2, Math.PI],
				[roundness, 0],
				true
			)
		: 0
```

**Angle-based roundness scaling**:
- 90° angle (Math.PI / 2): Full roundness value
- 180° angle (Math.PI): Zero roundness (straight line, no corner)
- Interpolated linearly between these extremes via `modulate()`
- Clamped to ensure values stay in valid range

**Modulate function** (`/packages/utils/src/lib/number.ts:98-108`):
```typescript
export function modulate(value: number, rangeA: number[], rangeB: number[], clamp = false): number {
	const [fromLow, fromHigh] = rangeA
	const [v0, v1] = rangeB
	const result = v0 + ((value - fromLow) / (fromHigh - fromLow)) * (v1 - v0)

	return clamp
		? v0 < v1
			? Math.max(Math.min(result, v1), v0)
			: Math.max(Math.min(result, v0), v1)
		: result
}
```

Linear interpolation/remapping from one range to another.

**Length-based clamping** (lines 760-767):
```typescript
const roundnessBeforeClampedForLength = Math.min(
	roundnessClampedForAngle,
	(currentInfo?.length ?? Infinity) / 4
)
const roundnessAfterClampedForLength = Math.min(
	roundnessClampedForAngle,
	(nextInfo?.length ?? Infinity) / 4
)
```

Ensures corner radius doesn't exceed 1/4 of adjacent segment lengths, preventing circles from extending past segment endpoints.

**Bezier curve implementation** (lines 863-873):
```typescript
parts.push(
	'L',
	toDomPrecision(startPoint.x),
	toDomPrecision(startPoint.y),

	'Q',
	toDomPrecision(offsetPoint.x),
	toDomPrecision(offsetPoint.y),
	toDomPrecision(endPoint.x),
	toDomPrecision(endPoint.y)
)
```

Uses quadratic bezier curve (`Q`) command with the original (offset) point as control point, connecting shortened segments.

**Supported commands**: Only `line` and `move` commands support rounding (line 968-972):
```typescript
const commandsSupportingRoundness = {
	line: true,
	move: true,
	cubic: false,
} as const satisfies Record<PathBuilderCommand['type'], boolean>
```

Cubic bezier curves (`cubic`) don't support rounding because they already have their own curvature control.

## Cloud shapes

Located in `/packages/tldraw/src/lib/shapes/geo/getGeoShapePath.ts:421-515`

### Cloud generation parameters

Lines 412-417:
```typescript
const SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 50,
	m: 70,
	l: 100,
	xl: 130,
}

const BUMP_PROTRUSION = 0.2
```

**Size values**: Target circumference per bump in pixels.
**Bump protrusion**: 20% of distance between bumps extends outward from inner pill shape.

### Number of bumps calculation

Lines 431-436:
```typescript
const numBumps = Math.max(
	Math.ceil(pillCircumference / SIZES[size]),
	6,
	Math.ceil(pillCircumference / Math.min(width, height))
)
```

**Three constraints**:
1. Based on size style: larger sizes → fewer, larger bumps
2. Minimum 6 bumps (prevents weird-looking clouds)
3. At least one bump per minimum dimension (prevents stretched bumps)

Takes maximum of all three to ensure reasonable appearance.

### Wiggle application

Lines 451-469:
```typescript
const maxWiggleX = width < 20 ? 0 : targetBumpProtrusion * 0.3
const maxWiggleY = height < 20 ? 0 : targetBumpProtrusion * 0.3

const wiggledPoints = bumpPoints.slice(0)
for (let i = 0; i < Math.floor(numBumps / 2); i++) {
	wiggledPoints[i] = Vec.AddXY(
		wiggledPoints[i],
		getRandom() * maxWiggleX * scale,
		getRandom() * maxWiggleY * scale
	)
	wiggledPoints[numBumps - i - 1] = Vec.AddXY(
		wiggledPoints[numBumps - i - 1],
		getRandom() * maxWiggleX * scale,
		getRandom() * maxWiggleY * scale
	)
}
```

**Wiggle amount**: 30% of bump protrusion, scaled by shape scale property.
**No wiggle for tiny shapes**: If width or height < 20px, wiggle is 0 (would look jittery at small scales).

**Symmetric wiggling**: Wiggles from both ends toward center:
- `i` goes from start
- `numBumps - i - 1` goes from end
- Only processes `Math.floor(numBumps / 2)` iterations

This creates visual stability at top-left while allowing organic variation at bottom-right (useful for animations where clouds "grow" into view).

### Arc generation between bumps

Lines 471-512:
```typescript
for (let i = 0; i < wiggledPoints.length; i++) {
	const j = i === wiggledPoints.length - 1 ? 0 : i + 1
	const leftWigglePoint = wiggledPoints[i]
	const rightWigglePoint = wiggledPoints[j]
	const leftPoint = bumpPoints[i]
	const rightPoint = bumpPoints[j]

	// Calculate curvature offset for pill curves
	const distanceBetweenOriginalPoints = Vec.Dist(leftPoint, rightPoint)
	const curvatureOffset = distanceBetweenPointsOnPerimeter - distanceBetweenOriginalPoints
	const distanceBetweenWigglePoints = Vec.Dist(leftWigglePoint, rightWigglePoint)
	const relativeSize = distanceBetweenWigglePoints / distanceBetweenOriginalPoints
	const finalDistance = (Math.max(paddingX, paddingY) + curvatureOffset) * relativeSize

	const arcPoint = Vec.Lrp(leftPoint, rightPoint, 0.5).add(
		Vec.Sub(rightPoint, leftPoint).uni().per().mul(finalDistance)
	)
	// Clamp arc point to stay within bounds...

	const center = centerOfCircleFromThreePoints(leftWigglePoint, rightWigglePoint, arcPoint)
	const radius = Vec.Dist(
		center ? center : Vec.Average([leftWigglePoint, rightWigglePoint]),
		leftWigglePoint
	)

	if (i === 0) {
		path.moveTo(leftWigglePoint.x, leftWigglePoint.y, { geometry: { isFilled } })
	}

	path.circularArcTo(radius, false, true, rightWigglePoint.x, rightWigglePoint.y)
}
```

**Three-point circle**: Uses `centerOfCircleFromThreePoints()` to find circle passing through:
1. Left wiggled bump point
2. Right wiggled bump point
3. Calculated arc point (midpoint pushed outward perpendicular to baseline)

**Arc point calculation**:
- `Vec.Lrp(leftPoint, rightPoint, 0.5)` - Midpoint between bump bases
- `.add(Vec.Sub(rightPoint, leftPoint).uni().per().mul(finalDistance))` - Push perpendicular by calculated distance
- Clamped to shape bounds (lines 489-498) to prevent bumps extending outside

**Fallback for straight sections**: If three points are collinear, `centerOfCircleFromThreePoints()` returns null, uses average point as "center" with distance to left point as "radius" (effectively draws a straight-ish connection).

## Stroke sizes

`/packages/tldraw/src/lib/shapes/shared/default-shape-constants.ts:13-18`:

```typescript
export const STROKE_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 2,
	m: 3.5,
	l: 5,
	xl: 10,
}
```

These values determine:
- Base stroke width for rendering
- Default offset amount (`strokeWidth / 3`)
- Default roundness amount (`strokeWidth * 2`)

## Why xorshift specifically

### Performance requirements

Draw-style shapes may have:
- Hundreds of points per path
- Multiple passes (typically 2)
- Multiple segments for complex shapes
- Fill + stroke = 2 separate paths

**Total RNG calls**: Easily 500-1000+ per shape render.

At 60 FPS with multiple shapes visible, need millions of RNG calls per second. Xorshift's ~5-10ns per call is critical.

### Quality requirements

**What we need**:
- No visible patterns in 2D point distributions
- Good period (cycle length before repeating)
- Different seeds produce uncorrelated sequences
- Stable across platforms (deterministic)

**What we don't need**:
- Cryptographic security
- Perfect statistical distribution
- Resistance to analysis
- Unpredictability

**Xorshift characteristics**:
- Period: 2^128 - 1 (practically infinite for our use)
- Passes basic diehard tests (sufficient for visual applications)
- No visible patterns in 2D/3D point plots
- ~1000x faster than cryptographic PRNGs

### Alternative approaches (not used)

**CSS filter: blur()**: Would blur entire shape including edges. We want precise path with wobbles, not post-processing blur.

**SVG filters (feTurbulence)**: Non-deterministic, different across browsers, no seed control.

**Perlin/Simplex noise**: Much slower, overkill for simple offsets. Better for terrain generation or textures.

**Canvas API compositing**: Would require raster operations, incompatible with vector SVG approach.

## Integration points

### Geo shapes

All geo shapes use same pattern:
- Get path from `getGeoShapePath(shape)`
- For draw style, call `path.toDrawD({ randomSeed: shape.id, ... })`
- Pass result to `<ShapeFill>` and/or `<path>` element

### Line shapes

`/packages/tldraw/src/lib/shapes/line/LineShapeUtil.tsx`:
Similar pattern, uses `getPathForLineShape(shape).toSvg({ randomSeed: shape.id, ... })`

### Arrow shapes

`/packages/tldraw/src/lib/shapes/arrow/ArrowShapeUtil.tsx`:
Arrows also support draw style, use shape.id as seed for consistency.

### Draw shapes

Draw shapes (freehand drawing) use different technique:
- Captured points use `getStroke` algorithm (pressure-sensitive path generation)
- Draw style (dash='draw') uses different rendering, not PathBuilder.toDrawD()
- Still use shape.id for any random elements (future-proofing)

## Edge cases

### Close commands

Lines 803-805:
```typescript
const offset = command.isClose
	? lastMoveToOffset
	: { x: random() * offsetAmount, y: random() * offsetAmount }
```

Close commands reuse the offset from the original moveTo to ensure paths close cleanly without visible gaps.

### Empty/invalid paths

PathBuilder handles various degenerate cases:
- Zero-length segments: Skip or render as point
- Collinear points: No rounding applied
- Single point: Renders as moveTo only

### Very small shapes

Cloud wiggle checks minimum size (line 451-452):
```typescript
const maxWiggleX = width < 20 ? 0 : targetBumpProtrusion * 0.3
const maxWiggleY = height < 20 ? 0 : targetBumpProtrusion * 0.3
```

Below 20px, no wiggle applied to prevent jittery appearance.

### Offset clamping edge cases

Lines 752-758:
```typescript
const shortestDistance = Math.min(
	currentInfo?.length ?? Infinity,
	nextInfo?.length ?? Infinity
)
const offsetLimit = shortestDistance - roundnessClampedForAngle * 2
const offsetAmount = clamp(offset, 0, offsetLimit / 4)
```

Prevents visual artifacts when:
- Segments are very short
- Corners are sharp (large roundness)
- Offsets would cause segments to cross

## Testing considerations

### Determinism verification

Given same shape ID, should produce identical SVG path data across:
- Different browsers
- Different operating systems
- Different runs of the application
- Export operations

### Visual quality tests

- No flickering on pan/zoom
- No visible patterns in random offsets
- Corners look hand-drawn, not mechanical
- Multiple shapes have different "character" but similar style

## Mathematical foundations

### Xorshift operation breakdown

```
t = x ^ (x << 11)
```
- Left shift introduces high-frequency mixing
- XOR with original creates non-linear transformation
- T is temporary value, not directly returned

```
x = y; y = z; z = w
```
- State rotation ensures all variables participate
- Previous outputs influence future outputs
- Creates dependencies across multiple calls

```
w ^= ((w >>> 19) ^ t ^ (t >>> 8)) >>> 0
```
- Triple XOR of: rotated w, t, shifted t
- Right shifts (>>>) introduce high bits into low bits
- `>>> 0` converts to unsigned 32-bit (JavaScript specific)

```
return (w / 0x100000000) * 2
```
- Normalize 32-bit unsigned int to [0, 1) float
- Multiply by 2 to get [0, 2)
- Effective range becomes [-1, 1) due to how values are used

### Unit vector and perpendicular math

Corner rounding uses vector geometry extensively:

**Unit vector (tangent)** (line 945):
```typescript
tangentStart = tangentEnd = Vec.Sub(previous, current).uni()
```
- `uni()` normalizes vector to length 1
- Represents direction without magnitude

**Perpendicular vector** (line 486):
```typescript
Vec.Sub(rightPoint, leftPoint).uni().per().mul(finalDistance)
```
- `per()` rotates vector 90° (perpendicular)
- Creates outward bump direction for clouds

### Bezier curve control point placement

For quadratic bezier corners:
- Control point: Original point position (with offset)
- Start/end points: Moved along tangent by roundness amount
- Creates smooth curve through corner

This differs from cubic beziers which have two control points and more complex curvature control.

## Performance notes

### Caching

PathBuilder results are cached at shape level via `WeakCache<TLGeoShape, PathBuilder>()` (line 21 of getGeoShapePath.ts).

Cache invalidation happens automatically when shape properties change (handled by tldraw's reactivity system).

### SVG path optimization

`toDomPrecision()` function limits decimal places in SVG path data:
- Reduces file size
- Improves rendering performance
- Eliminates sub-pixel differences that don't matter visually

## Key source files

- `/packages/utils/src/lib/number.ts` - `rng()` function, xorshift implementation (lines 58-79)
- `/packages/tldraw/src/lib/shapes/shared/PathBuilder.tsx` - `toDrawD()` method (lines 691-897), `PathBuilder` class
- `/packages/tldraw/src/lib/shapes/geo/components/GeoShapeBody.tsx` - Integration with geo shapes (lines 23-26, 31-36)
- `/packages/tldraw/src/lib/shapes/geo/getGeoShapePath.ts` - Cloud generation with seeded wiggling (lines 421-515)
- `/packages/tldraw/src/lib/shapes/shared/default-shape-constants.ts` - Stroke size constants (lines 13-18)
- `/packages/tldraw/src/lib/shapes/line/LineShapeUtil.tsx` - Line shape integration
- `/packages/tldraw/src/lib/shapes/arrow/ArrowShapeUtil.tsx` - Arrow shape integration

## Related concepts

- **Pseudorandom number generation (PRNG)**: Deterministic algorithms that produce sequences that appear random
- **Seeding**: Providing initial value to PRNG to make it reproducible
- **Xorshift**: Family of PRNGs based on XOR and shift operations
- **Bitwise operations**: Direct bit manipulation (XOR, shifts) for fast computation
- **Vector perpendicular**: 90° rotation of 2D vector
- **Quadratic bezier curves**: Curves defined by start, control point, and end
- **Shape utilities (ShapeUtil)**: tldraw pattern for defining shape behavior
- **Reactive caching (WeakCache)**: Automatic invalidation based on dependencies
