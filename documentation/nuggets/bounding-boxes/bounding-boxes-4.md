---
title: Bounding boxes
created_at: 01/13/2026
updated_at: 01/19/2026
keywords:
  - bounding boxes
  - AABB
  - collision detection
  - viewport culling
  - transforms
---

tldraw is an infinite canvas. You can pan forever, zoom from galaxy-view down to individual pixels, and scatter thousands of shapes across the space. This freedom creates a problem: we constantly need to know where things are.

When you click somewhere, we need to figure out what you hit. When you drag a selection rectangle, we need to find every shape inside it. When you pan the camera, we need to decide what to render. Every one of these operations boils down to the same question: does this region overlap with that shape?

We use bounding boxes for this. A bounding box is the smallest axis-aligned rectangle that contains a shape. "Axis-aligned" means the edges are perfectly horizontal and vertical—no matter how the shape itself is rotated, its bounding box stays upright.

[img]

## Why axis-aligned?

The alignment constraint is what makes bounding boxes fast. Checking if two axis-aligned boxes overlap is just four comparisons:

```tsx
// packages/editor/src/lib/primitives/Box.ts:421-423
static Collides(A: Box, B: Box) {
  return !(A.maxX < B.minX || A.minX > B.maxX || A.maxY < B.minY || A.minY > B.maxY)
}
```

If box A is entirely to the left of box B, they don't collide. Same for right, above, below. We check all four directions; if none of them separates the boxes, they must overlap.

We use this calculation everywhere—hit testing, viewport culling, snapping, resize handles. But there's a catch: what happens when a shape rotates?

## Rotating a rectangle

Say you have a 100×50 pixel rectangle sitting at the origin. Its bounding box is straightforward:

```tsx
{ x: 0, y: 0, w: 100, h: 50 }
```

Now rotate it 45°. You might try applying the rotation to each corner:

```tsx
const corners = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 50 },
  { x: 0, y: 50 },
]

const rotated = corners.map((p) => {
  const cos = Math.cos(Math.PI / 4)
  const sin = Math.sin(Math.PI / 4)
  return {
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  }
})

// [{x: 0, y: 0}, {x: 70.7, y: 70.7}, {x: 35.4, y: 106.1}, {x: -35.4, y: 35.4}]
```

These rotated points describe where the corners ended up, but the edges connecting them are no longer axis-aligned. If we tried to use this rotated box for collision detection, we'd need the [separating axis theorem](https://dyn4j.org/2010/01/sat/)—checking more axes, computing dot products, doing real work. That's fine for a few shapes, but we have thousands.

## Recomputing the AABB

Instead, we take those rotated corner points and compute a new axis-aligned box around them. We find the minimum and maximum x and y values, and that gives us the tightest upright rectangle that contains the rotated shape:

```tsx
// packages/editor/src/lib/editor/Editor.ts:4838-4847
@computed private _getShapePageBoundsCache(): ComputedCache<Box, TLShape> {
  return this.store.createComputedCache<Box, TLShape>('pageBoundsCache', (shape) => {
    const pageTransform = this.getShapePageTransform(shape)
    if (!pageTransform) return undefined

    return Box.FromPoints(
      pageTransform.applyToPoints(this.getShapeGeometry(shape).boundsVertices)
    )
  })
}
```

The `Box.FromPoints` function does the actual work:

```tsx
// packages/editor/src/lib/primitives/Box.ts:390-406
static FromPoints(points: VecLike[]): Box {
  if (points.length === 0) return new Box()
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0, n = points.length; i < n; i++) {
    const point = points[i]
    minX = Math.min(point.x, minX)
    minY = Math.min(point.y, minY)
    maxX = Math.max(point.x, maxX)
    maxY = Math.max(point.y, maxY)
  }
  return new Box(minX, minY, maxX - minX, maxY - minY)
}
```

For our 100×50 rectangle rotated 45°, the new bounding box ends up roughly 106×106 pixels. It's bigger than the original—stretched to contain all four rotated corners.

[img]

## Nested transforms

Shapes can live inside frames, and frames can be rotated and positioned anywhere on the canvas. If a rectangle sits inside a frame that's rotated 30°, the rectangle's final position depends on both transforms. We compose them:

```tsx
// packages/editor/src/lib/editor/Editor.ts:4784-4798
@computed private _getShapePageTransformCache(): ComputedCache<Mat, TLShape> {
  return this.store.createComputedCache<Mat, TLShape>('pageTransformCache', (shape) => {
    if (isPageId(shape.parentId)) {
      return this.getShapeLocalTransform(shape)
    }
    const parentTransform = this._getShapePageTransformCache().get(shape.parentId) ?? Mat.Identity()
    return Mat.Compose(parentTransform, this.getShapeLocalTransform(shape)!)
  })
}
```

The function recurses up the parent hierarchy. If the shape's parent is the page, we just use the shape's local transform. Otherwise, we get the parent's page transform and multiply it with the shape's local transform. No matter how deeply nested, we can always compute the final page-space bounding box by transforming the vertices and finding the min/max values.

## Viewport culling

When you pan or zoom, we need to figure out which shapes are visible. This runs on every camera change, for every shape on the page:

```tsx
// packages/editor/src/lib/editor/derivations/notVisibleShapes.ts:11-30 (simplified)
for (const id of shapeIds) {
  const pageBounds = editor.getShapePageBounds(id)

  // Inlined AABB check for performance
  if (
    pageBounds !== undefined &&
    pageBounds.maxX >= viewMinX &&
    pageBounds.minX <= viewMaxX &&
    pageBounds.maxY >= viewMinY &&
    pageBounds.minY <= viewMaxY
  ) {
    continue // Shape is visible
  }
  // Shape is outside viewport...
}
```

We extract the viewport bounds before the loop and inline the collision check. At this scale, even the overhead of a function call matters.

## The approximation

Axis-aligned bounding boxes are a rough fit. A rotated rectangle's AABB can be up to 41% larger than the shape itself (a square at 45°). This means hit testing gets false positives—the bounding box says "maybe" when the actual shape says "no."

We handle this with two phases: fast AABB rejection first, then precise geometry checks for whatever passes. The rough first pass eliminates most candidates cheaply. The shapes that survive get the expensive point-in-polygon math.

Viewport culling is similarly conservative. Shapes start rendering slightly before they're actually visible. That's fine—we'd rather draw a few extra shapes than skip one that should appear.
