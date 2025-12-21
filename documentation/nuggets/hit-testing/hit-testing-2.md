---
title: Hit testing
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - hit testing
  - geometry
  - selection
---

# Hit testing

When you click the canvas, tldraw needs to figure out which shape you clicked on. This seems simple enough—just calculate the distance from the click point to every shape and pick the closest one. But with hundreds or thousands of shapes on the canvas, calculating exact distances for all of them would be expensive.

The trick is to avoid most of those distance calculations entirely.

## The broad phase

Before calculating the exact distance from a point to a shape's geometry, we check whether the point is anywhere near the shape at all. This is the "broad phase"—a cheap test that rejects most shapes instantly.

The test is simple: does the point fall inside the shape's bounding box?

```typescript
if (geometry.bounds.containsPoint(pointInShapeSpace, outerMargin)) {
  // Point might be near the shape—compute actual distance
  distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
} else {
  // Point is nowhere near this shape
  distance = Infinity
}
```

The bounding box check is just four comparisons:

```typescript
static ContainsPoint(box: Box, point: VecLike, margin = 0) {
  return !(
    point.x < box.minX - margin ||
    point.y < box.minY - margin ||
    point.x > box.maxX + margin ||
    point.y > box.maxY + margin
  )
}
```

If you click on the left side of the viewport and a shape is on the right side, the first comparison fails and we're done—no need to compute distances to edges, check if the point is inside a polygon, or project onto bezier curves. For most shapes on most clicks, we spend four comparisons and bail out immediately.

Only shapes whose bounding boxes contain the point proceed to the expensive distance calculation. On a canvas with hundreds of shapes, you might end up computing exact distances for just two or three of them.

## The thin shape problem

This optimization has one edge case. A horizontal or vertical line is essentially one-dimensional—its bounding box might be 500 pixels wide but less than 1 pixel tall. The broad phase would reject it even when you click directly on the line.

So we skip the broad phase for very thin shapes:

```typescript
if (outerMargin === 0 && (geometry.bounds.w < 1 || geometry.bounds.h < 1)) {
  // Skip broad phase for thin shapes—always compute distance
  distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
} else {
  // Normal path: broad phase then distance calculation
  if (geometry.bounds.containsPoint(pointInShapeSpace, outerMargin)) {
    distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
  } else {
    distance = Infinity
  }
}
```

If a shape has width or height less than 1 pixel, we compute the full distance. This costs a bit more for lines, but it's better than missing them entirely.

## Transform once, not many times

Another optimization: instead of transforming the shape's geometry into page space and then checking distances, we transform the click point into the shape's local space. This way we transform one point instead of potentially hundreds of geometry vertices.

```typescript
const pointInShapeSpace = this.getPointInShapeSpace(shape, point)
```

Under the hood:

```typescript
getPointInShapeSpace(shape: TLShape | TLShapeId, point: VecLike): Vec {
  const id = typeof shape === 'string' ? shape : shape.id
  return this._getShapePageTransformCache().get(id)!.clone().invert().applyToPoint(point)
}
```

We cache each shape's page transform, invert it once, and apply it to the click point. For a rotated rectangle, this means we transform the point into the rectangle's coordinate system where it's axis-aligned, then do a simple axis-aligned bounding box check. Much cheaper than rotating four corners of the box into page space.

## The result

Hit testing with a broad phase means most clicks only do a handful of distance calculations, even on complex documents. The bounding box check is so cheap—four comparisons—that it's essentially free compared to computing distances to actual shape edges. And by transforming the click point rather than shape geometry, we avoid the cost of transforming potentially large polygons or curves.

The downside is an extra conditional for every shape and special handling for thin shapes. But that's a small price for turning an O(n) problem with expensive operations into an O(n) problem where most operations are trivial.

## Source

- Hit testing algorithm: `/packages/editor/src/lib/editor/Editor.ts` (`getShapeAtPoint`, line 5198)
- Bounding box check: `/packages/editor/src/lib/primitives/Box.ts` (`containsPoint`, line 433)
- Coordinate transformation: `/packages/editor/src/lib/editor/Editor.ts` (`getPointInShapeSpace`, line 5465)
