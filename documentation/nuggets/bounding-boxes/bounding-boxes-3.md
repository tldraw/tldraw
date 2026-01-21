---
title: Bounding boxes
created_at: 01/13/2026
updated_at: 01/13/2026
keywords:
  - bounding boxes
  - AABB
  - collision detection
  - viewport culling
  - transforms
readability: 8
voice: 7
potential: 8
accuracy: 9
notes: "Strong technical content with accurate code examples. Opening could use more first-person 'we' framing. '[comparison img]' placeholder and 'The tradeoff' header are minor issues."
---

Operations on tldraw's infinite canvas require constantly computing where shapes are. When you click a shape, tldraw should work out what you hit. When you pan across the canvas, tldraw decides what to render. After grouping shapes, it computes the rectangle that surrounds them all.

We use bounding boxes for this. A bounding box is the smallest axis-aligned box that contains a shape. "Axis-aligned" means the edges of the box are perfectly horizontal and vertical relative to the canvas, regardless of how the shape itself is oriented.

[img]

## Why axis-aligned?

The alignment constraint is what makes bounding boxes fast. Checking if two axis-aligned boxes overlap reduces to making just four min/max comparisons. This function returns true if and only if there is an overlap on one of the four edges of the boxes.

```tsx
// packages/editor/src/lib/primitives/Box.ts:421-423
static Collides(A: Box, B: Box) {
  return !(A.maxX < B.minX || A.minX > B.maxX || A.maxY < B.minY || A.minY > B.maxY)
}
```

We use this calculation everywhere: hit-testing, viewport culling, snapping, and more. However: what happens when a shape gets rotated?

## Rotating boxes

Say you have a 100×50px rectangle at the origin. Its bounding box would be:

```tsx
{x: 0, y: 0, w: 100, h: 50}
```

If you rotate the rectangle by 45°, what would the new bounding box be? A first step would be to apply the rotation matrix directly to the vertices of the bounding box:

```tsx
const corners = [
	{ x: 0, y: 0 }, // top-left
	{ x: 100, y: 0 }, // top-right
	{ x: 100, y: 50 }, // bottom-right
	{ x: 0, y: 50 }, // bottom-left
]

const rotated = corners.map((p) => {
	const cos = Math.cos(Math.PI / 4)
	const sin = Math.sin(Math.PI / 4)
	return {
		x: p.x * cos - p.y * sin,
		y: p.x * sin + p.y * cos,
	}
})

// Results: [{x: 0, y: 0}, {x: 70.7, y: 70.7}, {x: 35.4, y: 106.1}, {x: -35.4, y: 35.4}]
```

The rotated points describe the shape's new position, but the edges are no longer aligned with the axes of page space. If we tried to use these directly for collision detection, we'd need to check more axes and compute projections using dot products (according to the [separating axis theorem](https://dyn4j.org/2010/01/sat/)), which is more expensive than just comparing min/max values as above.

## A new bounding box

Instead, we take the shape's bounding box vertices in its own coordinate system, transform them to page space, and compute a new axis-aligned box from those points. The result gets cached.

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

The `Box.FromPoints` function finds the minimum and maximum x and y values across all points, giving us the tightest possible axis-aligned box:

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

Take our 100×50px rectangle example: we first calculate its original bounding box, then we apply the 45° rotation to each corner - and finally, we find the min and max (x, y) values among those rotated points. The result is a new bounding box that is roughly 106×106px. This is bigger than the original box since it is stretched to contain all four rotated corners.

[img]

## Nested transforms

Shapes in tldraw can be nested inside frames, which can themselves be rotated and positioned anywhere. If a rectangle sits inside a frame that is rotated by 30°, the rectangle's position on the page depends on both transforms. We multiply them together to get the shape's final page transform.

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

This recursive function handles arbitrary nesting: if a shape's parent isn't the page, we get the parent's page transform and compose it with the shape's local transform. No matter how deeply nested, rotated, or resized a shape is, we can always compute a valid axis-aligned box by transforming its vertices and finding the min/max values.

## Viewport culling

Aside from selection, tldraw also makes use of bounding boxes when doing viewport culling, which is where we programmatically decide which shapes to exclude from rendering:

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

Axis-aligned bounding boxes are a rough approximation. A rotated rectangle's bounding box can be substantially larger than the shape itself—up to 41% larger for a square at 45°. This means hit testing gets false positives: the AABB says "might hit" when the actual shape doesn't. tldraw handles this with a two-phase approach—fast AABB rejection first, then precise geometry checks for shapes that pass. The rough first pass eliminates most candidates cheaply.

It also means viewport culling is conservative. Shapes start rendering slightly before they're truly visible, but that's a fine tradeoff for the speed we gain.
