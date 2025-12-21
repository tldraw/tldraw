# Arrow bend with circular arcs

If you've ever connected two shapes with a curved arrow in tldraw, you might have noticed that the curve stays stable as you drag the shapes around. Pull them apart and the arc stretches. Push them together and it tightens. Rotate one shape and the arrow adjusts its entry angle. Through all of this, the curve you drew remains recognizable—no sudden flips, no S-curves appearing where you drew a clean arc.

This stability might seem like the obvious way curved arrows _should_ work, but it's not what you'd get with the standard approach. Most vector tools use bezier curves for this, and beziers have a nasty habit of misbehaving when their endpoints move independently. We use circular arcs instead, which reduces the curve to a single number: how much it bends.

Here's how it works.

## The bezier problem

A quadratic bezier curve has two endpoints and one control point. When an arrow binds to shapes, the endpoints follow the shapes as they move. But what should happen to the control point?

The control point has two coordinates (x and y) that can move independently. When the bound shapes move at different rates or in different directions, there's no obvious way to update the control point's position. Should it maintain its relative distance from each endpoint? Should it stay at the same absolute angle? Should it preserve the curve's maximum distance from the baseline?

Every heuristic produces different results. None reliably preserve what you drew. Worse, certain movements can flip the control point to the wrong side of the line between endpoints, suddenly reversing which way the arrow curves. Or the control point drifts far from the baseline, creating an exaggerated loop where there was a gentle bend.

Small shape movements produce disproportionate visual changes. The curve becomes unstable.

## Circular arcs: one degree of freedom

We chose circular arcs because they reduce the curve to a single value: the bend amount.

Given any three points, exactly one circle passes through all of them. This is the key insight. Instead of storing a control point with two independent coordinates, we store a scalar bend value—the perpendicular distance from the midpoint of the baseline to the arc's middle point.

```typescript
const med = Vec.Med(terminalsInArrowSpace.start, terminalsInArrowSpace.end) // midpoint
const distance = Vec.Sub(terminalsInArrowSpace.end, terminalsInArrowSpace.start)
const u = Vec.Len(distance) ? distance.uni() : Vec.From(distance) // unit vector
const middle = Vec.Add(med, u.per().mul(-bend)) // perpendicular offset by bend amount
```

When bound shapes move, we recalculate the endpoints from the binding anchors, compute the new midpoint, and offset perpendicular by the stored bend value. This gives us the middle point. Now we have three points, which uniquely define a circle:

```typescript
// Given three points, find the circle that passes through them
const center = centerOfCircleFromThreePoints(start, end, middle)
const radius = Vec.Dist(center, start)
```

The math is unambiguous. Given two endpoints and a bend distance, there's exactly one circular arc that satisfies those constraints. The bend value maps directly to visual curvature—positive bends curve one way, negative bends curve the other. No S-curves, no loops, no unexpected reversals.

## What this preserves

The bend amount is the arrow's "curvature intent." When you create an arc arrow, you're expressing how much the arrow should curve and in which direction. That intent stays constant as shapes transform.

Drag shapes across the canvas and the arrow adjusts its arc radius to maintain the perpendicular distance. The visual appearance changes—the arc tightens or widens—but the fundamental curve shape remains recognizable. Resize shapes and the arrow recomputes intersection points but keeps the same bend. Rotate shapes and the arrow adjusts entry angles while preserving curvature.

The relationship you defined stays intact because it's stored as a relative, normalized value that doesn't depend on absolute coordinates.

## The tradeoff

Circular arcs sacrifice expressiveness for stability. You can't draw an S-curve or a spiral connector with a single arrow. But that constraint rarely matters.

Most arrow connections need exactly one thing: a clean curve that bends around obstacles and stays recognizable as shapes move. The single-degree-of-freedom design makes that curve predictable and maintainable across every transformation.

With bezier curves, you'd need to choose which heuristic to use when shapes move—and every heuristic fails in some scenario, forcing users to manually fix arrows by adjusting control points that weren't visible when they created the arrow. With circular arcs, the math is deterministic. The bend value unambiguously defines the curve for any endpoint configuration.

## Key files

- `packages/tldraw/src/lib/shapes/arrow/curved-arrow.ts` — Arc arrow geometry calculations
- `packages/editor/src/lib/primitives/utils.ts` — Circle-from-three-points utility (`centerOfCircleFromThreePoints`)
- `packages/tldraw/src/lib/shapes/arrow/shared.ts` — Binding utilities and terminal positioning
