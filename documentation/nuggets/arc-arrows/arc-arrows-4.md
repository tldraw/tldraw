---
title: Two arcs - handle arc and body arc
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - arc
  - arrows
readability: 9
voice: 9
potential: 8
accuracy: 9
notes: "Concrete opening with resize scenario. Clear two-arc concept explanation. 'Separating logical intent from visual rendering' is transferable insight. All technical claims verified."
---

# Two arcs: handle arc and body arc

Connect two shapes with a curved arrow in tldraw. Now resize one of the shapes, making it much larger. The arrow still looks right—it enters at the edge, curves smoothly, and the bend you drew is preserved. Move the shapes around and the same thing happens: the arrow attaches cleanly to the boundaries while maintaining its curvature.

This might seem like the obvious behavior, but there's a tension underneath. The arrow "knows" it connects to the center of each shape (or wherever you precisely aimed), but it can't actually render to the center—that would make it pass through the shape. It needs to stop at the edge. And when shapes move, those edge intersection points change even though the logical connection stays the same.

We solve this by storing two separate arcs for every curved arrow. Here's how it works.

## The problem: where should an arrow attach?

An arrow connecting two shapes needs to answer two questions: where does it connect logically, and where does it connect visually? These aren't the same place.

Logically, when you drag an arrow to a rectangle and let go, it snaps to the shape's center (or, if you aimed carefully, to the precise point you targeted). That binding anchor is where the arrow "knows" it connects. It's stored as a normalized position—(0.5, 0.5) for center—so it survives shape transformations without recalculation.

Visually, an arrow pointing at a rectangle shouldn't stop at the center. It should stop at the edge, where the arc intersects the shape's boundary. If it went to the center, it would pass through the shape, looking broken. If it stopped at the binding anchor but tried to render as a tangent curve from there, moving shapes would break the curvature.

We store two separate arcs to reconcile this.

## The handle arc

The handle arc is the source of truth. Its endpoints sit at the binding anchor positions—the center of each shape by default, or the precise point you targeted when creating the binding. These positions are what the arrow "thinks" it connects.

```typescript
interface TLArcArrowInfo {
	type: 'arc'
	start: TLArrowPoint
	end: TLArrowPoint
	middle: VecLike
	handleArc: TLArcInfo // user intent
	bodyArc: TLArcInfo // rendered result
	isValid: boolean
}
```

The handle arc captures everything the user specified: "connect these two points with this much bend." The bend amount is stored on the arrow shape as `shape.props.bend`, a perpendicular distance from the midpoint of the straight line between the handles. This value doesn't change when shapes move.

When shapes do move, we recalculate the handle positions from the stored binding anchors, then reconstruct the handle arc from those positions plus the bend value. The geometry might shift, but the curvature intent stays constant.

```typescript
const terminalsInArrowSpace = getArrowTerminalsInArrowSpace(editor, shape, bindings)
const med = Vec.Med(terminalsInArrowSpace.start, terminalsInArrowSpace.end)
const distance = Vec.Sub(terminalsInArrowSpace.end, terminalsInArrowSpace.start)
const u = Vec.Len(distance) ? distance.uni() : Vec.From(distance)
const middle = Vec.Add(med, u.per().mul(-bend)) // middle handle

const handleArc = getArcInfo(terminalsInArrowSpace.start, terminalsInArrowSpace.end, middle)
```

The handle arc serves as the template. It defines the circle's center and radius. The body arc will use these same values—it's the same circle, just with different start and end points.

## The body arc

The body arc is what renders. Its endpoints sit where the arc intersects each shape's boundary, not at the binding anchors.

We find these intersection points by transforming the handle arc's circle into each shape's local coordinate space, asking the shape geometry for all intersections, then filtering to the points that lie on our arc segment (not elsewhere on the circle). For the starting shape, we pick the intersection about 25% of the way along the arc from the handle position. For the ending shape, we pick the one about 75% of the way along.

```typescript
// Transform circle to shape's local space
const centerInShapeLocalSpace = Mat.applyToPoint(inverseTransform, centerInPageSpace)

// Find all intersection points
let intersections = shapeGeometry.intersectCircle(centerInShapeLocalSpace, handleArc.radius)

// Filter to points on our arc segment
const angleToStart = centerInShapeLocalSpace.angle(startInShapeLocalSpace)
const angleToEnd = centerInShapeLocalSpace.angle(endInShapeLocalSpace)
intersections = intersections.filter(
	(pt) => distFn(angleToStart, centerInShapeLocalSpace.angle(pt)) <= arcAngleSpan
)
```

Once we have these intersection points, we use them as the endpoints for the body arc. This arc has the same center and radius as the handle arc—it's literally the same circle—but different start and end angles.

```typescript
const bodyArc = getArcInfo(intersectionStart, intersectionEnd, adjustedMiddle)
```

## Arrowhead offsets

Arrowheads complicate this slightly. They need room to render without overlapping the target shape. We handle this by sliding each endpoint along the arc by a small offset distance before drawing.

The offset converts from linear distance to angular distance along the arc, then we calculate the new point at that angle:

```typescript
const offsetAngle = (offsetDistance / arcLength) * totalArcAngle
const newEndpoint = Vec.FromAngle(originalAngle + offsetAngle)
	.mul(radius)
	.add(center)
```

When applying these offsets would make the arc too short (the offset endpoints would get too close), we flip the offsets to point outward instead. The arrow pokes slightly into the shapes rather than shrinking to nothing.

## Why two arcs matter

This split is what makes arc arrows stable. The handle arc stays consistent with the user's intent: "connect the center of this shape to the center of that shape with this much bend." The body arc adapts to the visual requirements: "draw from this edge to that edge, accounting for arrowheads."

When shapes move, resize, or rotate:

1. Recalculate handle positions from normalized binding anchors
2. Reconstruct handle arc with same bend value
3. Find new intersection points with shape boundaries
4. Construct body arc from intersections, preserving circle center and radius

The user's original gesture—connecting two points with a certain curvature—survives every transformation. The visual result changes to match the new geometry, but the fundamental relationship stays intact.

Without this distinction, you'd have to pick: either arrows that pass through shape centers (visually wrong) or arrows whose curvature changes as shapes move (logically wrong). The two-arc system gives you stable curvature and correct visual attachment.

The tradeoff is implementation complexity. The code has to track both arcs, coordinate between handle space and body space, and handle edge cases like overlapping shapes where intersections might fail. But that complexity is contained—the rest of the system just sees a stable arrow that behaves predictably.

## Key files

- packages/tldraw/src/lib/shapes/arrow/curved-arrow.ts — `getCurvedArrowInfo` computes both arcs
- packages/tldraw/src/lib/shapes/arrow/arrow-types.ts — Type definitions for `TLArcArrowInfo`, `TLArcInfo`
- packages/tldraw/src/lib/shapes/arrow/shared.ts — Binding and terminal utilities
