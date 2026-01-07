---
title: Hit testing - what's under the pointer?
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - hit
  - testing
status: published
date: 12/21/2025
order: 4
---

# Hit testing: what's under the pointer?

Try the naive approach to hit testing: loop through all shapes, check if the point is inside each one, return the topmost hit. Now try clicking a hollow rectangle. The click passes through to the shape behind it—except when you click the edge. Try clicking between two nested hollow rectangles. Which one should select? Try a canvas with 10,000 shapes. Every pointer move grinds to a halt checking every single shape.

What we ended up building approaches this differently: instead of returning booleans, the geometry system returns distances.

## Distance, not boolean

Most hit testing returns true or false: is the point inside this shape? But tldraw's geometry system returns a signed distance—how far the point is from the nearest edge, with a sign indicating inside or outside:

```typescript
const geometry = editor.getShapeGeometry(shape)
const pointInShapeSpace = editor.getPointInShapeSpace(shape, point)
const distance = geometry.distanceToPoint(pointInShapeSpace)
```

The sign works like this:

- **Negative**: Point is inside the shape (distance to nearest edge, negated)
- **Positive**: Point is outside (distance to nearest edge)
- **Zero**: Point is exactly on the edge

This turns out to be useful in a few ways. A filled shape hits when `distance <= margin`. A hollow shape hits when `Math.abs(distance) <= margin`—the point must be near the edge, whether inside or outside. Same algorithm, different thresholds.

## How this helps with overlapping hollow shapes

Consider two unfilled rectangles, one inside the other:

```
┌─────────────────────┐
│                     │
│    ┌─────────┐      │
│    │         │      │
│    │    •    │      │
│    │         │      │
│    └─────────┘      │
│                     │
└─────────────────────┘
```

Clicking at the dot is "inside" both rectangles (negative distance for both). A boolean check can't distinguish them. But the distance tells you which edge is closer. When multiple hollow shapes overlap, tldraw tracks the one with the smallest area and returns that as a fallback—the assumption being you're more likely trying to select the inner shape than the outer one.

```typescript
// Track hollow shape with smallest area as fallback
if (hollowHit && geometry.area < smallestHollowArea) {
	smallestHollowArea = geometry.area
	smallestHollowHit = shape
}
```

This seems to match what users expect most of the time.

## Z-order and iteration

Hit testing starts with all shapes sorted by z-index, then iterates in reverse order (topmost first). The first shape that passes all checks wins:

```typescript
// packages/editor/src/lib/editor/Editor.ts
const sortedShapes = this.getCurrentPageShapesSorted()

for (let i = sortedShapes.length - 1; i >= 0; i--) {
	const shape = sortedShapes[i]
	// ... hit test logic
}
```

The sorting respects parent-child hierarchy—children always appear after their parents in the sorted array, so a shape inside a group is tested before the group itself.

## Broad phase rejection

Computing distance to a complex polygon is expensive. Before doing that work, tldraw checks if the point is even close to the shape's bounding box:

```typescript
// Broad phase: cheap bounding box check
const bounds = geometry.bounds
if (!bounds.containsPoint(pointInShapeSpace, margin)) {
	continue // Not even close, skip expensive calculation
}

// Narrow phase: actual distance computation
const distance = geometry.distanceToPoint(pointInShapeSpace)
```

For a canvas with 10,000 shapes, most fail the broad phase instantly. Only shapes whose bounding boxes contain the point proceed to expensive geometry calculations. In practice, this is what keeps hit testing fast on large canvases—you're mostly just checking bounding boxes.

There's one wrinkle: very thin shapes (width or height less than 1 pixel) skip the broad phase entirely. A horizontal line has almost no bounding box height, so the broad phase would reject valid hits.

## Point-in-polygon: winding number

To compute signed distance, you first need to know if the point is inside or outside. For polygons, tldraw uses the winding number algorithm:

```typescript
// packages/editor/src/lib/primitives/utils.ts
export function pointInPolygon(A: VecLike, points: VecLike[]): boolean {
	let windingNumber = 0

	for (let i = 0; i < points.length; i++) {
		const a = points[i]
		const b = points[(i + 1) % points.length]

		if (a.y <= A.y) {
			if (b.y > A.y && cross(a, b, A) > 0) {
				windingNumber += 1
			}
		} else if (b.y <= A.y && cross(a, b, A) < 0) {
			windingNumber -= 1
		}
	}

	return windingNumber !== 0
}
```

This counts how many times the polygon winds around the test point by tracking signed edge crossings—incrementing for upward-crossing edges where the point is to the left, decrementing for downward-crossing edges where the point is to the right. A non-zero winding number means the point is inside.

We went with winding number over ray casting because it tends to handle self-intersecting polygons better. For complex draw shapes that cross over themselves, ray casting can give inconsistent results depending on which direction you cast the ray. The winding number stays consistent regardless of polygon complexity.

## Geometry implementations

Different shape types implement distance calculation differently. The `Geometry2d` base class defines the interface:

```typescript
distanceToPoint(point: VecLike, hitInside = false, filters?: Geometry2dFilters) {
	return (
		Vec.Dist(point, this.nearestPoint(point, filters)) *
		(this.isClosed && (this.isFilled || hitInside) && pointInPolygon(point, this.vertices)
			? -1
			: 1)
	)
}
```

The basic idea: compute the distance to the nearest point on the edge, then flip the sign to negative if the point is inside a closed, filled shape.

Subclasses provide their own implementations:

- **Polyline2d** (open paths like draw strokes): Find the nearest point on any segment, return distance to that point
- **Polygon2d** (closed shapes): Same as polyline, but check if point is inside and return negative distance for filled shapes
- **Group2d** (compound shapes): Container for multiple child geometries. Distance is the minimum distance to any child. This handles shapes with labels—the label is a child geometry that can be hit independently
- **Rectangle2d**, **Circle2d**, **Stadium2d**: Optimized implementations for common shapes that avoid general polygon math

## Hit test margin and zoom

Clicking exactly on a 1-pixel line is nearly impossible, especially on touch devices. The hit test margin provides some forgiveness:

```typescript
const hitTestMargin = editor.options.hitTestMargin // default: 8
const adjustedMargin = hitTestMargin / zoomLevel
```

The margin shrinks as you zoom in. At 100% zoom, you have 8 pixels of forgiveness. At 400% zoom, you have 2 pixels. We found this feels natural—when zoomed in, you have more precision, so less forgiveness is needed.

The margin can also be asymmetric. The `margin` option accepts `[innerMargin, outerMargin]` for shapes where you want different behavior inside vs outside the boundary.

## Frame clipping

Shapes inside frames should only be clickable within the frame's bounds. This is handled through clip masks—polygons that define the visible region:

```typescript
const pageMask = editor.getShapeMask(shape.id)
if (pageMask && !pointInPolygon(point, pageMask)) {
	continue // Point outside mask, skip this shape
}
```

For nested frames, clip masks are intersected. A shape three frames deep has a mask that's the intersection of all three frame boundaries. The mask is computed once and cached, so hit testing doesn't pay the cost of recalculating it on every pointer move.

## Caching and performance

Several caching layers help keep hit testing fast:

- **Geometry cache**: Shape geometry is computed once and cached until the shape changes
- **Transform cache**: Page transforms are cached per shape
- **Mask cache**: Clip path intersections are cached per shape
- **Culling**: Shapes outside the viewport can optionally be excluded from hit testing

The algorithm is O(n) in the worst case—you might need to check every shape. But in practice the broad phase rejects most shapes quickly, and caching ensures repeat calculations are cheap. The result is that hit testing can run on every pointer move without frame drops, even with thousands of shapes.

## Tradeoffs

The distance-based approach trades memory for correctness and flexibility. Each geometry object caches its vertices, bounds, and area. For 10,000 shapes, that's real memory overhead. But the alternative—recalculating geometry on every pointer move—would be too slow.

The approach also requires more complex geometry implementations. Simple boolean containment is easier to understand and implement. But having signed distances turns out to handle filled shapes, hollow shapes, touch margins, and overlapping hollow shapes with the same basic algorithm. What looks like added complexity actually reduces the number of special cases we need.

One thing we noticed: when you need to distinguish "inside" from "near the edge," a signed distance gives you everything a boolean can and more. The cost is the geometry calculation, but cache that once and you get reasonably fast hit testing that handles most edge cases without too much fuss.
