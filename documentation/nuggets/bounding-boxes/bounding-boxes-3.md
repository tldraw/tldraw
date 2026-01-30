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
  - selection box
readability: 8
voice: 7
potential: 8
accuracy: 9
notes: "Strong technical content with accurate code examples. Opening could use more first-person 'we' framing. '[comparison img]' placeholder and 'The tradeoff' header are minor issues."
---

On an infinite canvas, every interaction raises a spatial question. What did you click? Which shapes are currently visible? What area surrounds a group of selected shapes?

In tldraw, as in any graphical interface that responds to fast spatial queries, we answer these questions with _bounding boxes_. A bounding box is the smallest axis-aligned rectangle that can contain a shape.

[img]

## Why axis-aligned?

"Axis-aligned" means the edges stay horizontal and vertical relative to the canvas, even when the shape is rotated. This constraint makes bounding boxes fast. When checking if two boxes overlap, we don't need to make expensive calculations - instead, just four simple comparisons between the edges of the two boxes:

```tsx
// packages/editor/src/lib/primitives/Box.ts:421-423
static Collides(A: Box, B: Box) {
  return !(A.maxX < B.minX || A.minX > B.maxX || A.maxY < B.minY || A.minY > B.maxY)
}
```

## Rotating boxes

What if a shape gets rotated?

Say you have a 100×50px rectangle at the origin. Its bounding box would be:

```tsx
{x: 0, y: 0, w: 100, h: 50}
```

If you rotate the rectangle by 45°, what would the new bounding box be?

A first step would be to apply the rotation matrix directly to the vertices of the original box:

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

The rotated points describe the shape's new position, but the edges are no longer aligned with the axes of the canvas. If we tried to use these directly for collision detection, we'd need to compute projections using dot products (according to the [separating axis theorem](https://dyn4j.org/2010/01/sat/)), which is more expensive than just comparing min/max values.

## A new bounding box

Instead, we take the shape's bounding box vertices in its own coordinate system, transform them to page space, and compute a new axis-aligned box from those points.

```tsx
// packages/editor/src/lib/editor/Editor.ts:4838-4847 (simplified)
getShapePageBounds(shape: TLShape): Box | undefined {
  const pageTransform = this.getShapePageTransform(shape)
  if (!pageTransform) return undefined

  return Box.FromPoints(
    pageTransform.applyToPoints(this.getShapeGeometry(shape).boundsVertices)
  )
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
  // Results: {x: -35.4, y: 0, w: 106.1, h: 106.1}
}
```

Take our 100×50px rectangle above as an example: we calculated its original bounding box, then we applied the 45° rotation to each corner.

After this, we find the min and max (x, y) values among those rotated points. The result is a new bounding box that is roughly 106×106px. This is bigger than the original box since it's stretched to contain all four rotated corners.

[gif of geometry debug]

## Nested transforms

Shapes in tldraw can be nested inside frames, which can themselves be rotated and positioned anywhere. If a rectangle sits inside a frame that is rotated by 30°, the rectangle's position on the page depends on both transforms. We multiply them together to get the shape's final page transform.

```tsx
// packages/editor/src/lib/editor/Editor.ts:4784-4798 (simplified)
getShapePageTransform(shape: TLShape): Mat {
  if (isPageId(shape.parentId)) {
    return this.getShapeLocalTransform(shape)
  }

  const parentTransform = this.getShapePageTransform(shape.parentId)
  return Mat.Compose(parentTransform, this.getShapeLocalTransform(shape))
}
```

If a shape sits directly on the page, its page transform is just its local transform. Otherwise, we get the parent's page transform and compose it with the shape's local transform. This recurses up the tree, handling arbitrary nesting.

## Viewport culling

Bounding boxes are also used in viewport culling, where we skip rendering any shape whose bounds don't intersect the bounds of the viewport itself:

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

## Selection boxes

When you rotate a shape in tldraw, you'll notice that the selection handles rotate with it. This might seem confusing given everything we covered above—shouldn't the selection bounds be aligned with the canvas?

In fact, tldraw uses two different kinds of bounds. For hit testing and viewport culling calculations, we only use axis-aligned bounding boxes. But for the selection UI, we also compute a _rotated_ selection box that matches the shape's orientation.

This is because if you select two shapes and rotate them by the same angle, then you should be able to resize them along their rotated axes. An axis-aligned selection box would only let you resize horizontally and vertically relative to the page, which would distort the shapes. The rotated selection box lets you drag a corner handle and scale the shapes along their actual orientation.

Though if the selected shapes are rotated by different amounts, there's no single angle that makes sense for the selection box, so we fall back to using an axis-aligned box.

[gif comparison]

To compute this, we un-rotate all corner points by the negative selection rotation, find an axis-aligned bounding box in that "un-rotated" space, then rotate the box position back to get the final result

```tsx
// packages/editor/src/lib/editor/Editor.ts:2140-2180 (simplified)
getShapesRotatedPageBounds(shapeIds: TLShapeId[]): Box | undefined {
  const selectionRotation = this.getShapesSharedRotation(shapeIds)

  // If shapes have different rotations, fall back to axis-aligned bounds
  if (selectionRotation === 0) {
    return this.getShapesPageBounds(shapeIds) ?? undefined
  }

  // Collect all corners, un-rotate them, find the bounding box, then re-rotate
  const boxFromRotatedVertices = Box.FromPoints(
    shapeIds
      .flatMap((id) => {
        const pageTransform = this.getShapePageTransform(id)
        if (!pageTransform) return []
        return pageTransform.applyToPoints(this.getShapeGeometry(id).bounds.corners)
      })
      .map((p) => p.rot(-selectionRotation))  // Un-rotate all corners
  )

  boxFromRotatedVertices.point = boxFromRotatedVertices.point.rot(selectionRotation)
  return boxFromRotatedVertices
}
```

## Tradeoffs

Axis-aligned boxes are approximations. A rotated rectangle's AABB is always larger than the shape itself, which means we sometimes check shapes that weren't actually clicked or render shapes that aren't quite visible. But the speed we gain from simple min/max comparisons far outweighs the cost of those extra checks.
