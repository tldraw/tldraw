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

Canvas operations require constantly computing where shapes are. On clicking a shape, tldraw works out what you hit. When you pan, it decides what to render. After grouping shapes, it computes the rectangle that surrounds them all.

We use bounding boxes for this. A bounding box is the smallest axis-aligned rectangle that contains a shape. "Axis-aligned" means the edges are perfectly horizontal and vertical relative to the canvas, regardless of how the shape itself is oriented.

[img]

## Why axis-aligned?

The alignment constraint is what makes bounding boxes fast. Checking if two axis-aligned boxes overlap reduces to just four min/max comparisons:

```tsx
// packages/editor/src/lib/primitives/Box.ts:421-423
static Collides(A: Box, B: Box) {
  return !(A.maxX < B.minX || A.minX > B.maxX || A.maxY < B.minY || A.minY > B.maxY)
}
```

If there's a gap between two boxes on either axis, they aren't colliding. For axis-aligned boxes, we only need to check two axes - horizontal and vertical.

The code checks for gaps: is A completely to the left of B? To the right? Above? Below? If any of these is true, there's no collision. The `!` flips this - we return true (collision) only when none of those gaps exist.

Most boxes on a canvas aren't touching, so they fail on the first or second comparison and we exit early.

We use this calculation everywhere: hit testing, viewport culling, snapping, and more. But this speed comes with a constraint: the boxes must stay axis-aligned. So what happens when a shape gets rotated?

## Rotating boxes

Say you have a 100×50px rectangle at the origin. Its bounding box is simply:

```tsx
{x: 0, y: 0, w: 100, h: 50}
```

Now rotate it 45°. What would the new bounding box be?

A first attempt might be to apply the rotation matrix directly to the box corners. Let's see what happens:

```tsx
// The four corners of our 100×50 rectangle
const corners = [
	{ x: 0, y: 0 }, // top-left
	{ x: 100, y: 0 }, // top-right
	{ x: 100, y: 50 }, // bottom-right
	{ x: 0, y: 50 }, // bottom-left
]

// Apply 45° rotation matrix to each corner
const rotated = corners.map((p) => {
	const cos = Math.cos(Math.PI / 4) // cos(45°) ≈ 0.707
	const sin = Math.sin(Math.PI / 4) // sin(45°) ≈ 0.707
	return {
		x: p.x * cos - p.y * sin,
		y: p.x * sin + p.y * cos,
	}
})
// Results in: [{x: 0, y: 0}, {x: 70.7, y: 70.7}, {x: 35.4, y: 106.1}, {x: -35.4, y: 35.4}]
```

These rotated points describe the shape's new position perfectly, but the edges are no longer aligned with the axes of page space. If we tried to use these directly for collision detection, we'd need to check more axes (4 instead of 2) and compute projections using dot products, which is more expensive than just comparing precomputed min/max values as above.

More importantly, complex shapes like freehand drawings might have hundreds of edges to test. Axis-aligned bounding boxes reduce all of this to the same four comparisons regardless of shape complexity.

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

The rotated 100×50px rectangle fits inside a larger square: roughly 106×106px. We find the extreme points - the minimum and maximum x and y values among all the rotated corners:

```tsx
minX = -35.4, maxX = 70.7  → width = 106.1
minY = 0,     maxY = 106.1 → height = 106.1
```

This gives us an axis-aligned bounding box `{x: -35.4, y: 0, w: 106.1, h: 106.1}` that fully contains the rotated rectangle and keeps our fast comparison operations intact.

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

## Viewport culling

Viewport culling uses axis-aligned box collision to decide which shapes to render:

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
