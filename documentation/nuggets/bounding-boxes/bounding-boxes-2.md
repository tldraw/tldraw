Canvas operations require constantly computing where shapes are. On clicks, tldraw works out what you hit. When you pan, tldraw decides what to render. After grouping shapes, tldraw computes the rectangle that surrounds them all.

We use bounding boxes for this. A bounding box is the smallest axis-aligned rectangle that contains a shape. "Axis-aligned" means the edges are perfectly horizontal and vertical relative to the canvas, regardless of how the shape itself is oriented.

This alignment is what makes them fast. Checking if two axis-aligned boxes overlap is just four comparisons: are the edges separated along the x-axis? Along the y-axis? No separating gap means collision. We use this for hit testing, viewport culling, snapping, and more.

But what happens when a shape gets rotated?

## Rotation problem

Say you have a 100×50 rectangle at the origin. Its bounding box is straightforward: `{x: 0, y: 0, w: 100, h: 50}`.

Now rotate it 45°. What's the new bounding box?

A first attempt might be to apply the rotation matrix to the box. But this would no longer be axis-aligned, which means that we cannot make fast calculations.

Instead, we need to create a new axis-aligned box that contains the rotated shape. The rotated 100×50px rectangle fits inside a larger square: roughly 106×106px.

[img]

## Transform vertices and recompute bounds

tldraw handles this by never transforming bounding boxes directly. Instead, we:

1. Get the shape's bounding box vertices (the four corners)
2. Transform those vertices to page space
3. Compute a new axis-aligned box from the transformed points

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

The `Box.FromPoints` function finds the minimum and maximum x and y values across all points, giving us the tightest axis-aligned box:

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

## Nested transforms

Shapes in tldraw can be nested inside frames, which can themselves be rotated and positioned anywhere. A shape's page transform is the composition of all ancestor transforms:

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

By transforming vertices through this composed matrix, we correctly handle arbitrarily nested, rotated, scaled shapes. The final `Box.FromPoints` call always produces a valid axis-aligned box, regardless of how complex the transform chain is.

## The AABB collision payoff

Once you have axis-aligned boxes, collision detection is trivial - four comparisons:

```tsx
// packages/editor/src/lib/primitives/Box.ts:421-423
static Collides(A: Box, B: Box) {
  return !(A.maxX < B.minX || A.minX > B.maxX || A.maxY < B.minY || A.minY > B.maxY)
}
```

This is the separating axis theorem reduced to its simplest form. If there's any gap between the boxes along either axis, they don't collide. The negated logic with early exit makes this very fast - most non-colliding boxes fail on the first or second comparison.

Viewport culling uses this same check to decide which shapes to render:

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

The bounds are inlined here (extracted from the viewport box before the loop) because this runs on every camera change for every shape. Even the overhead of a function call matters.

## The tradeoff

Axis-aligned bounding boxes are a rough approximation. A rotated rectangle's AABB can be substantially larger than the shape itself - up to 41% larger area for a square rotated 45°. This means:

- Hit testing has more false positives (the AABB says "might hit" but the actual shape doesn't)
- Viewport culling is conservative (shapes render slightly before they're truly visible)

tldraw handles this with a two-phase approach: fast AABB rejection first, then precise geometry checks for shapes that pass. The rough first pass eliminates most candidates cheaply.
