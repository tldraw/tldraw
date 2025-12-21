---
title: Handle arc and body arc distinction
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - arrows
  - arcs
  - curves
readability: 8
voice: 8
potential: 7
accuracy: 8
notes: 'Clear handle/body arc explanation. Narrower focus than draft 1 - misses the Bezier problem framing that makes the solution compelling. Code examples are accurate but less complete.'
---

# Arc arrows

When we added curved arrows that bind to shapes, we ran into a conceptual problem: what exactly does the curve represent? If you draw an arrow from one shape to another with a specific bend, and then move those shapes around, where should the arrow endpoints be?

The naive answer—put them at the shape boundaries—breaks down immediately. As shapes move, the intersection points slide around the perimeter. The curve changes unpredictably. Small movements produce large visual jumps. The user drew a specific curve, but we can't preserve it.

The solution is to split the curve into two distinct arcs. One represents the user's intent—the logical connection between shapes. The other is what actually renders on screen. They share the same circular path, but their endpoints sit at different positions.

## Handle arc vs body arc

The **handle arc** is the curve the user drew. Its endpoints sit at the binding anchor positions—typically the center of each shape, or the exact point the user targeted. This arc captures the logical relationship: "connect shape A to shape B with this much bend."

The **body arc** is what renders. Its endpoints sit at the shape boundaries, where the circular path intersects the shape geometry. This arc accounts for arrowheads and visual polish, but it's derived from the handle arc—they share the same center and radius.

Here's how they're represented:

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

When shapes move, we recalculate the body arc from the handle arc. The handle arc stays stable because binding anchors move with the shapes. The body arc adjusts to find new intersection points.

## Finding shape intersections

To find where the body arc should end, we need to know where the circular path intersects the shape boundary. This is a geometric problem: given a circle (defined by the handle arc's center and radius) and a shape, find the intersection points.

The algorithm transforms the arc's circle into the shape's local coordinate space, then asks the shape's geometry object for intersections:

```typescript
// Transform circle into shape space
const inShapeSpace = editor.getPointInShapeSpace(shape, center)

// Ask geometry for all intersections with this circle
let intersections = geometry.intersectCircle(inShapeSpace, radius)
```

Not all intersections are valid—we only want points that actually sit on the arc segment, not somewhere else on the circle. We filter by angle:

```typescript
intersections = intersections.filter(
	(pt) => distFn(angleToStart, centerInShapeSpace.angle(pt)) <= arcAngle
)
```

Once we have valid intersections, we need to pick the right one. For closed shapes (rectangles, ellipses), we pick the intersection closest to 25% along the arc for the start terminal, or 75% for the end terminal. These positions ensure arrows point "into" the shape rather than grazing tangentially.

For open shapes (lines, polylines), we just pick the nearest intersection.

If no intersection exists—maybe the arc doesn't actually reach the shape—we fall back to the nearest point on the geometry boundary for closed shapes, or the handle position for open shapes.

## Arrowhead offsets

Arrowheads complicate things. We don't want the line to extend under the arrowhead; it should stop at the arrowhead's base. This means the body arc needs to be slightly shorter than the handle arc.

We calculate the offset based on stroke width and arrowhead size:

```typescript
const strokeOffset =
	STROKE_SIZES[shape.props.size] / 2 +
	('size' in targetShape.props ? STROKE_SIZES[targetShape.props.size] / 2 : 0)
const offset = (BOUND_ARROW_OFFSET + strokeOffset) * shape.props.scale
```

We convert this linear distance to an arc angle and adjust the endpoint:

```typescript
if (offset !== 0) {
	endpoint
		.setTo(handleArc.center)
		.add(
			Vec.FromAngle(startAngle + arcAngle * ((offset / arcLength) * (isClockwise ? 1 : -1))).mul(
				handleArc.radius
			)
		)
}
```

When the arc becomes too short—endpoints nearly touching—we flip the offsets outward. This makes the arrow poke slightly into the shapes rather than collapsing to nothing. It's a visual compromise that preserves the arrow's existence even in tight spaces.

## Why this matters

This two-arc system solves the fundamental problem: how do you preserve a user-drawn curve when its endpoints need to move? The answer is to separate the logical relationship from the visual rendering.

The handle arc is stable—it moves with the shapes and maintains the bend the user specified. The body arc is flexible—it adjusts to find clean intersection points and accommodate arrowheads. They're both derived from the same circular path, so they feel like the same curve. But splitting them lets us maintain both the user's intent and a polished visual result.

Without this separation, curved arrows would feel unstable. Move a shape slightly and the curve changes unexpectedly. With it, curved arrows behave the way you'd expect: they follow the shapes while maintaining the character of the curve you drew.

## Source files

- `packages/tldraw/src/lib/shapes/arrow/curved-arrow.ts` - Arc geometry and intersection logic
- `packages/tldraw/src/lib/shapes/arrow/arrow-types.ts` - Type definitions for handle and body arcs
- `packages/tldraw/src/lib/shapes/arrow/shared.ts` - Binding anchors and terminals
