---
title: Bounding boxes
created_at: 01/13/2026
updated_at: 01/13/2026
keywords:
  - bounding
  - boxes
  - bounds
  - collision
  - aabb
  - viewport
  - culling
readability: 8
voice: 8
potential: 7
accuracy: 6
notes: "Clear structure and good rotation insight. Em dashes overused (11 instances). Selection bounds code example is fabricated—actual impl uses Box.Common, not iterative expand. Line numbers wrong in several places."
---

# Bounding boxes

In an infinite canvas, we constantly need to know where shapes are. When you click, we need to figure out what you hit. When you pan around, we need to decide what to draw. When you select multiple shapes, we need to compute the bounding box that surrounds them all.

Axis-aligned bounding boxes (AABBs) are the workhorse for all of this. They're fast to compute, fast to compare, and good enough for most spatial queries. But there's a catch: what happens when a shape is rotated?

## The rotation problem

Consider a rectangle that's been rotated 45 degrees. Its local bounding box (the box that contains the unrotated shape) is small and tight. But on the canvas, the rotated rectangle takes up more space—its corners poke out further.

The naive approach would be to rotate the bounding box itself. Take the four corners, apply the rotation, and you'd get... a rotated box. But that's not an AABB anymore. It's a rotated rectangle, which defeats the purpose—AABB collision detection is fast precisely because boxes align with the axes.

We solve this by transforming the shape's vertices, not its bounding box:

```typescript
// packages/editor/src/lib/editor/Editor.ts:4838-4846
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

We take the geometry's vertices in local space, transform them to page space using the shape's full transform (including rotation), then compute a new AABB from those transformed points. The result is the tightest axis-aligned box that contains the rotated shape.

## Fast collision detection

With AABBs, collision detection is just four comparisons:

```typescript
// packages/editor/src/lib/primitives/Box.ts:421-423
static Collides(A: Box, B: Box) {
  return !(A.maxX < B.minX || A.minX > B.maxX || A.maxY < B.minY || A.minY > B.maxY)
}
```

This uses the separating axis theorem in its simplest form. If two boxes don't overlap, one must be entirely to the left, right, above, or below the other. We check all four cases and negate the result—if any separation exists, the boxes don't collide.

The boolean short-circuits on the first true condition, making the average case even faster than four comparisons.

## Viewport culling

When you're looking at a canvas with thousands of shapes, most of them aren't visible. Drawing them anyway would kill performance. We use AABBs to quickly determine which shapes intersect the viewport:

```typescript
// packages/editor/src/lib/editor/derivations/notVisibleShapes.ts:17-37
const viewportPageBounds = editor.getViewportPageBounds()
const viewMinX = viewportPageBounds.minX
const viewMinY = viewportPageBounds.minY
const viewMaxX = viewportPageBounds.maxX
const viewMaxY = viewportPageBounds.maxY

for (const id of shapeIds) {
  const pageBounds = editor.getShapePageBounds(id)

  // Inlined AABB collision check
  if (
    pageBounds !== undefined &&
    pageBounds.maxX >= viewMinX &&
    pageBounds.minX <= viewMaxX &&
    pageBounds.maxY >= viewMinY &&
    pageBounds.minY <= viewMaxY
  ) {
    continue  // Shape is visible
  }

  // ... shape is culled
}
```

Notice the viewport bounds values are extracted once before the loop. We also inline the collision check rather than calling `Box.Collides`. In a hot loop running for every shape on the page, avoiding function call overhead matters.

## Labels that overflow

Shapes with text labels present an interesting problem. The label might extend beyond the shape's visual bounds—think of a small circle with a long title underneath it.

If the label affected the shape's bounding box, the shape would appear to grow as you typed longer text. Selection handles would jump around. It would feel wrong.

We handle this with a flag on geometry:

```typescript
// packages/tldraw/src/lib/shapes/geo/GeoShapeUtil.tsx
new Rectangle2d({
  ...labelBounds,
  isLabel: true,
  excludeFromShapeBounds: true,  // Labels don't affect shape bounds
})
```

The geometry system checks this flag when computing bounds vertices:

```typescript
// packages/editor/src/lib/primitives/geometry/Geometry2d.ts:319-322
getBoundsVertices(): Vec[] {
  if (this.excludeFromShapeBounds) return []
  return this.vertices
}
```

When a geometry returns no bounds vertices, it doesn't contribute to the shape's overall bounding box. The label still exists for hit testing and rendering, but the shape's bounds stay tied to its visual geometry.

## Multi-level caching

Computing bounds from vertices isn't expensive, but doing it repeatedly is wasteful. We cache at every level:

1. **Geometry caches vertices** — Each `Geometry2d` lazily computes and caches its vertices
2. **Geometry caches bounds** — The `bounds` getter caches the result of `Box.FromPoints`
3. **Editor caches page transforms** — Transform matrices are cached per shape
4. **Editor caches page bounds** — The final transformed bounds are cached

```typescript
// packages/editor/src/lib/primitives/geometry/Geometry2d.ts:338-346
private _bounds: Box | undefined

get bounds(): Box {
  if (!this._bounds) {
    this._bounds = this.getBounds()
  }
  return this._bounds
}
```

The reactive system invalidates caches when shapes change. If you move a shape, its page transform cache updates, which triggers its page bounds cache to recompute. But the local geometry bounds stay cached—the shape didn't change, just its position.

## Building bounds from points

The fundamental operation is constructing a box from an arbitrary set of points:

```typescript
// packages/editor/src/lib/primitives/Box.ts:390-406
static FromPoints(points: VecLike[]): Box {
  if (points.length === 0) return new Box()
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let point: VecLike
  for (let i = 0, n = points.length; i < n; i++) {
    point = points[i]
    minX = Math.min(point.x, minX)
    minY = Math.min(point.y, minY)
    maxX = Math.max(point.x, maxX)
    maxY = Math.max(point.y, maxY)
  }
  return new Box(minX, minY, maxX - minX, maxY - minY)
}
```

Initialize min values to positive infinity, max values to negative infinity, then iterate once. Each point can only expand the bounds. The algorithm is O(n) with minimal overhead—no allocations inside the loop.

## Selection bounds

When you select multiple shapes, we compute a bounding box that encompasses them all:

```typescript
// packages/editor/src/lib/editor/Editor.ts:5144-5164
@computed getSelectionPageBounds(): Box | null {
  const selectedShapeIds = this.getSelectedShapeIds()
  if (selectedShapeIds.length === 0) return null

  let bounds: Box | undefined

  for (const id of selectedShapeIds) {
    const shapeBounds = this.getShapeMaskedPageBounds(id)
    if (!shapeBounds) continue
    if (!bounds) {
      bounds = shapeBounds.clone()
    } else {
      bounds.expand(shapeBounds)
    }
  }

  return bounds ?? null
}
```

The `expand` method grows a box to include another:

```typescript
// packages/editor/src/lib/primitives/Box.ts:216-227
expand(A: Box) {
  const minX = Math.min(this.minX, A.minX)
  const minY = Math.min(this.minY, A.minY)
  const maxX = Math.max(this.maxX, A.maxX)
  const maxY = Math.max(this.maxY, A.maxY)

  this.x = minX
  this.y = minY
  this.w = maxX - minX
  this.h = maxY - minY

  return this
}
```

Same min/max logic as `FromPoints`, but operating on two boxes. This is how we build up a selection rectangle iteratively.

---

**Source files:**
- [Box.ts](/packages/editor/src/lib/primitives/Box.ts) — The core Box class
- [Geometry2d.ts](/packages/editor/src/lib/primitives/geometry/Geometry2d.ts) — Geometry base class with bounds caching
- [Editor.ts](/packages/editor/src/lib/editor/Editor.ts) — Editor methods for page bounds
- [notVisibleShapes.ts](/packages/editor/src/lib/editor/derivations/notVisibleShapes.ts) — Viewport culling
