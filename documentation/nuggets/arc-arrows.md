# Arc arrows

Draw an arrow with a gentle curve between two rectangles. Now drag one rectangle across the canvas. What should happen to the curve? The obvious answer—use a bezier curve with control points—creates chaos. As shapes move, bezier control points can drift independently, producing S-curves where you drew a clean arc, or loops where you wanted a simple bend. The curve you drew becomes unrecognizable.

Arc arrows solve this by constraining the curvature. They use circular arcs instead of bezier curves, reducing the curve to a single degree of freedom: the bend amount. This constraint preserves the user's intent even as bound shapes move, resize, or rotate. The curve stays recognizably the same curve.

## What arc arrows preserve

When you create an arc arrow, you're expressing several things at once:

- **The bend amount**: How much the arrow curves, and in which direction
- **The binding targets**: Which shapes (or points on the canvas) the arrow connects
- **The anchor positions**: Where on each shape the arrow attaches—center, edge, or a precise spot

All of this information survives change. Drag a shape across the canvas and the arrow follows, maintaining its curvature. Resize the shape and the arrow finds the new edge. Rotate the shape and the arrow adjusts its entry angle. The relationship you defined stays intact.

This stability comes from storing the arrow's properties in normalized, relative terms rather than absolute coordinates. The bend is a perpendicular distance from the midpoint. Binding anchors are normalized positions (0-1) within the target shape's bounds. These values don't change when shapes transform.

## Why circular arcs over bezier curves

The naive approach would use a quadratic bezier curve with two endpoints and one control point. When a bound shape moves, update the endpoints to follow the shape, and maybe interpolate the control point's position based on the new endpoint locations. This seems straightforward until you try it.

**The problem:** Bezier control points have two independent coordinates (x and y) that can move freely. When shapes move at different rates or in different directions, the control point's position becomes ambiguous. Should it maintain its relative distance from each endpoint? Should it stay at the same absolute angle? Should it preserve the curve's maximum distance from the baseline? Each heuristic produces different results, and none reliably preserve what the user drew.

Worse, certain shape movements can flip the control point to the wrong side of the line, suddenly reversing the curve's direction. Or the control point can drift far from the baseline, creating an exaggerated loop where there was a gentle bend. The curve becomes unstable—small shape movements produce disproportionate visual changes.

**Circular arcs eliminate these problems** by reducing the curve to one degree of freedom. A circular arc is defined by exactly three points: start, end, and a middle point that controls the bend. Given any three points, exactly one circle passes through all of them.

```typescript
// Given three points, find the circle that passes through them
const center = centerOfCircleFromThreePoints(start, end, middle)
const radius = Vec.Dist(center, start)
```

When shapes move, we preserve the bend value—the perpendicular distance from the midpoint of the baseline to the arc's middle point. This single scalar value fully defines the curve's shape regardless of endpoint positions. The math is unambiguous: given two new endpoints and the bend distance, there's exactly one circular arc that satisfies those constraints.

The bend value maps directly to how far the middle point sits from the line between endpoints. Positive bends curve one way, negative bends curve the other. The visual result is always a clean, predictable arc—never an S-curve, never a loop, never an unexpected reversal.

## Handle arc vs body arc

Arc arrows actually involve two arcs. Understanding this distinction explains most of the complexity in the implementation.

**The handle arc** represents what the user defined: the logical connection between two points with a certain bend. When an arrow binds to a shape, the handles snap to normalized positions on that shape (center by default, or a precise point the user targeted). This arc is the "source of truth" for the arrow's curvature.

**The body arc** is what renders on screen. It shares the same center and radius as the handle arc, but its endpoints are different—they sit at the intersection points where the arc meets each target shape's boundary. Arrows should appear to touch shape edges, not pass through their centers.

```typescript
// The handle arc captures user intent
const handleArc = getArcInfo(handleStart, handleEnd, middle)

// The body arc is what we actually draw
const bodyArc = getArcInfo(intersectionStart, intersectionEnd, adjustedMiddle)
```

When a bound shape moves, we recalculate the handle positions from the stored normalized anchors, then recalculate the body arc from the new handle arc. The bend amount stays constant because it's stored as a property, not derived from geometry.

## Finding shape intersections

When an arrow binds to a shape, we need to find where the arc meets that shape's boundary. This is a circle-geometry intersection problem, complicated by the fact that shapes can be rectangles, ellipses, stars, or any custom geometry.

The algorithm:

1. Transform the arc's circle into the target shape's local coordinate space
2. Find all intersection points between the circle and the shape's geometry
3. Filter to intersections that lie on the arc segment (not the rest of the circle)
4. Pick the intersection closest to the handle position along the arc's direction

```typescript
let intersections = shapeGeometry.intersectCircle(center, radius)

// Keep only points on our arc segment
intersections = intersections.filter((pt) => distFn(angleToStart, center.angle(pt)) <= arcAngleSpan)
```

For closed shapes (rectangles, ellipses), we want the intersection nearest to about 25% of the way along the arc from the handle—this keeps arrows pointing "into" the shape rather than grazing tangentially. For open shapes (lines, polylines), we take the nearest intersection.

## Arrowhead offsets

Arrowheads need room to render without overlapping the target shape. We handle this by sliding the arc's endpoint along the curve by a small offset before drawing.

The offset converts from linear distance to arc angle, then we calculate a new point at that angle on the same circle:

```typescript
const offsetAngle = (offsetDistance / arcLength) * totalArcAngle
const newEndpoint = Vec.FromAngle(originalAngle + offsetAngle)
	.mul(radius)
	.add(center)
```

When this would make the arrow too short (endpoints getting too close), we flip the offsets outward instead—the arrow pokes slightly into the shapes rather than disappearing.

## Edge cases with overlapping shapes

Some configurations need special handling:

- **Double-bound**: Both terminals connect to the same shape (a self-referential arrow). If the resulting arc would be too short, we show the handle positions directly.
- **Containment**: One target shape contains the other. We force precise anchoring because center-snap behavior produces confusing results with nested shapes.

```typescript
const relationship = getBoundShapeRelationships(editor, startShapeId, endShapeId)

if (relationship === 'double-bound' && arcLength < 30) {
	// Use handle positions directly
	tempA.setTo(originalStart)
	tempB.setTo(originalEnd)
}
```

## Rendering

The final arc renders as an SVG path using the `A` (arc) command. SVG arcs need two flags beyond the radius and endpoint: `largeArcFlag` (take the short or long way around the circle) and `sweepFlag` (clockwise or counterclockwise). These come directly from the body arc calculations.

```typescript
new PathBuilder()
	.moveTo(info.start.point.x, info.start.point.y)
	.circularArcTo(
		info.bodyArc.radius,
		!!info.bodyArc.largeArcFlag,
		!!info.bodyArc.sweepFlag,
		info.end.point.x,
		info.end.point.y
	)
	.toSvg(opts)
```

## The tradeoff

Circular arcs sacrifice expressiveness for stability. You can't draw an S-curve or a spiral connector. But this constraint rarely matters in practice. Consider what happens when users create arrow connections:

**With bezier curves:** User draws a gentle curve from shape A to shape B. Later, shape A moves left while shape B moves right. The bezier control point tries to maintain some relationship to both endpoints, but the geometry fights itself. The curve might flip to the wrong side, might become too pronounced, or might develop an unexpected inflection point. The user has to manually fix the arrow by adjusting handles that weren't visible when they created it.

**With circular arcs:** User draws the same gentle curve. Shapes A and B move in any direction, at any speed. The bend amount stays constant (e.g., "20 pixels perpendicular to the baseline"), so the curve simply adjusts its radius to maintain that perpendicular distance. The visual appearance changes, but the fundamental curve shape—the amount of "bendiness" the user intended—remains intact. No manual correction needed.

Most arrow connections need exactly one thing: a clean curve that bends around obstacles. The single-degree-of-freedom design makes that curve predictable and maintainable across every transformation the canvas throws at it.

The handle arc / body arc distinction adds complexity to the implementation, but it's essential. Without it, you'd have to choose between arrows that pass through shape centers (confusing) or arrows whose curvature changes as shapes move (unstable). Neither is acceptable for a tool people rely on.

## Key files

- packages/tldraw/src/lib/shapes/arrow/curved-arrow.ts — Main arc arrow geometry calculations
- packages/tldraw/src/lib/shapes/arrow/shared.ts — Binding utilities and terminal positioning
- packages/tldraw/src/lib/shapes/arrow/arrowheads.ts — Arrowhead positioning along arcs
- packages/tldraw/src/lib/shapes/arrow/ArrowPath.tsx — SVG path generation
- packages/editor/src/lib/primitives/utils.ts — Circle-from-three-points utility
