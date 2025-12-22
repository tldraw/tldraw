---
title: Elbow arrows - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - elbow
  - arrows
status: published
date: 12/21/2025
order: 3
---

# Elbow arrows: raw notes

Internal research notes for the elbow-arrows.md article.

## Core problem

Grid-based pathfinding (A\*) for connector routing:

- Canvas: 5000x5000px with 20 shapes
- Grid resolution: 10px
- Search space: 250,000 cells
- Performance issue: sluggish during real-time shape dragging
- Grid tradeoffs: fine grids (expensive), coarse grids (blocky routes)
- Rotation problem: arbitrary shape rotations don't align with grid

## Solution: edge-based routing

**Key insight:** Connectors route from shape edge to shape edge, not through arbitrary space.

Each terminal has 4 possible edges: top, right, bottom, left
Total edge combinations: 4 x 4 = 16

**Edge blocking logic:**
From `getElbowArrowInfo.tsx:560-581`:

```typescript
if (
	isWithinRange(aValue, bRange) &&
	!a.isPoint &&
	!b.isPoint &&
	!isSelfBoundAndShouldRouteExternal
) {
	const subtracted = subtractRange(aCrossRange, bCrossRange)
	switch (subtracted.length) {
		case 0:
			return null // edge completely blocked
		case 1:
			isPartial = subtracted[0] !== aCrossRange
			aCrossRange = subtracted[0]
			break
		case 2:
			isPartial = true
			aCrossRange =
				rangeSize(subtracted[0]) > rangeSize(subtracted[1]) ? subtracted[0] : subtracted[1]
			break
	}
}
```

**Range subtraction:**
From `range.tsx:28-61`:

- If b completely inside a: return 2 ranges (left and right of b)
- If b completely outside a: return a unchanged
- If b fully contains a: return empty array (blocked)
- If b overlaps a on one side: return remaining range

## Coordinate transformation system

Only 4 route functions implemented:

- `routeRightToLeft`
- `routeRightToTop`
- `routeRightToBottom`
- `routeRightToRight`

**Transform definitions:**
From `ElbowArrowWorkingInfo.ts:33-40`:

```typescript
export const ElbowArrowTransform = {
	Identity: { x: 1, y: 1, transpose: false },
	Rotate90: { x: -1, y: 1, transpose: true },
	Rotate180: { x: -1, y: -1, transpose: false },
	Rotate270: { x: 1, y: -1, transpose: true },
	FlipX: { x: -1, y: 1, transpose: false },
	FlipY: { x: 1, y: -1, transpose: false },
}
```

**Transform application:**
From `ElbowArrowWorkingInfo.ts:188-222`:

```typescript
apply(transform: ElbowArrowTransform) {
    this.transform = transformElbowArrowTransform(transform, this.transform)
    this.inverse = invertElbowArrowTransform(this.transform)

    transformBoxInPlace(transform, this.A.original)
    transformBoxInPlace(transform, this.B.original)
    // ... transforms all relevant geometry

    if (transform.x === -1) {
        this.gapX = -this.gapX
        this.midX = this.midX === null ? null : -this.midX
    }
    if (transform.y === -1) {
        this.gapY = -this.gapY
        this.midY = this.midY === null ? null : -this.midY
    }

    if (transform.transpose) {
        // swap x and y values
        let temp = this.midX
        this.midX = this.midY
        this.midY = temp
    }
}
```

**Transform mapping:**
From `elbowArrowRoutes.tsx:360-391`:

```typescript
const routes = {
	top: {
		top: [ElbowArrowTransform.Rotate270, routeRightToRight],
		left: [ElbowArrowTransform.Rotate270, routeRightToTop],
		bottom: [ElbowArrowTransform.Rotate270, routeRightToLeft],
		right: [ElbowArrowTransform.Rotate270, routeRightToBottom],
	},
	right: {
		top: [ElbowArrowTransform.Identity, routeRightToTop],
		right: [ElbowArrowTransform.Identity, routeRightToRight],
		bottom: [ElbowArrowTransform.Identity, routeRightToBottom],
		left: [ElbowArrowTransform.Identity, routeRightToLeft],
	},
	// ... bottom and left follow similar pattern
}
```

## Route patterns: right-to-left

From `elbowArrowRoutes.tsx:6-127`, 5 distinct arrow patterns:

**Pattern 1: Simple horizontal with midpoint**

```
┌───┐
│ A ├─┐
└───┘ │ ┌───┐
      └─► B │
        └───┘
```

Condition: `gapX > 0 && midX !== null`
Points: `[aEdge.value, aEdge.crossTarget] → [midX, aEdge.crossTarget] → [midX, bEdge.crossTarget] → [bEdge.value, bEdge.crossTarget]`

**Pattern 2: Around with vertical midpoint**

```
┌───┐
│ A ├─┐
└───┘ │
 ┌────┘
 │ ┌───┐
 └─► B │
   └───┘
```

Condition: `midY !== null`
6 points including expanded bounds

**Pattern 3: Around right then down**

```
┌───┐
│ A ├───┐
└───┘   │
  ┌───┐ │
┌►│ B │ │
│ └───┘ │
└───────┘
```

**Distance calculation:**
From `elbowArrowRoutes.tsx:57-63`:

```typescript
const arrow3Distance =
	Math.abs(aEdge.value - info.common.expanded.right) +
	Math.abs(aEdge.crossTarget - info.common.expanded.bottom) +
	Math.abs(info.common.expanded.right - bEdge.expanded) +
	Math.abs(info.common.expanded.bottom - bEdge.crossTarget) +
	info.options.expandElbowLegLength +
	6 // 6 points in this arrow
```

**Pattern 4: Around left then up**
Uses `info.common.expanded.top` and `info.common.expanded.left`
Distance includes `info.bias.y` term (bias towards down/right)

**Pattern 5: Far wrap around**
Condition: `gapX < 0 && midX !== null`
8 points total, routes around bottom of shapes

## Route selection algorithm

From `routeArrowWithAutoEdgePicking.tsx:12-89`:

**Primary heuristic:**

```typescript
if (Math.abs(info.gapX) + 1 > Math.abs(info.gapY) && info.midX !== null) {
	// +1 bias towards x-axis to prevent flicker at 45 degrees
	if (info.gapX > 0) {
		idealRoute = tryRouteArrow(info, 'right', 'left')
	} else {
		idealRoute = tryRouteArrow(info, 'left', 'right')
	}
}
```

**Corner cases:**
From `routeArrowWithAutoEdgePicking.tsx:42-67`:

```typescript
if (
	aRight &&
	bTop &&
	(aRight.expanded ?? aRight.value) <= bTop.crossTarget &&
	aRight.crossTarget <= (bTop.expanded ?? bTop.value)
) {
	idealRoute = tryRouteArrow(info, 'right', 'top')
}
```

**Distance metric:**
Manhattan distance = sum of horizontal + vertical segments
From `ElbowArrowRouteBuilder.ts:85-93`:

```typescript
function measureRouteManhattanDistance(path: VecLike[]): number {
	let distance = 0
	for (let i = 0; i < path.length - 1; i++) {
		const start = path[i]
		const end = path[i + 1]
		distance += Math.abs(end.x - start.x) + Math.abs(end.y - start.y)
	}
	return distance
}
```

**Tie breaking:**
From `routeArrowWithAutoEdgePicking.tsx:211-240`:

```typescript
function pickBest(info, edges) {
	let bestRoute = null
	let bestCornerCount = Infinity
	let bestDistance = Infinity
	let distanceBias = 0
	for (const [aSide, bSide, aEdgePicking, bEdgePicking] of edges) {
		distanceBias += 1 // increasing bias for later candidates
		const route = tryRouteArrow(info, aSide, bSide)
		if (route) {
			if (route.points.length < bestCornerCount) {
				bestCornerCount = route.points.length
				bestDistance = route.distance
				bestRoute = route
			} else if (
				route.points.length === bestCornerCount &&
				route.distance + distanceBias < bestDistance
			) {
				bestDistance = route.distance
				bestRoute = route
			}
		}
	}
	return bestRoute
}
```

**Bias vector:**
From `ElbowArrowWorkingInfo.ts:181-182`:

```typescript
// prefer down/right when routing arrows
this.bias = new Vec(1, 1)
```

Prevents flickering when dragging arrows near 45-degree angles.

## Expanded bounds

From `getElbowArrowInfo.tsx:132-137`:

```typescript
const expandedA = aTerminal.isPoint
	? aTerminal.bounds
	: aTerminal.bounds.clone().expandBy(options.expandElbowLegLength)
const expandedB = bTerminal.isPoint
	? bTerminal.bounds
	: bTerminal.bounds.clone().expandBy(options.expandElbowLegLength)
```

**Expansion amounts:**
From `ArrowShapeUtil.tsx:92-100`:

```typescript
override options: ArrowShapeOptions = {
    expandElbowLegLength: {
        s: 28,
        m: 36,
        l: 44,
        xl: 66,
    },
    minElbowLegLength: {
        s: STROKE_SIZES.s * 3,  // 6
        m: STROKE_SIZES.m * 3,  // 10.5
        l: STROKE_SIZES.l * 3,  // 15
        xl: STROKE_SIZES.xl * 3, // 30
    },
}
```

Scales with arrow stroke width to maintain visual proportions.

## Gap calculation

From `getElbowArrowInfo.tsx:147-162`:

```typescript
let gapX = bTerminal.bounds.minX - aTerminal.bounds.maxX
if (gapX < 0) {
	gapX = aTerminal.bounds.minX - bTerminal.bounds.maxX
	if (gapX < 0) {
		gapX = 0
	}
	gapX = -gapX
}
// Similar for gapY
```

- Positive gap: shapes separated with B to the right of A
- Negative gap: shapes separated with B to the left of A
- Zero gap: shapes overlap in that dimension

## Midpoint calculation

From `getElbowArrowInfo.tsx:167-205`:

```typescript
const aMinLength = aTerminal.minEndSegmentLength * 3
const bMinLength = bTerminal.minEndSegmentLength * 3
const minLegDistanceNeeded =
	(aTerminal.isPoint ? aMinLength : options.minElbowLegLength) +
	(bTerminal.isPoint ? bMinLength : options.minElbowLegLength)

let mxRange = null
if (gapX > minLegDistanceNeeded) {
	mxRange = {
		a: aTerminal.isPoint ? aTerminal.bounds.maxX + aMinLength : expandedA.maxX,
		b: bTerminal.isPoint ? bTerminal.bounds.minX - bMinLength : expandedB.minX,
	}
}

const midpoint = swapOrder ? 1 - options.elbowMidpoint : options.elbowMidpoint
const mx = mxRange ? lerp(mxRange.a, mxRange.b, midpoint) : null
```

User can drag midpoint handle to adjust between mxRange.a and mxRange.b.

## Geometry casting

**From bounds to actual geometry:**
From `getElbowArrowInfo.tsx:673-763`:

```typescript
function castPathSegmentIntoGeometry(
	segment: 'first' | 'last',
	target: ElbowArrowTargetBox,
	other: ElbowArrowTargetBox,
	route: ElbowArrowRoute
) {
	if (!target.geometry) return

	const point1 = segment === 'first' ? route.points[0] : route.points[route.points.length - 1]
	const point2 = segment === 'first' ? route.points[1] : route.points[route.points.length - 2]

	const intersections = target.geometry.intersectLineSegment(point2, target.target, {
		includeLabels: false,
		includeInternal: false,
	})

	// Find nearest intersection
	for (const intersection of intersections) {
		const point2Distance = Vec.ManhattanDist(pointToFindClosestIntersectionTo, intersection)
		if (point2Distance < nearestDistanceToPoint2) {
			nearestDistanceToPoint2 = point2Distance
			nearestIntersectionToPoint2 = intersection
		}
	}

	// Apply arrowhead offset
	let offset = target.arrowheadOffset
	const currentFinalSegmentLength = Vec.ManhattanDist(point2, nearestIntersectionToPoint2)
	const minLength = target.arrowheadOffset * 2
	if (currentFinalSegmentLength < minLength) {
		const targetLength = minLength - target.arrowheadOffset
		offset = currentFinalSegmentLength - targetLength
	}

	// Nudge point away from geometry edge
	const nudgedPoint = Vec.Nudge(nearestIntersectionToPoint2, point2, offset)

	route.distance += newDistance - initialDistance
	point1.x = nudgedPoint.x
	point1.y = nudgedPoint.y
}
```

## Edge case: unclosed paths (freehand strokes)

From `getElbowArrowInfo.tsx:800-880`:

**Finding normal vector:**

```typescript
const normalizedPointAlongPath = terminal.geometry.uninterpolateAlongEdge(
	terminal.target,
	Geometry2dFilters.EXCLUDE_NON_STANDARD
)

const prev = terminal.geometry.interpolateAlongEdge(
	normalizedPointAlongPath - 0.01 / terminal.geometry.length
)
const next = terminal.geometry.interpolateAlongEdge(
	normalizedPointAlongPath + 0.01 / terminal.geometry.length
)

const normal = next.sub(prev).per().uni() // perpendicular unit vector
const axis = Math.abs(normal.x) > Math.abs(normal.y) ? ElbowArrowAxes.x : ElbowArrowAxes.y
```

**Axis definitions:**
From `definitions.ts:117-140`:

```typescript
export const ElbowArrowAxes = {
	x: {
		v: (x: number, y: number) => new Vec(x, y),
		loEdge: 'left',
		hiEdge: 'right',
		crossMid: 'midY',
		gap: 'gapX',
		midRange: 'midXRange',
		self: 'x',
		cross: 'y',
		size: 'width',
	},
	y: {
		v: (y: number, x: number) => new Vec(x, y),
		loEdge: 'top',
		hiEdge: 'bottom',
		crossMid: 'midX',
		gap: 'gapY',
		midRange: 'midYRange',
		self: 'y',
		cross: 'x',
		size: 'height',
	},
}
```

## Edge case: self-bound shapes

From `getElbowArrowInfo.tsx:529-533`:

```typescript
const isSelfBoundAndShouldRouteExternal =
	a.targetShapeId === b.targetShapeId &&
	a.targetShapeId !== null &&
	(a.snap === 'edge' || a.snap === 'edge-point') &&
	(b.snap === 'edge' || b.snap === 'edge-point')
```

When arrow connects shape to itself:

- Default: routes through shape interior (as if point-to-point)
- If both terminals snap to edge: routes externally

## Edge case: tiny end nubs

From `getElbowArrowInfo.tsx:766-798`:

```typescript
function fixTinyEndNubs(route, aTerminal, bTerminal) {
	if (!route) return

	if (route.points.length >= 3) {
		const a = route.points[0]
		const b = route.points[1]
		const firstSegmentLength = Vec.ManhattanDist(a, b)
		if (firstSegmentLength < aTerminal.minEndSegmentLength) {
			route.points.splice(1, 1) // remove point
			if (route.points.length >= 3) {
				const matchAxis = approximately(a.x, b.x) ? 'y' : 'x'
				route.points[1][matchAxis] = a[matchAxis] // align to straight line
			}
		}
	}
	// Similar for last segment
}
```

**Min end segment length:**
From `getElbowArrowInfo.tsx:350-351`:

```typescript
const arrowStrokeSize = (STROKE_SIZES[arrow.props.size] * arrow.props.scale) / 2
const minEndSegmentLength = arrowStrokeSize * arrow.props.scale * 3
```

## Route builder

From `ElbowArrowRouteBuilder.ts:7-83`:

**Deduplication logic:**

```typescript
build(): ElbowArrowRoute {
    const finalPoints = []
    for (let i = 0; i < this.points.length; i++) {
        const p0 = this.points[i]
        const p1 = finalPoints[finalPoints.length - 1]
        const p2 = finalPoints[finalPoints.length - 2]

        if (!p1 || !p2) {
            finalPoints.push(p0)
        } else {
            const d1x = Math.abs(p0.x - p1.x)
            const d1y = Math.abs(p0.y - p1.y)
            const d2x = Math.abs(p0.x - p2.x)
            const d2y = Math.abs(p0.y - p2.y)

            if (d1x < MIN_DISTANCE && d1y < MIN_DISTANCE) {
                // duplicate point, ignore
            } else if (d1x < MIN_DISTANCE && d2x < MIN_DISTANCE) {
                // extending same vertical line, update last point
                p1.y = p0.y
            } else if (d1y < MIN_DISTANCE && d2y < MIN_DISTANCE) {
                // extending same horizontal line, update last point
                p1.x = p0.x
            } else {
                // direction change, add point
                finalPoints.push(p0)
            }
        }
    }

    return {
        name: this.name,
        points: finalPoints,
        distance: measureRouteManhattanDistance(finalPoints),
        aEdgePicking: 'manual',
        bEdgePicking: 'manual',
        skipPointsWhenDrawing: new Set(),
        midpointHandle: this._midpointHandle,
    }
}
```

**MIN_DISTANCE:**
From `ElbowArrowRouteBuilder.ts:5`:

```typescript
const MIN_DISTANCE = 0.01
```

## Side properties lookup

From `getElbowArrowInfo.tsx:475-516`:

```typescript
const sideProps = {
	top: {
		expand: -1,
		main: 'minY',
		opposite: 'maxY',
		crossMid: 'midX',
		crossMin: 'minX',
		crossMax: 'maxX',
		bRangeExpand: 'max',
		crossAxis: 'x',
	},
	right: {
		expand: 1,
		main: 'maxX',
		opposite: 'minX',
		crossMid: 'midY',
		crossMin: 'minY',
		crossMax: 'maxY',
		bRangeExpand: 'min',
		crossAxis: 'y',
	},
	// ... left and bottom follow similar pattern
}
```

Used for generic edge calculations without case statements.

## Terminal conversion

From `getElbowArrowInfo.tsx:640-667`:

```typescript
function convertTerminalToPoint(terminal: ElbowArrowTerminal): ElbowArrowTerminal {
	if (terminal.isPoint) return terminal

	let side: ElbowArrowSideWithAxis | null = null
	let arrowheadOffset = 0
	if (terminal.snap === 'edge' || terminal.snap === 'edge-point') {
		arrowheadOffset = terminal.arrowheadOffset
		if (terminal.side === 'x' || terminal.side === 'left' || terminal.side === 'right') {
			side = 'x'
		}
		if (terminal.side === 'y' || terminal.side === 'top' || terminal.side === 'bottom') {
			side = 'y'
		}
	}

	return {
		targetShapeId: terminal.targetShapeId,
		side,
		bounds: new Box(terminal.target.x, terminal.target.y, 0, 0), // zero-size box
		geometry: terminal.geometry,
		target: terminal.target,
		arrowheadOffset,
		minEndSegmentLength: terminal.minEndSegmentLength,
		isExact: terminal.isExact,
		isPoint: true,
		snap: terminal.snap,
	}
}
```

When edges are blocked, terminals can be converted to points with relaxed routing rules.

## Terminal swapping

From `getElbowArrowInfo.tsx:67-71`:

```typescript
const swapOrder = !!(!startTerminal.side && endTerminal.side)

let { aTerminal, bTerminal } = swapOrder
	? { aTerminal: endTerminal, bTerminal: startTerminal }
	: { aTerminal: startTerminal, bTerminal: endTerminal }
```

Simplifies routing logic by ensuring at least aTerminal has an explicit side if either does.

## Arrowhead offset calculation

From `getElbowArrowInfo.tsx:358-366`:

```typescript
if (arrow.props[arrowheadProp] !== 'none') {
	const targetScale = 'scale' in target.props ? target.props.scale : 1
	const targetStrokeSize =
		'size' in target.props ? ((STROKE_SIZES[target.props.size] ?? 0) * targetScale) / 2 : 0

	arrowheadOffset = arrowStrokeSize + targetStrokeSize + BOUND_ARROW_OFFSET * arrow.props.scale
}
```

Combines arrow stroke, target stroke, and constant offset.

## Edge from normalized anchor

From `getElbowArrowInfo.tsx:327-342`:

```typescript
export function getEdgeFromNormalizedAnchor(normalizedAnchor: VecLike) {
	if (approximately(normalizedAnchor.x, 0.5) && approximately(normalizedAnchor.y, 0.5)) {
		return null // center point
	}

	if (
		Math.abs(normalizedAnchor.x - 0.5) >
		// slightly bias towards x arrows to prevent flickering when the anchor is right on the line
		// between the two directions
		Math.abs(normalizedAnchor.y - 0.5) - 0.0001
	) {
		return normalizedAnchor.x < 0.5 ? 'left' : 'right'
	}

	return normalizedAnchor.y < 0.5 ? 'top' : 'bottom'
}
```

0.0001 bias towards horizontal to prevent flickering at 45 degrees.

## Route handle path

From `getElbowArrowInfo.tsx:295-322`:

```typescript
export function getRouteHandlePath(info: ElbowArrowInfo, route: ElbowArrowRoute): ElbowArrowRoute {
	const startTarget = info.swapOrder ? info.B.target : info.A.target
	const endTarget = info.swapOrder ? info.A.target : info.B.target

	const firstSegmentLength = Vec.ManhattanDist(route.points[0], route.points[1])
	const lastSegmentLength = Vec.ManhattanDist(
		route.points[route.points.length - 2],
		route.points[route.points.length - 1]
	)

	const newFirstSegmentLength = Vec.ManhattanDist(startTarget, route.points[1])
	const newLastSegmentLength = Vec.ManhattanDist(route.points[route.points.length - 2], endTarget)

	const firstSegmentLengthChange = firstSegmentLength - newFirstSegmentLength
	const lastSegmentLengthChange = lastSegmentLength - newLastSegmentLength

	const newPoints = [startTarget, ...route.points, endTarget]

	return {
		name: route.name,
		distance: route.distance + firstSegmentLengthChange + lastSegmentLengthChange,
		points: newPoints.filter((p) => !route.skipPointsWhenDrawing.has(p)),
		// ... other properties
	}
}
```

Extends route to actual target points for handle display (may extend into shape geometry).

## Constants

From `shared.ts`:

```typescript
export const BOUND_ARROW_OFFSET = 10 // px offset from shape edge

export const STROKE_SIZES = {
	s: 2,
	m: 3.5,
	l: 5,
	xl: 10,
}
```

From `ArrowShapeUtil.tsx:92-105`:

```typescript
expandElbowLegLength: {
    s: 28,
    m: 36,
    l: 44,
    xl: 66,
}

minElbowLegLength: {
    s: 6,    // STROKE_SIZES.s * 3
    m: 10.5, // STROKE_SIZES.m * 3
    l: 15,   // STROKE_SIZES.l * 3
    xl: 30,  // STROKE_SIZES.xl * 3
}
```

## Type definitions

**ElbowArrowTerminal:**
From `definitions.ts:308-350`:

```typescript
export interface ElbowArrowTerminal {
	targetShapeId: TLShapeId | null
	side: ElbowArrowSideWithAxis | null // 'top'|'right'|'bottom'|'left'|'x'|'y'
	bounds: Box
	geometry: Geometry2d | null
	target: Vec
	arrowheadOffset: number
	minEndSegmentLength: number
	isExact: boolean
	isPoint: boolean
	snap: ElbowArrowSnap // 'none'|'edge'|'edge-point'
}
```

**ElbowArrowEdge:**
From `definitions.ts:166-189`:

```typescript
export interface ElbowArrowEdge {
	value: number // coordinate of edge
	expanded: number | null // expanded by expandElbowLegLength
	cross: ElbowArrowRange // usable range along cross-axis
	crossTarget: number // target point along edge
	isPartial: boolean // cross range shrunk for other shape
}
```

**ElbowArrowRoute:**
From `definitions.ts:27-58`:

```typescript
export interface ElbowArrowRoute {
	name: string // debug only
	points: Vec[] // route vertices
	distance: number // Manhattan distance
	aEdgePicking: ElbowArrowSideReason // 'manual'|'auto'|'fallback'
	bEdgePicking: ElbowArrowSideReason
	skipPointsWhenDrawing: Set<Vec> // hidden helper points
	midpointHandle: ElbowArrowMidpointHandle | null
}
```

## Key source files

- `packages/tldraw/src/lib/shapes/arrow/elbow/getElbowArrowInfo.tsx` - Main routing algorithm (881 lines)
- `packages/tldraw/src/lib/shapes/arrow/elbow/routes/elbowArrowRoutes.tsx` - 4 primary route functions (404 lines)
- `packages/tldraw/src/lib/shapes/arrow/elbow/routes/ElbowArrowWorkingInfo.ts` - Transform handling (234 lines)
- `packages/tldraw/src/lib/shapes/arrow/elbow/routes/routeArrowWithAutoEdgePicking.tsx` - Edge selection and route picking (242 lines)
- `packages/tldraw/src/lib/shapes/arrow/elbow/routes/ElbowArrowRouteBuilder.ts` - Route construction with deduplication (94 lines)
- `packages/tldraw/src/lib/shapes/arrow/elbow/definitions.ts` - Type definitions (351 lines)
- `packages/tldraw/src/lib/shapes/arrow/elbow/range.tsx` - Range operations for edge blocking (82 lines)
- `packages/tldraw/src/lib/shapes/arrow/ArrowShapeUtil.tsx` - Options and configuration
