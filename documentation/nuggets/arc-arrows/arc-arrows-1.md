---
title: Circular arcs instead of Bezier curves
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - arrows
  - arcs
  - curves
readability: 9
voice: 9
potential: 8
accuracy: 9
notes: "Strong opening with Bezier failure mode. All code verified against source. 'One degree of freedom' insight is transferable. Comprehensive coverage of handle/body arc and intersection logic."
---

# Arc arrows

When we added curved arrows to tldraw, we had to solve a tricky problem: how do you preserve the curve when the shapes at both ends move independently? The obvious approach—using Bezier curves with control points—falls apart as soon as you drag a shape around.

Here's why, and what we do instead.

## The Bezier problem

A quadratic Bezier curve has a start point, an end point, and a control point somewhere off to the side that determines the curve's shape. That control point has two degrees of freedom: x and y coordinates.

When both endpoints are bound to shapes, those endpoints move independently. Now you have a problem: where should the control point go? There's no single right answer.

You could maintain the control point's relative distance to each endpoint. Or its absolute angle. Or its perpendicular distance from the baseline. Each heuristic produces different results, and none of them feel natural.

Worse, certain movements can flip the control point to the wrong side of the line, suddenly reversing the curve direction. Small shape movements produce disproportionate visual changes. The curve doesn't feel stable.

## One degree of freedom

We use circular arcs instead. A circular arc has only one degree of freedom: the bend amount.

The bend is the perpendicular distance from the midpoint of the baseline (the straight line between start and end) to the arc's middle point. Positive bend curves one way, negative curves the other.

Given any three points—start, end, and middle—exactly one circle passes through all of them. That circle defines the arc. There's no ambiguity.

When the endpoints move, we recalculate the middle point from the baseline and the stored bend value. The arc automatically adjusts in a way that preserves the user's intent. No S-curves, no loops, no unexpected reversals.

```typescript
// Calculate the middle point from the baseline and bend
const med = Vec.Med(terminalsInArrowSpace.start, terminalsInArrowSpace.end) // midpoint
const distance = Vec.Sub(terminalsInArrowSpace.end, terminalsInArrowSpace.start)
const u = Vec.Len(distance) ? distance.uni() : Vec.From(distance) // unit vector
const middle = Vec.Add(med, u.per().mul(-bend)) // perpendicular offset by bend amount
```

Once we have the three points, we find the circle's center:

```typescript
export function centerOfCircleFromThreePoints(a: VecLike, b: VecLike, c: VecLike) {
	const u = -2 * (a.x * (b.y - c.y) - a.y * (b.x - c.x) + b.x * c.y - c.x * b.y)
	const x =
		((a.x * a.x + a.y * a.y) * (c.y - b.y) +
			(b.x * b.x + b.y * b.y) * (a.y - c.y) +
			(c.x * c.x + c.y * c.y) * (b.y - a.y)) /
		u
	const y =
		((a.x * a.x + a.y * a.y) * (b.x - c.x) +
			(b.x * b.x + b.y * b.y) * (c.x - a.x) +
			(c.x * c.x + c.y * c.y) * (a.x - b.x)) /
		u
	return new Vec(x, y)
}
```

If the three points are collinear (when `u` approaches zero), we fall back to a straight arrow.

## Two arcs: handle and body

We actually maintain two arcs for each curved arrow.

The **handle arc** represents user intent. Its endpoints sit at the binding anchor positions—the center of each shape by default, or the precise point the user targeted. This is the logical connection, stored as the source of truth.

The **body arc** is what renders on screen. It has the same center and radius as the handle arc, but its endpoints sit where the arc intersects the shape boundaries, accounting for arrowhead offsets.

```typescript
interface TLArcArrowInfo {
	type: 'arc'
	start: TLArrowPoint
	end: TLArrowPoint
	middle: VecLike
	handleArc: TLArcInfo // user intent
	bodyArc: TLArcInfo // rendered
	isValid: boolean
}
```

## Finding shape intersections

To determine where the body arc's endpoints should be, we find where the handle arc's circle intersects each shape's boundary.

The algorithm:

1. Transform the arc's circle into the target shape's local coordinate space
2. Call `geometry.intersectCircle(center, radius)` on the shape's geometry
3. Filter to intersections that actually lie on the arc segment (not the full circle)
4. Pick the best intersection

For closed shapes like rectangles and ellipses, we target the intersection closest to 25% along the arc for the start terminal, or 75% for the end terminal. This makes arrows point "into" shapes rather than grazing tangentially.

For open shapes like lines, we pick the nearest intersection.

If no intersection exists, we use the nearest point on the geometry for closed shapes, or fall back to the handle position for open shapes.

## Arrowhead offsets

Arrowheads need space. When we calculate the body arc, we offset its endpoints slightly inward along the arc to make room.

The offset distance accounts for stroke width and a fixed buffer:

```typescript
if (arrowheadStart !== 'none') {
	const strokeOffset =
		STROKE_SIZES[shape.props.size] / 2 +
		('size' in startShapeInfo.shape.props ? STROKE_SIZES[startShapeInfo.shape.props.size] / 2 : 0)
	offsetA = (BOUND_ARROW_OFFSET + strokeOffset) * shape.props.scale
	minLength += strokeOffset * shape.props.scale
}
```

We convert the linear offset to an arc angle and move the endpoint along the circle:

```typescript
if (offsetA !== 0) {
	tA.setTo(handleArc.center).add(
		Vec.FromAngle(aCA + dAB * ((offsetA / lAB) * (isClockwise ? 1 : -1))).mul(handleArc.radius)
	)
}
```

When the arrow gets too short to accommodate both arrowheads, we flip the offsets outward (multiply by negative values) so the arrow pokes slightly into the shapes rather than disappearing entirely.

## Edge cases

Some shape relationships need special handling.

When an arrow binds to the same shape at both ends (a self-referential arrow), and the arc length is less than 30 pixels, we use the handle positions directly rather than trying to calculate intersections. This prevents visual jitter at tiny sizes.

When one shape contains another, we force precise anchoring. Center-snap behavior produces confusing results when the endpoint is inside the other shape.

## Rendering

The body arc renders as an SVG arc command:

```typescript
case 'arc':
    return new PathBuilder()
        .moveTo(info.start.point.x, info.start.point.y, { offset: 0, roundness: 0 })
        .circularArcTo(
            info.bodyArc.radius,
            !!info.bodyArc.largeArcFlag,
            !!info.bodyArc.sweepFlag,
            info.end.point.x,
            info.end.point.y,
            { offset: 0, roundness: 0 }
        )
        .toSvg(opts)
```

The `largeArcFlag` and `sweepFlag` parameters tell SVG which of the two possible arcs between the endpoints to draw.

## Why this works

The constraint of circular arcs—having only one degree of freedom—is what makes the system predictable. When shapes move, the bend value stays constant and the arc adjusts naturally. The math is straightforward: three points determine a circle.

Bezier curves are more flexible, but that flexibility becomes ambiguity when both endpoints move independently. We traded flexibility for stability, and the result feels right.

The full implementation lives in `packages/tldraw/src/lib/shapes/arrow/curved-arrow.ts`, with supporting geometry in `packages/editor/src/lib/primitives/utils.ts`.
