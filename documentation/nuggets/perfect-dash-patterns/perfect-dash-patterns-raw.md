---
title: Perfect dash patterns - Raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - perfect
  - dash
  - patterns
status: published
date: 12/21/2025
order: 3
---

# Perfect dash patterns - Raw notes

## Core implementation

### Main function location

- `/packages/editor/src/lib/editor/shapes/shared/getPerfectDashProps.ts`
- Lines 7-108
- Public API exported from `@tldraw/editor`

### Function signature

```typescript
export function getPerfectDashProps(
	totalLength: number,
	strokeWidth: number,
	opts: {
		style?: TLDefaultDashStyle
		snap?: number
		end?: PerfectDashTerminal
		start?: PerfectDashTerminal
		lengthRatio?: number
		closed?: boolean
		forceSolid?: boolean
	} = {}
): {
	strokeDasharray: string
	strokeDashoffset: string
}
```

### Type definitions

- `PerfectDashTerminal`: `'skip' | 'outset' | 'none'` (line 4)
- `TLDefaultDashStyle`: `'draw' | 'solid' | 'dashed' | 'dotted'` (from `/packages/tlschema/src/styles/TLDashStyle.ts`, lines 36-39)

### Default parameter values

From lines 23-31:

- `closed = false`
- `snap = 1`
- `start = 'outset'`
- `end = 'outset'`
- `lengthRatio = 2`
- `style = 'dashed'`
- `forceSolid = false`

### Algorithm implementation

#### Dashed style (lines 47-50)

```typescript
case 'dashed': {
	ratio = 1
	dashLength = Math.min(strokeWidth * lengthRatio, totalLength / 4)
	break
}
```

- Initial dash length is `strokeWidth * lengthRatio` (default: strokeWidth \* 2)
- Clamped to max of `totalLength / 4` to ensure at least 4 segments can fit
- `ratio = 1` means dash and gap are equally weighted

#### Dotted style (lines 52-56)

```typescript
case 'dotted': {
	ratio = 100
	dashLength = strokeWidth / ratio
	break
}
```

- Dash length is `strokeWidth / 100` (essentially invisible - 1/100th of stroke)
- `ratio = 100` means gap is 100x longer than the "dash"
- Rendered with `stroke-linecap: round` to create circular dots

#### Terminal handling for open paths (lines 65-78)

```typescript
if (!closed) {
	if (start === 'outset') {
		totalLength += dashLength / 2
		strokeDashoffset += dashLength / 2
	} else if (start === 'skip') {
		totalLength -= dashLength
		strokeDashoffset -= dashLength
	}

	if (end === 'outset') {
		totalLength += dashLength / 2
	} else if (end === 'skip') {
		totalLength -= dashLength
	}
}
```

- `'outset'`: Extends virtual path by half dash length at each end, ensuring dashes at endpoints
- `'skip'`: Reduces path length by full dash to avoid dash at that end
- `'none'`: No adjustment
- Offset adjusts pattern position to center it correctly

#### Dash count calculation (lines 81-82)

```typescript
dashCount = Math.floor(totalLength / dashLength / (2 * ratio))
dashCount -= dashCount % snap
```

- Divides by `(2 * ratio)` to account for dash+gap pairs
- For dashed: `2 * 1 = 2` (dash plus gap)
- For dotted: `2 * 100 = 200` (tiny dash plus large gap)
- `snap` parameter forces alignment (e.g., snap=2 ensures even number of dashes)

#### Short path handling (lines 84-92)

```typescript
if (dashCount < 3 && style === 'dashed') {
	if (totalLength / strokeWidth < 4) {
		// Very short—just make it solid
		dashLength = totalLength
		dashCount = 1
		gapLength = 0
	} else {
		// Short but not tiny—force three segments: dash, gap, dash
		dashLength = totalLength * (1 / 3)
		gapLength = totalLength * (1 / 3)
	}
}
```

- Threshold: if `totalLength / strokeWidth < 4`, render as solid
- Otherwise: force 3 equal segments (dash-gap-dash)
- Only applies to dashed style, not dotted

#### Final length calculations (lines 93-101)

```typescript
dashLength = totalLength / dashCount / (2 * ratio)

if (closed) {
	strokeDashoffset = dashLength / 2
	gapLength = (totalLength - dashCount * dashLength) / dashCount
} else {
	gapLength = (totalLength - dashCount * dashLength) / Math.max(1, dashCount - 1)
}
```

- Recalculate dash length to exactly divide the total length
- Closed paths: offset by half dash to center pattern at seam, equal number of dashes and gaps
- Open paths: one fewer gap than dashes (no gaps beyond endpoints)

## PathBuilder integration

### Location

`/packages/tldraw/src/lib/shapes/shared/PathBuilder.tsx`

### toDashedSvg method (lines 582-685)

Key aspects:

- Processes path commands sequentially
- Each segment can be rendered independently or merged with previous
- Calls `getPerfectDashProps` for each run of segments (line 616)
- Terminal handling logic (lines 614-622):
  ```typescript
  start: isFirst ? (start ?? (pathIsClosed ? 'outset' : 'none')) : 'outset',
  end: isLast ? (end ?? (pathIsClosed ? 'outset' : 'none')) : 'outset',
  ```
- Returns SVG `<g>` element containing multiple `<path>` elements (one per segment)

### Segment length calculation (lines 899-919)

```typescript
private calculateSegmentLength(lastPoint: VecLike, command: PathBuilderCommand) {
	switch (command.type) {
		case 'move':
			return 0
		case 'line':
			return Vec.Dist(lastPoint, command)
		case 'cubic':
			return CubicBezier.length(
				lastPoint.x, lastPoint.y,
				command.cp1.x, command.cp1.y,
				command.cp2.x, command.cp2.y,
				command.x, command.y
			)
	}
}
```

- Uses exact Euclidean distance for lines
- Uses approximate arc length for cubic Bezier curves

### Cubic Bezier length approximation (lines 1078-1121)

- Uses Gauss-Legendre quadrature with 12 points
- T-values and C-values (weights) hardcoded for performance
- Based on algorithm from Snap.svg (Apache License)
- Lines 1114-1120: Pre-computed quadrature points and weights

## Usage examples

### DashedOutlineBox (selection outlines)

`/packages/editor/src/lib/editor/shapes/group/DashedOutlineBox.tsx`, lines 14-21:

```typescript
const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
	side[0].dist(side[1]),
	1 / zoomLevel,
	{
		style: 'dashed',
		lengthRatio: 4,
	}
)
```

- Each side of rectangle calculated independently
- `lengthRatio: 4` = longer dashes than default
- Stroke width scales with zoom (thinner when zoomed out)

### Arrow handle paths

`/packages/tldraw/src/lib/shapes/arrow/ArrowShapeUtil.tsx`, lines 1035-1040:

```typescript
handlePath = getArrowHandlePath(info, {
	style: 'dashed',
	start: 'skip',
	end: 'skip',
	lengthRatio: 2.5,
	strokeWidth: 2 / editor.getEfficientZoomLevel(),
	// ...
})
```

- Uses 'skip' terminals to avoid dashes at arrow connection points
- `lengthRatio: 2.5` for slightly longer dashes

### Geo shapes with dashed/dotted outlines

`/packages/tldraw/src/lib/shapes/geo/components/GeoShapeBody.tsx`, lines 31-37:

```typescript
{
	path.toSvg({
		style: dash, // 'dashed', 'dotted', 'draw', or 'solid'
		strokeWidth,
		forceSolid,
		randomSeed: shape.id,
		props: { fill: 'none', stroke: getColorValue(theme, color, 'solid') },
	})
}
```

### Special X pattern for rectangles (dashed/dotted)

`/packages/tldraw/src/lib/shapes/geo/getGeoShapePath.ts`, lines 213-239:

- When rectangle has dashed or dotted style, adds X pattern from corners to center
- Uses `dashStart: 'skip'` and `dashEnd: 'outset'` to control where dashes appear
- Marked as `isInternal: true` and `isFilled: false` in geometry

## Mathematical foundations

### Why work backwards?

Problem: SVG's `stroke-dasharray` just tiles pattern until path ends

- Example: 100px line with `4 4` pattern = 12.5 cycles
- Result: incomplete dash at end looks mechanical

Solution: Calculate how many complete cycles SHOULD fit, then adjust lengths

- Ensures complete dashes at both ends
- Pattern meets cleanly on closed paths

### Open vs closed path math

Open paths: `n` dashes need `n-1` gaps

```
dash-gap-dash-gap-dash
  1     2     3      (3 dashes, 2 gaps)
```

Closed paths: `n` dashes need `n` gaps (pattern wraps around)

```
dash-gap-dash-gap-dash-gap-[connects back to start]
  1     2     3       (3 dashes, 3 gaps)
```

### Offset centering

For closed shapes: `strokeDashoffset = dashLength / 2`

- Centers the pattern on the path closure point
- Hides the seam where path start meets path end

For open shapes with outset: `strokeDashoffset = dashLength / 2`

- Combined with virtual length extension
- Results in dashes appearing at both endpoints

## Edge cases handled

1. **Very short paths** (line 85): `totalLength / strokeWidth < 4` → solid line
2. **Short paths** (line 90): Force 3 equal segments (dash-gap-dash)
3. **Zero-length paths**: handled by `Math.max(1, dashCount - 1)` in gap calculation
4. **Dotted style**: Special ratio (100:1) with tiny invisible dash
5. **Force solid**: Early return for `forceSolid === true` (lines 39-44)

## Performance considerations

From article:

> "The cost is computational—we're calculating lengths and offsets for every dashed path at render time."

Mitigations:

- Path geometry cached using `WeakCache` (geo shapes: line 21 of getGeoShapePath.ts)
- Calculations are pure functions (no side effects)
- For rectangles: each side calculated independently rather than flowing pattern around corners
  - Simpler math, more predictable results
  - Corners always align on dashes

## Constants and configuration

### Stroke sizes

From `/packages/tldraw/src/lib/shapes/shared/default-shape-constants.ts` (referenced in code):

```typescript
STROKE_SIZES[size] // Used as strokeWidth parameter
```

### Length ratio usage patterns

- Default: `2` (line 28)
- Selection outlines: `4` (longer dashes)
- Arrow handles: `2.5` (slightly longer)
- Can be overridden per-shape/per-path

### Snap parameter

- Default: `1` (no alignment constraint)
- Can force even/odd number of dashes
- Used to ensure parallel lines align
- Line 82: `dashCount -= dashCount % snap`

## Return value structure

Lines 104-107:

```typescript
return {
	strokeDasharray: [dashLength, gapLength].join(' '),
	strokeDashoffset: strokeDashoffset.toString(),
}
```

- `strokeDasharray`: Space-separated dash and gap lengths (e.g., "8 4")
- `strokeDashoffset`: Single numeric value as string (e.g., "4")
- Both applied directly as SVG attributes
