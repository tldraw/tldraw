---
title: Brush vs scribble selection
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - brush
  - scribble
  - selection
---

# Brush vs scribble selection

Click and drag to create a selection marquee. Hold Alt and the marquee becomes a freeform lasso that follows your pointer. Both feel instant, but they use completely different algorithms to decide which shapes to select. The marquee tests rectangle intersection. The scribble tests whether your drawn path crosses each shape's geometry. Here's why that distinction matters and how each stays fast.

## The divergence point

Selection starts with a simple question: did the user mean to draw a box, or a freeform path? In tldraw, holding Alt switches from brush mode to scribble mode. The two modes share almost nothing in their implementation.

Brush selection creates a rectangle from the origin point to the current pointer position. Every frame, it tests which shapes overlap that rectangle. This is geometry's cheapest intersection test—axis-aligned rectangle vs axis-aligned rectangle.

Scribble selection doesn't create a rectangle at all. Instead, it treats your pointer movement as a series of line segments, testing whether each segment crosses any shape's geometry. The scribble itself becomes the selection tool, like a laser beam that selects anything it touches.

## Brush selection: rectangle intersection

The brush creates a `Box` from the start and current pointer positions:

```typescript
// packages/tldraw/src/lib/tools/SelectTool/childStates/Brushing.ts
const brush = Box.FromPoints([originPagePoint, currentPagePoint])
```

For each shape, the algorithm tries to avoid expensive work. First, it checks if the brush completely contains the shape's bounding box—if so, the shape is definitely selected and we skip further tests:

```typescript
if (brush.contains(pageBounds)) {
    results.add(shape.id)
    continue
}
```

If the brush merely *collides* with the shape's bounds (overlap but not containment), we need to check if the brush actually touches the shape's geometry. Here's where it gets interesting: we test the brush's four edges against the shape's geometry as line segments.

```typescript
if (brush.collides(pageBounds)) {
    const localCorners = pageTransform.clone().invert().applyToPoints(corners)
    for (let i = 0; i < 4; i++) {
        A = localCorners[i]
        B = localCorners[(i + 1) % 4]
        if (geometry.hitTestLineSegment(A, B, 0)) {
            results.add(shape.id)
            break
        }
    }
}
```

Notice the coordinate transformation. Shapes can be rotated, and their geometry is defined in local coordinates. We transform the brush corners into each shape's local space rather than transforming every shape into page space. Four coordinate transforms is cheaper than transforming arbitrary polygons.

## Scribble selection: following the path

Scribble selection works incrementally. Each pointer move creates a line segment from the previous position to the current one:

```typescript
// packages/tldraw/src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts
A = pt.applyToPoint(previousPagePoint)
B = pt.applyToPoint(currentPagePoint)

if (geometry.hitTestLineSegment(A, B, minDist)) {
    newlySelectedShapeIds.add(outermostShape.id)
}
```

The scribble never reconsiders already-selected shapes. Once you've crossed a shape with your lasso, it stays selected. This is important for performance—you're not re-testing thousands of shapes every frame. You're only testing each shape once, when your path first reaches its vicinity.

There's a bounding box early-out here too. Before the expensive line-segment-to-geometry test, we check if the line segment is even close to the shape:

```typescript
const { bounds } = geometry
if (
    bounds.minX - minDist > Math.max(A.x, B.x) ||
    bounds.minY - minDist > Math.max(A.y, B.y) ||
    bounds.maxX + minDist < Math.min(A.x, B.x) ||
    bounds.maxY + minDist < Math.min(A.y, B.y)
) {
    continue
}
```

If the segment is entirely above, below, left, or right of the shape's bounds, skip it. This culls most shapes without any geometry math.

## Wrap mode vs intersection

Both selection modes support two semantics: intersection (shape touches the selection area) and containment (shape is completely inside the selection area). The Ctrl key toggles between them.

For brush selection, containment is trivial—we already check `brush.contains(pageBounds)`. When in wrap mode, that's the *only* passing condition. Shapes that merely intersect the brush edge are skipped:

```typescript
if (isWrapping || editor.isShapeOfType(shape, 'frame')) {
    continue // Must completely enclose to select
}
```

Frames always require wrap mode, even outside wrap mode. You can't accidentally select a frame by brushing across its edge—you have to completely surround it. This prevents frustrating mis-selections when trying to select shapes inside a frame.

Scribble selection doesn't currently support wrap mode. The "touch to select" semantic is core to how lassos feel—you're literally drawing a line through what you want.

## Filled vs hollow shapes

Both selection modes use the same geometry system from hit testing. A filled rectangle selects if the brush edge crosses its interior *or* its boundary. A hollow rectangle only selects if the brush edge crosses its boundary.

This is handled by `hitTestLineSegment` on each geometry type. The base implementation in `Geometry2d` walks the shape's vertices as line segments, checking for intersection:

```typescript
// packages/editor/src/lib/primitives/geometry/Geometry2d.ts
for (let i = 0; i < vertices.length; i++) {
    p = vertices[i]
    if (i < nextLimit) {
        const next = vertices[(i + 1) % vertices.length]
        if (linesIntersect(A, B, p, next)) return 0
    }
}
```

For filled shapes, there's an additional check: if the nearest point on the segment is inside the polygon, it's a hit even without edge intersection. This means you can brush across the interior of a filled shape without touching its edges and still select it.

## Frame masks and visibility

Shapes inside frames need special handling. A shape might be geometrically hit by the brush, but if it's clipped by its parent frame and the visible portion isn't in the selection, it shouldn't be selected.

Both selection modes check the page mask—a polygon representing the visible area of each shape after frame clipping:

```typescript
const pageMask = editor.getShapeMask(selectedShape.id)
if (
    pageMask &&
    !polygonsIntersect(pageMask, corners) &&
    !pointInPolygon(currentPagePoint, pageMask)
) {
    return
}
```

This prevents selecting shapes by brushing over their clipped (invisible) portions. If a shape extends outside its parent frame, you can only select it by touching its visible part.

## Performance considerations

On a page with 5,000 shapes, selection needs to stay responsive. Both modes use several strategies:

**Only test visible shapes when possible.** If the brush is entirely within the viewport and the viewport hasn't scrolled during the interaction, we only test shapes currently being rendered. Culled shapes are skipped.

```typescript
const shapesToHitTest =
    brushBoxIsInsideViewport && !this.viewportDidChange
        ? editor.getCurrentPageRenderingShapesSorted()
        : editor.getCurrentPageShapesSorted()
```

**Exclude shapes upfront.** Groups and locked shapes are collected into an exclusion set at the start and never tested.

**Incremental selection for scribble.** Already-selected shapes are skipped in subsequent frames. The selection can only grow, never shrink, so we don't re-test shapes.

**Bounds checks before geometry.** Both modes check bounding box intersection before computing actual geometry intersection.

## Edge scrolling

Both selection modes support edge scrolling—when you drag near the viewport edge, the canvas scrolls to reveal more content. The selection updates each tick to include newly-visible shapes:

```typescript
override onTick({ elapsed }: TLTickEventInfo) {
    editor.edgeScrollManager.updateEdgeScrolling(elapsed)
}
```

The brush or scribble continues to select shapes as they scroll into view, making it possible to select shapes across the entire page without releasing the mouse.

## The visual difference

Brush selection shows a translucent rectangle overlay. Scribble selection shows a fading polyline that follows your path—the same scribble effect used for eraser feedback. Both provide immediate visual feedback about what you're selecting, updating the actual selection on every pointer move.

The algorithms are different because the visual metaphor is different. A rectangle is defined by two corners. A lasso is defined by a path. Trying to unify them would either limit the lasso to a convex hull (losing the "draw through shapes" feel) or require complex polygon intersection for the rectangle (slower than edge testing). Each metaphor gets the algorithm that makes it feel right.

## Key files

- `packages/tldraw/src/lib/tools/SelectTool/childStates/Brushing.ts` — Rectangular brush selection state
- `packages/tldraw/src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts` — Freeform scribble selection state
- `packages/editor/src/lib/primitives/geometry/Geometry2d.ts:146` — `hitTestLineSegment()` base implementation
- `packages/editor/src/lib/primitives/Box.ts` — Rectangle intersection via `contains()` and `collides()`
- `packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts` — Scribble visual feedback system
