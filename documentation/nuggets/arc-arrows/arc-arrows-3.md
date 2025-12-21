---
title: Edge cases and shape relationships
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
notes: 'Thorough edge case coverage. Opening questions are engaging. Verified: double-bound <30px check, offset flipping multipliers (-1.5, -2), clamping logic. Quite long - could be tightened.'
---

# Arc arrows

Connect two shapes with a curved arrow. Now drag one shape inside the other. What should the arrow do? Or drag both shapes so close together that there's no room for an arrowhead—should the arrow disappear, shrink, or flip outward? Connect a shape to itself with a tight curve—how do you even define which way the arc should bend?

These edge cases don't come up often, but when they do, the system needs to handle them without breaking. Arc arrows include several layers of relationship detection and graceful degradation that keep the canvas feeling polished even when users create unusual configurations.

## Detecting shape relationships

When both ends of an arrow bind to shapes, those shapes can relate to each other in ways that affect how the arrow should behave. We detect four categories:

```typescript
function getBoundShapeRelationships(editor, startShapeId, endShapeId) {
	if (!startShapeId || !endShapeId) return 'safe'
	if (startShapeId === endShapeId) return 'double-bound'
	const startBounds = editor.getShapePageBounds(startShapeId)
	const endBounds = editor.getShapePageBounds(endShapeId)
	if (startBounds.contains(endBounds)) return 'start-contains-end'
	if (endBounds.contains(startBounds)) return 'end-contains-start'
	return 'safe'
}
```

**Safe**: Normal case. Two separate shapes with no containment. Standard arc calculation applies.

**Double-bound**: Both terminals connect to the same shape—a self-referential arrow. The arc might loop around or curve back on itself, depending on where the anchors attach.

**Containment**: One shape completely contains the other. Without special handling, center-snapped bindings would produce confusing results because the arrow would pass through the outer shape to reach the inner one.

These relationships determine how we interpret anchor positions and whether we apply fallback behaviors.

## Double-bound arrows

When an arrow connects a shape to itself, the standard arc calculation can produce degenerate geometry. If the two anchors are close together—say, both near the top edge of a rectangle—the resulting arc might be so tight that it becomes impossible to render.

We detect this case by measuring arc length:

```typescript
if (relationship === 'double-bound' && arcLength < 30) {
	// Use handle positions directly instead of trying to compute body arc
	tempA.setTo(handleStart)
	tempB.setTo(handleEnd)
	tempC.setTo(middle)
}
```

When the arc would be shorter than 30 pixels for a self-referential arrow, we render the handle positions directly rather than attempting to calculate shape intersections. This keeps the arrow visible and interactive, even if the geometry is technically degenerate.

## Containment handling

When one shape contains another, center-snapping produces misleading arrow paths. The arrow appears to pass through the containing shape's boundary to reach the center of the contained shape, which looks like a mistake.

We force precise anchoring in containment scenarios. Instead of snapping to shape centers (the default for non-precise bindings), the arrow uses the exact normalized positions where the user targeted when creating the binding. This makes the containment relationship visible—the arrow clearly enters the outer shape before reaching the inner one.

The forced precision happens during terminal calculation, not in the relationship detection itself. By the time we're computing arc geometry, the anchors already reflect the containment-aware positions.

## Offset flipping for short arrows

Arrowheads need clearance. We normally offset each endpoint along the arc by a small distance (10 pixels plus half the stroke width) to make room for the arrowhead without overlapping the target shape.

But when shapes get very close together, this offset can consume the entire arc length. The arrow would shrink to nothing.

Instead, we flip the offsets outward:

```typescript
if (Vec.DistMin(tA, tB, minLength)) {
	if (offsetA !== 0 && offsetB !== 0) {
		offsetA *= -1.5
		offsetB *= -1.5
	} else if (offsetA !== 0) {
		offsetA *= -2
	} else if (offsetB !== 0) {
		offsetB *= -2
	}
	// Clamp to prevent body arc exceeding handle arc
	const minOffsetA = 0.1 - distFn(handle_aCA, aCA) * handleArc.radius
	offsetA = Math.max(offsetA, minOffsetA)
}
```

The negative multipliers push the offsets away from the arc interior instead of into it. The arrowheads now point outward, slightly penetrating the target shapes. This looks odd but keeps the arrow visible and interactive. Without this fallback, the arrow would disappear when shapes get too close, then suddenly reappear when they separate—a jarring experience.

The clamping ensures the body arc doesn't exceed the handle arc's bounds. Even with flipped offsets, we maintain the constraint that the body arc shares the same center and radius as the handle arc.

## Shape intersection fallbacks

When an arrow binds to a shape, we calculate where the arc intersects that shape's boundary. This is a geometry problem: find all points where a circle crosses the shape's edges, filter to points on our arc segment, and pick the appropriate one.

But not every arc-shape configuration produces an intersection. The arc might be too short to reach the shape's edge. Or the shape might be so small that the arc's circle passes entirely around it without crossing.

For closed shapes (rectangles, ellipses, polygons), we fall back to the nearest point on the shape's geometry:

```typescript
if (intersections.length === 0) {
	// Use nearest point on geometry
	const nearestPoint = shapeGeometry.nearestPoint(handlePosition)
	intersections = [nearestPoint]
}
```

For open shapes (lines, polylines), we use the handle position directly. There's no "inside" to point toward, so the logical fallback is the position the binding specifies.

These fallbacks ensure every bound arrow has well-defined endpoints, even in geometrically impossible configurations. The arrow might not look perfect, but it remains visible and editable.

## Validity checks

Some configurations can't produce valid arcs at all. Zero-length arcs, infinite radii, or NaN values in the center coordinates all indicate degenerate cases.

We check for these explicitly:

```typescript
if (
	handleArc.length === 0 ||
	handleArc.size === 0 ||
	!isSafeFloat(handleArc.length) ||
	!isSafeFloat(handleArc.size)
) {
	return getStraightArrowInfo(editor, shape, bindings)
}
```

When arc geometry fails, we fall back to a straight arrow. The arrow still renders, still connects the shapes, and still responds to interactions. It just doesn't curve.

This fallback also applies when the bend value is too small (less than 8 pixels after scaling)—at that point, the visual difference between a straight line and a tiny arc is imperceptible, so we simplify the rendering.

The body arc also has a validity flag:

```typescript
isValid: bodyArc.length !== 0 && isFinite(bodyArc.center.x) && isFinite(bodyArc.center.y)
```

Invalid body arcs render as straight lines between the terminal points. This separation means even if the body arc calculation fails (say, due to extreme shape positions), the arrow doesn't disappear—it just degrades to simpler geometry.

## Target selection for closed shapes

When an arc intersects a closed shape at multiple points, we need to pick which intersection to use. The obvious choice—nearest intersection to the handle—doesn't always produce the best result.

Consider an arrow approaching a rectangle from the side. The nearest intersection might be a tangential graze on the far edge, making the arrow appear to pass alongside the shape rather than pointing into it.

We use distance along the arc as the selection criterion, targeting 25% of the way from the start terminal or 75% from the end terminal:

```typescript
const targetAngle = isStart ? 0.25 * arcAngleSpan : 0.75 * arcAngleSpan
const closestIntersection = intersections.reduce((best, pt) => {
	const angleToPt = distFn(angleToStart, center.angle(pt))
	const distFromTarget = Math.abs(angleToPt - targetAngle)
	return distFromTarget < bestDist ? pt : best
})
```

This makes arrows tend to point "into" shapes rather than grazing their edges. It's a heuristic that works well for typical arrow angles. The 25%/75% positions aren't magic—they're based on observing what looks right for common use cases.

When shapes are very close or at unusual angles, this heuristic can still produce unexpected results. But it's better than the alternatives we tried. Nearest intersection creates tangential grazes. Center-relative angle calculation doesn't account for shape geometry. The 25%/75% rule degrades gracefully—even when it picks a suboptimal intersection, the arrow is still clearly connected to the shape.

## When edge cases collide

Some configurations involve multiple edge cases at once. A self-referential arrow where the shape is so small that the arc is too short and the offsets need flipping. Or a contained shape where the outer shape moves so close that intersections fail.

The relationship detection, offset flipping, intersection fallbacks, and validity checks form layers of defense. Each layer handles one kind of problem, and they compose. When multiple edge cases apply, each check contributes its correction independently.

This means the system doesn't need to anticipate every possible combination. A double-bound arrow with no intersections hits the double-bound check (use handle positions directly) and the intersection fallback (use nearest point). Both apply. The arrow renders.

The validity flag provides a final escape hatch. If all the layers of correction still produce unusable geometry, we mark the arc invalid and render a straight line. This is the absolute fallback—it's not elegant, but it keeps the arrow on screen and functional.

## The goal isn't perfection

These edge cases produce arrows that sometimes look odd. A self-referential arrow might show as a tiny curve. Arrowheads might point outward when shapes get too close. An arrow to a contained shape might not enter at the visually optimal point.

But the arrows stay visible, stay editable, and stay functional. Users can fix them by adjusting positions or anchor points. The system doesn't freeze, throw errors, or make arrows disappear.

This is the real goal of edge case handling: ensure nothing breaks. The math might produce degenerate cases, but the user experience degrades gracefully. Every configuration yields a renderable arrow with well-defined geometry. Edge cases are noticeable but not catastrophic.

The polish comes from handling enough edge cases that most users never encounter broken states. But when they do push the system into unusual configurations—because they're exploring, experimenting, or making something weird—the canvas keeps working.

## Key files

- packages/tldraw/src/lib/shapes/arrow/curved-arrow.ts — Arc calculation with edge case handling
- packages/tldraw/src/lib/shapes/arrow/shared.ts — Shape relationship detection and binding utilities
- packages/tldraw/src/lib/shapes/arrow/arrow-types.ts — Arc info structure and validity flags
