---
title: Why brush and scribble selection share almost nothing
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - brush
  - scribble
  - selection
---

# Why brush and scribble selection share almost nothing

Click and drag to create a selection rectangle. Hold Alt and it becomes a freeform lasso. Both feel like variations of the same tool, but they use completely different algorithms under the hood. We couldn't reuse code between them even if we wanted to.

## The visual metaphor determines the math

A rectangle is defined by two corners. You put down an origin point, move the pointer, and the rectangle is always just those two coordinates. Testing whether a shape overlaps a rectangle is one of the cheapest intersection tests you can do—axis-aligned bounding box comparison.

```typescript
// packages/tldraw/src/lib/tools/SelectTool/childStates/Brushing.ts
const brush = Box.FromPoints([originPagePoint, currentPagePoint])
```

A lasso isn't defined by endpoints. It's defined by the *path* you drew. There's no bounding box that captures the essence of a freeform scribble—only the sequence of line segments you created while moving. So instead of testing "is this shape inside a rectangle," we test "did my path cross through this shape."

```typescript
// packages/tldraw/src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts
A = pt.applyToPoint(previousPagePoint)
B = pt.applyToPoint(currentPagePoint)

if (geometry.hitTestLineSegment(A, B, minDist)) {
    newlySelectedShapeIds.add(outermostShape.id)
}
```

The visual metaphor—box vs path—forces the algorithm. We couldn't unify them without either limiting the lasso to a convex hull (losing the "draw through shapes" feel) or computing expensive polygon intersection for the rectangle (far slower than edge testing).

## What "selection" means in each mode

Brush selection answers the question: "which shapes currently overlap this rectangle?" The answer changes every frame. A shape might be selected, then deselected as you move the brush, then selected again. The brush continuously computes the current intersection state.

Scribble selection answers a different question: "which shapes has my path touched?" Once you've drawn through a shape, it stays selected. There's no rectangle to shrink—your path only grows. The scribble accumulates hits, never losing them.

This is why the modes feel different despite serving the same purpose. Brush selection is like a spotlight that reveals shapes as you move it. Scribble selection is like a laser that marks whatever it touches.

## The coordinate transformation trick

Both modes need to test their selection area against each shape's geometry. But shapes can be rotated, and their geometry is defined in local coordinates. We need to transform something.

The naive approach would transform each shape's geometry into page coordinates. But shapes can have complex geometries—arbitrary polygons, curves, paths with many vertices. Transforming all of that is expensive.

The trick is to transform the selection tool instead. For brush selection, we transform the four corners of the rectangle into each shape's local space:

```typescript
const localCorners = pageTransform.clone().invert().applyToPoints(corners)
for (let i = 0; i < 4; i++) {
    A = localCorners[i]
    B = localCorners[(i + 1) % 4]
    if (geometry.hitTestLineSegment(A, B, 0)) {
        results.add(shape.id)
        break
    }
}
```

Four coordinate transforms (one per corner) is cheaper than transforming an arbitrary polygon with dozens of vertices. For scribble, we transform just two points—the segment endpoints—per frame.

This inversion is why both modes ultimately use `hitTestLineSegment`. The brush tests its four edges as line segments in shape space. The scribble tests its current movement as a line segment in shape space. Same underlying primitive, completely different meanings.

## Mode switching

Users can switch between modes mid-drag by pressing or releasing Alt. When this happens, we don't try to convert one selection state into the other. We just transition to the new state machine and let it take over:

```typescript
// In Brushing.ts
if (altKey) {
    this.parent.transition('scribble_brushing', info)
    return
}
```

The scribble starts fresh from wherever you were. The brush rectangle disappears, replaced by the scribble trail. Your current selection is preserved, but the algorithm changes completely.

This is cleaner than trying to maintain continuity. What would it even mean to convert a rectangle into a path mid-drag? The two modes have incompatible semantics.

## Key files

- `packages/tldraw/src/lib/tools/SelectTool/childStates/Brushing.ts` — Rectangular brush selection
- `packages/tldraw/src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts` — Freeform scribble selection
- `packages/editor/src/lib/primitives/geometry/Geometry2d.ts:146` — `hitTestLineSegment()` that both modes use
