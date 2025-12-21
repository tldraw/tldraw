# Why scribble selection never re-tests shapes

Brush selection recomputes everything each frame. If you shrink the rectangle, shapes drop out of the selection. If you expand it, shapes get added back. Every frame is a fresh calculation of what's currently inside the brush.

Scribble selection can't work this way. There's no rectangle to shrink. Once you've drawn through a shape, you can't undraw through it. So we took a different approach: test each shape at most once, and never re-test.

## The incremental model

Scribble selection maintains two sets:

```typescript
// packages/tldraw/src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts
initialSelectedShapeIds = new Set<TLShapeId>()
newlySelectedShapeIds = new Set<TLShapeId>()
```

`initialSelectedShapeIds` holds whatever was selected before you started scribbling (if you held Shift). `newlySelectedShapeIds` holds shapes you've crossed during this scribble. The final selection is the union.

Each frame, we only test shapes that aren't already in `newlySelectedShapeIds`:

```typescript
if (
    editor.isShapeOfType(shape, 'group') ||
    newlySelectedShapeIds.has(shape.id) ||
    editor.isShapeOrAncestorLocked(shape)
) {
    continue
}
```

Once a shape is crossed, it's in the set forever. We never test it again.

## Why this matters for performance

On a page with 5,000 shapes, brush selection tests potentially thousands of shapes every frame. It has optimizations (viewport culling, bounding box checks), but the fundamental operation is "which shapes are currently in the rectangle."

Scribble selection's fundamental operation is "which new shapes did I just cross." If your scribble path moved 10 pixels, you're only testing shapes whose bounding boxes overlap that 10-pixel segment. And once you've crossed a cluster of shapes, you never test them again even if you loop back through the same area.

The longer you scribble, the fewer shapes remain to test. Brush selection doesn't get this benefit—expanding the rectangle tests more shapes, not fewer.

## The bounding box early-out

Before testing geometry, we check if the current line segment is even close to the shape:

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

If the segment is entirely above, below, left, or right of the shape's bounds, skip it. This is cheaper than the geometry test and eliminates most shapes immediately.

Each condition tests one axis. The segment endpoints define a tiny bounding box (just two points). If that tiny box doesn't overlap the shape's bounds, no intersection is possible.

## Frame handling

Frames need special treatment. When you start a scribble inside a frame, you probably want to select shapes inside it, not the frame itself. So we skip frames if the scribble origin is inside:

```typescript
if (
    editor.isShapeOfType(shape, 'frame') &&
    geometry.bounds.containsPoint(editor.getPointInShapeSpace(shape, originPagePoint))
) {
    continue
}
```

This prevents accidentally selecting the frame when you're trying to select its contents. If you want to select the frame, start your scribble outside it.

## The mask check

Shapes inside frames can be clipped. A shape might geometrically extend outside its parent frame, but only the visible portion should count for selection. We check the page mask:

```typescript
const pageMask = this.editor.getShapeMask(outermostShape.id)
if (pageMask) {
    const intersection = intersectLineSegmentPolygon(
        previousPagePoint,
        currentPagePoint,
        pageMask
    )
    if (intersection !== null) {
        const isInMask = pointInPolygon(currentPagePoint, pageMask)
        if (!isInMask) continue
    }
}
```

If the scribble segment crosses the mask but ends outside the visible area, we don't select the shape. You can't select shapes by scribbling through their invisible portions.

## Trade-offs

The incremental approach means scribble selection can only grow, never shrink. If you accidentally cross a shape, it's selected—you can't uncross it by moving away. This matches the "lasso" metaphor (you're drawing a selection region), but it's different from brush selection's "spotlight" metaphor (you're revealing what's currently under the brush).

We could theoretically implement deselection by tracking which shapes the path has crossed twice, but that would add complexity and break the intuitive "draw through to select" model. The current approach is simpler and matches what users expect from lasso tools.

## Key files

- `packages/tldraw/src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts` — Incremental scribble selection
- `packages/editor/src/lib/primitives/intersect.ts:123` — `intersectLineSegmentPolygon` for mask checking
- `packages/editor/src/lib/primitives/geometry/Geometry2d.ts:146` — `hitTestLineSegment`
