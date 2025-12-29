---
title: Hit testing
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - hit testing
  - geometry
  - selection
status: published
date: 12/21/2025
order: 0
---

# Hit testing

When you click on the canvas, tldraw needs to figure out which shape—if any—is under your pointer. This is hit testing. For filled shapes, the problem sounds straightforward: is the point inside the shape? But tldraw also has hollow shapes (rectangles with no fill, open paths like lines), margins (you can click near a shape, not just on it), and overlapping shapes (which one wins?).

The solution we use centers on a single abstraction: signed distance. Every shape can answer the question "how far is this point from my boundary?" The sign of that distance tells you everything. Negative means inside. Positive means outside. Zero means exactly on the edge.

## Signed distance as the foundation

Here's the core method on `Geometry2d`:

```typescript
distanceToPoint(point: VecLike, hitInside = false): number {
    return (
        Vec.Dist(point, this.nearestPoint(point)) *
        (this.isClosed && (this.isFilled || hitInside) && pointInPolygon(point, this.vertices)
            ? -1
            : 1)
    )
}
```

The algorithm:

1. Find the nearest point on the shape's edge
2. Calculate the distance to that point
3. If the point is inside a closed/filled shape, negate the distance

This single number encodes both containment and proximity. A filled rectangle might return `-15` (15 pixels inside), `0` (on the edge), or `8` (8 pixels outside). A hollow rectangle returns positive distances for both inside and outside, but we can still distinguish them—more on that in a moment.

The hit testing logic becomes simple:

- Filled shapes: hit if `distance <= margin`
- Hollow shapes: hit if `Math.abs(distance) <= margin` (near the edge from either side)
- Open shapes (lines): hit if `distance < margin`

## Point in polygon with winding number

To determine if a point is inside a closed shape, we use the winding number algorithm:

```typescript
export function pointInPolygon(A: VecLike, points: VecLike[]): boolean {
	let windingNumber = 0
	let a: VecLike
	let b: VecLike

	for (let i = 0; i < points.length; i++) {
		a = points[i]
		if (a.x === A.x && a.y === A.y) return true

		b = points[(i + 1) % points.length]

		// Point is on the polygon edge
		if (Vec.Dist(A, a) + Vec.Dist(A, b) === Vec.Dist(a, b)) return true

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

function cross(x: VecLike, y: VecLike, z: VecLike): number {
	return (y.x - x.x) * (z.y - x.y) - (z.x - x.x) * (y.y - x.y)
}
```

The winding number counts how many times the polygon winds around the point. For each edge:

- If the edge crosses upward and the point is to its left: increment
- If the edge crosses downward and the point is to its right: decrement

A non-zero winding number means the point is inside.

We use winding number instead of ray casting because it handles self-intersecting polygons correctly. When you draw a figure-8 freehand shape in tldraw, the algorithm still works. Ray casting can give incorrect results for self-intersecting paths because it doesn't distinguish between different winding directions.

## Edge detection shortcut

Before computing the winding number, we check if the point lies exactly on an edge:

```typescript
// Point is on the polygon edge
if (Vec.Dist(A, a) + Vec.Dist(A, b) === Vec.Dist(a, b)) return true
```

If the sum of distances from the point to both endpoints equals the distance between the endpoints, the point lies on the line segment. This catches edge cases (literally) that might otherwise depend on floating point precision in the winding calculation.

## Finding the nearest point

Each geometry type implements `nearestPoint` based on its shape:

**Line segments** project the point onto the infinite line, then clamp to the segment:

```typescript
override nearestPoint(point: VecLike): Vec {
    const { _start: start, _end: end, _u: u, _ul: l } = this
    if (l === 0) return start
    const k = Vec.Sub(point, start).dpr(u) / l
    const cx = start.x + u.x * k
    const cy = start.y + u.y * k
    // Clamp to segment bounds
    if (cx < Math.min(start.x, end.x)) return start.x < end.x ? start : end
    if (cx > Math.max(start.x, end.x)) return start.x > end.x ? start : end
    if (cy < Math.min(start.y, end.y)) return start.y < end.y ? start : end
    if (cy > Math.max(start.y, end.y)) return start.y > end.y ? start : end
    return new Vec(cx, cy)
}
```

**Circles** normalize the vector from center to point, then scale it to the radius:

```typescript
override nearestPoint(point: VecLike): Vec {
    const { _center, _radius: radius } = this
    if (_center.equals(point)) return Vec.AddXY(_center, radius, 0)
    return Vec.Sub(point, _center).uni().mul(radius).add(_center)
}
```

**Polylines and polygons** check each segment and return the minimum:

```typescript
nearestPoint(A: VecLike): Vec {
    const { segments } = this
    let nearest = this._points[0]
    let dist = Infinity
    let p: Vec
    let d: number
    for (let i = 0; i < segments.length; i++) {
        p = segments[i].nearestPoint(A)
        d = Vec.Dist2(p, A)
        if (d < dist) {
            nearest = p
            dist = d
        }
    }
    return nearest
}
```

The pattern is consistent: every shape knows how to find its closest point. The signed distance abstraction builds on that.

## Hit testing with multiple shapes

The full hit testing algorithm in `Editor#getShapeAtPoint` iterates through shapes in reverse z-order (topmost first):

1. **Broad phase**: Check if the point is within the shape's bounding box plus margin. This rejects most shapes immediately with four comparisons.
2. **Narrow phase**: Compute the actual signed distance.
3. **Filled shapes**: Return immediately if hit (topmost wins).
4. **Hollow shapes**: Track the shape with the closest edge. If no edge is close, track the hollow shape with the smallest area (the assumption is you meant to click the inner shape when there are nested hollow shapes).
5. **Open shapes**: Check distance against the configurable hit test margin (8 pixels at 100% zoom, adjusted for zoom level).

A subtlety: when hit testing thin shapes (width or height < 1 pixel), we skip the broad phase. A horizontal line has near-zero height, so its bounding box would reject valid hits. Better to compute the actual distance than miss the shape.

## Zoom-adjusted margins

The hit test margin scales with zoom:

```typescript
if (distance < this.options.hitTestMargin / zoomLevel) {
	return shape
}
```

At 100% zoom, the margin is 8 pixels. At 200% zoom, it's 4 pixels. At 400%, 2 pixels. This makes precision feel consistent—you don't suddenly need pixel-perfect accuracy just because you zoomed in.

## Hollow shape overlap

When multiple hollow shapes contain the same point, we prioritize by proximity to the edge first, then by area:

```typescript
if (Math.abs(distance) < inMarginClosestToEdgeDistance) {
	inMarginClosestToEdgeDistance = Math.abs(distance)
	inMarginClosestToEdgeHit = shape
} else if (!inMarginClosestToEdgeHit) {
	const { area } = geometry
	if (area < inHollowSmallestArea) {
		inHollowSmallestArea = area
		inHollowSmallestAreaHit = shape
	}
}
```

If you have two nested hollow rectangles and click inside both, the algorithm first checks if either edge is within the margin. If not, it assumes you meant the inner (smaller) shape.

This heuristic isn't perfect—self-intersecting hollow shapes like a figure-8 drawing can confuse it—but it handles the common case of nested frames or grouped hollow shapes.

## Caching

Geometry objects are computed once per shape and cached until the shape changes:

```typescript
getShapeGeometry<T extends Geometry2d>(shape: TLShape | TLShapeId): T {
    if (!this._shapeGeometryCache) {
        this._shapeGeometryCache = this.store.createComputedCache(
            'bounds',
            (shape) => this.getShapeUtil(shape).getGeometry(shape),
            { areRecordsEqual: areShapesContentEqual }
        )
    }
    return this._shapeGeometryCache.get(shape)
}
```

Page transforms (position, rotation, scale) are cached separately. When converting the click point to the shape's local coordinate system, we use the cached inverse transform:

```typescript
getPointInShapeSpace(shape: TLShape, point: VecLike): Vec {
    return this._getShapePageTransformCache()
        .get(shape.id)
        .clone()
        .invert()
        .applyToPoint(point)
}
```

For shapes inside frames, we compute and cache clip masks—the intersection of all ancestor frame boundaries. Points outside the mask are rejected before distance calculation.

## Performance

The worst case is O(n) where n is the number of visible shapes. In practice, the broad phase bounding box check rejects most shapes instantly. Only shapes near the pointer proceed to the distance calculation.

Shapes are checked in reverse z-order. The first filled shape that's hit returns immediately. This means common clicks (on filled shapes) are very fast—we rarely need to check the full list.

---

**Related files:**

- `/packages/editor/src/lib/editor/Editor.ts` (line 5198: `getShapeAtPoint`)
- `/packages/editor/src/lib/primitives/geometry/Geometry2d.ts` (line 111: `distanceToPoint`)
- `/packages/editor/src/lib/primitives/utils.ts` (line 319: `pointInPolygon`)
- `/packages/editor/src/lib/primitives/geometry/Polygon2d.ts`
- `/packages/editor/src/lib/primitives/geometry/Polyline2d.ts`
