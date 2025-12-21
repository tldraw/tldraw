---
title: Hit Testing - Raw Notes and Implementation Details
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - hit
  - testing
---

# Hit Testing - Raw Notes and Implementation Details

## Core Implementation Files

### Main Entry Point
- **File**: `/packages/editor/src/lib/editor/Editor.ts:5198`
- **Method**: `getShapeAtPoint(point: VecLike, opts: TLGetShapeAtPointOptions = {}): TLShape | undefined`

### Geometry System
- **Base class**: `/packages/editor/src/lib/primitives/geometry/Geometry2d.ts`
- **Polygon implementation**: `/packages/editor/src/lib/primitives/geometry/Polygon2d.ts`
- **Polyline implementation**: `/packages/editor/src/lib/primitives/geometry/Polyline2d.ts`
- **Group implementation**: `/packages/editor/src/lib/primitives/geometry/Group2d.ts`
- **Optimized shapes**: `Rectangle2d.ts`, `Circle2d.ts`, `Stadium2d.ts`

### Utility Functions
- **Point in polygon**: `/packages/editor/src/lib/primitives/utils.ts:319`
- **Cross product**: `/packages/editor/src/lib/primitives/utils.ts:306`
- **Box containment**: `/packages/editor/src/lib/primitives/Box.ts:433`

## Configuration Constants

### Hit Test Margin
**Location**: `/packages/editor/src/lib/options.ts:135`

```typescript
hitTestMargin: 8  // default value in pixels
```

This is the base margin for hit testing at 100% zoom. It provides forgiveness when clicking near shapes.

### Usage in Code
**Location**: `/packages/editor/src/lib/editor/Editor.ts:5374`

```typescript
if (distance < this.options.hitTestMargin / zoomLevel) {
    return shape
}
```

The margin is divided by zoom level - at 400% zoom, the effective margin is 2 pixels.

## Algorithm Step-by-Step

### 1. getShapeAtPoint Options (Line 5201-5208)

```typescript
const {
    filter,                  // Custom filter function
    margin = 0,             // Hit test margin (can be [inner, outer])
    hitLocked = false,      // Whether to hit locked shapes
    hitLabels = false,      // Whether to hit label geometries
    hitInside = false,      // Whether to consider points inside hollow shapes
    hitFrameInside = false, // Whether to hit inside frame bodies
} = opts
```

### 2. Margin Handling (Line 5210)

```typescript
const [innerMargin, outerMargin] = Array.isArray(margin) ? margin : [margin, margin]
```

Margins can be asymmetric: `[innerMargin, outerMargin]` allows different behavior inside vs outside boundaries.

### 3. Tracking Variables (Lines 5212-5216)

```typescript
let inHollowSmallestArea = Infinity
let inHollowSmallestAreaHit: TLShape | null = null

let inMarginClosestToEdgeDistance = Infinity
let inMarginClosestToEdgeHit: TLShape | null = null
```

- `inHollowSmallestArea`: Tracks the smallest area among hollow shapes that contain the point
- `inMarginClosestToEdgeHit`: Tracks the shape whose edge is closest to the point within margin
- These are fallback values used when no filled shape is hit directly

### 4. Shape Filtering (Lines 5218-5233)

```typescript
const shapesToCheck = (
    opts.renderingOnly
        ? this.getCurrentPageRenderingShapesSorted()
        : this.getCurrentPageShapesSorted()
).filter((shape) => {
    if (
        (shape.isLocked && !hitLocked) ||
        this.isShapeHidden(shape) ||
        this.isShapeOfType(shape, 'group')
    )
        return false
    const pageMask = this.getShapeMask(shape)
    if (pageMask && !pointInPolygon(point, pageMask)) return false
    if (filter && !filter(shape)) return false
    return true
})
```

**Exclusions**:
- Locked shapes (unless `hitLocked = true`)
- Hidden shapes
- Group shapes (groups are never directly selectable)
- Shapes whose clip mask doesn't contain the point
- Shapes that fail custom filter

### 5. Z-Order Iteration (Line 5235)

```typescript
for (let i = shapesToCheck.length - 1; i >= 0; i--) {
    const shape = shapesToCheck[i]
```

Iterates in **reverse order** (topmost first). The array is already sorted by z-index with parent-child hierarchy respected.

### 6. Coordinate Transformation (Line 5240)

```typescript
const pointInShapeSpace = this.getPointInShapeSpace(shape, point)
```

**Implementation** (Line 5465-5467):
```typescript
getPointInShapeSpace(shape: TLShape | TLShapeId, point: VecLike): Vec {
    const id = typeof shape === 'string' ? shape : shape.id
    return this._getShapePageTransformCache().get(id)!.clone().invert().applyToPoint(point)
}
```

Converts page-space point to shape's local coordinate space using cached inverse transform.

### 7. Label Hit Testing (Lines 5242-5255)

Special case for shapes with labels (frames, notes, arrows, hollow geo shapes with text):

```typescript
if (
    this.isShapeOfType(shape, 'frame') ||
    ((this.isShapeOfType(shape, 'note') ||
        this.isShapeOfType(shape, 'arrow') ||
        (this.isShapeOfType(shape, 'geo') && shape.props.fill === 'none')) &&
        this.getShapeUtil(shape).getText(shape)?.trim())
) {
    for (const childGeometry of (geometry as Group2d).children) {
        if (childGeometry.isLabel && childGeometry.isPointInBounds(pointInShapeSpace)) {
            return shape
        }
    }
}
```

Labels are checked first and return immediately if hit. Labels are child geometries in a `Group2d`.

### 8. Frame Handling (Lines 5257-5286)

Frames have special logic:
- Test with `hitFrameInside` forced to true (prevents clicks passing through)
- If distance is within margin, return the frame (or closest edge hit)
- If point is inside frame but no specific shape hit, behavior depends on `hitFrameInside` flag
- Once a frame is hit, search ends (prevents selecting shapes behind frames)

### 9. Broad Phase (Lines 5304-5318)

```typescript
if (outerMargin === 0 && (geometry.bounds.w < 1 || geometry.bounds.h < 1)) {
    // Skip broad phase for very thin shapes
    distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
} else {
    // Broad phase: cheap bounding box check
    if (geometry.bounds.containsPoint(pointInShapeSpace, outerMargin)) {
        // Narrow phase: actual distance
        distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
    } else {
        // Failed broad phase
        distance = Infinity
    }
}
```

**Bounding Box Check** (`Box.ContainsPoint` at line 433-438):
```typescript
static ContainsPoint(A: Box, B: VecLike, margin = 0) {
    return !(
        B.x < A.minX - margin ||
        B.y < A.minY - margin ||
        B.x > A.maxX + margin ||
        B.y > A.maxY + margin
    )
}
```

**Exception**: Shapes with width or height < 1 pixel skip broad phase (e.g., horizontal/vertical lines) because their bounding boxes are too small.

### 10. Closed Shape Logic (Lines 5321-5368)

For closed shapes (rectangles, circles, polygons):

```typescript
if (geometry.isClosed) {
    if (distance <= outerMargin || (hitInside && distance <= 0 && distance > -innerMargin)) {
        if (geometry.isFilled || (isGroup && geometry.children[0].isFilled)) {
            // Filled shape: immediate hit
            return inMarginClosestToEdgeHit || shape
        } else {
            // Hollow shape: track closest edge or smallest area
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
        }
    }
}
```

**Logic**:
- Filled shapes: Return immediately on hit (topmost wins)
- Hollow shapes: Track two candidates:
  - Shape with closest edge within margin
  - Shape with smallest area (fallback if no edge is close)
- Shapes larger than viewport are skipped (line 5335)

### 11. Open Shape Logic (Lines 5370-5377)

For open shapes (lines, draw strokes):

```typescript
else {
    // Always use the margin for open shapes
    if (distance < this.options.hitTestMargin / zoomLevel) {
        return shape
    }
}
```

Open shapes always use the configurable hit test margin, adjusted for zoom.

### 12. Final Fallback (Line 5385)

```typescript
return inMarginClosestToEdgeHit || inHollowSmallestAreaHit || undefined
```

Priority:
1. Shape with closest edge within margin
2. Hollow shape with smallest area
3. undefined (no hit)

## Distance Calculation

### Base Implementation (Geometry2d.ts:111-118)

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

**Algorithm**:
1. Find nearest point on edge via `nearestPoint()`
2. Calculate distance to that point
3. If point is inside a closed/filled shape, negate the distance
4. Result: negative = inside, positive = outside, 0 = on edge

### Point in Polygon (utils.ts:319-344)

Uses **winding number algorithm**:

```typescript
export function pointInPolygon(A: VecLike, points: VecLike[]): boolean {
    let windingNumber = 0
    let a: VecLike
    let b: VecLike

    for (let i = 0; i < points.length; i++) {
        a = points[i]
        // Point is the same as one of the corners
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
```

**Cross Product** (utils.ts:306-308):
```typescript
function cross(x: VecLike, y: VecLike, z: VecLike): number {
    return (y.x - x.x) * (z.y - x.y) - (z.x - x.x) * (y.y - x.y)
}
```

**Winding Number Logic**:
- For each edge, check if ray from point upward crosses edge
- If edge crosses upward and point is to its left: increment
- If edge crosses downward and point is to its right: decrement
- Non-zero winding number = inside polygon

**Why winding number over ray casting**: Handles self-intersecting polygons more robustly (e.g., draw shapes that cross themselves).

### Special Cases

#### Edge Detection
Point exactly on edge: `Vec.Dist(A, a) + Vec.Dist(A, b) === Vec.Dist(a, b)`

If the sum of distances from point to both endpoints equals the distance between endpoints, the point lies on the edge.

## Geometry Implementations

### Polyline2d (Open Paths)

**Location**: `/packages/editor/src/lib/primitives/geometry/Polyline2d.ts:47-62`

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
    if (!nearest) throw Error('nearest point not found')
    return nearest
}
```

Iterates through all edge segments, finds closest point on each, returns minimum.

### Edge2d (Line Segments)

**Location**: `/packages/editor/src/lib/primitives/geometry/Edge2d.ts:32-44`

```typescript
override nearestPoint(point: VecLike): Vec {
    const { _start: start, _end: end, _d: d, _u: u, _ul: l } = this
    if (d.len() === 0) return start
    if (l === 0) return start
    const k = Vec.Sub(point, start).dpr(u) / l
    const cx = start.x + u.x * k
    if (cx < Math.min(start.x, end.x)) return start.x < end.x ? start : end
    if (cx > Math.max(start.x, end.x)) return start.x > end.x ? start : end
    const cy = start.y + u.y * k
    if (cy < Math.min(start.y, end.y)) return start.y < end.y ? start : end
    if (cy > Math.max(start.y, end.y)) return start.y > end.y ? start : end
    return new Vec(cx, cy)
}
```

Projects point onto infinite line, then clamps to segment endpoints.

### Circle2d

**Location**: `/packages/editor/src/lib/primitives/geometry/Circle2d.ts:46-50`

```typescript
nearestPoint(point: VecLike): Vec {
    const { _center, _radius: radius } = this
    if (_center.equals(point)) return Vec.AddXY(_center, radius, 0)
    return Vec.Sub(point, _center).uni().mul(radius).add(_center)
}
```

**Algorithm**:
1. If point is at center, return arbitrary point on circle
2. Otherwise: normalize vector from center to point, scale to radius

### Group2d (Compound Geometries)

**Location**: `/packages/editor/src/lib/primitives/geometry/Group2d.ts:69-79`

```typescript
override distanceToPoint(point: VecLike, hitInside = false, filters?: Geometry2dFilters) {
    let smallestDistance = Infinity
    for (const child of this.children) {
        if (child.isExcludedByFilter(filters)) continue
        const distance = child.distanceToPoint(point, hitInside, filters)
        if (distance < smallestDistance) {
            smallestDistance = distance
        }
    }
    return smallestDistance
}
```

Returns minimum distance to any child geometry. Used for shapes with labels - the label is a separate child geometry.

### Stadium2d (Rounded Rectangles)

**Location**: `/packages/editor/src/lib/primitives/geometry/Stadium2d.ts:67-84`

Composed of 4 parts: 2 arcs + 2 edges. Finds nearest point on each part, returns minimum.

### Rectangle2d

Extends `Polygon2d` with 4 corner points. Uses parent class polygon logic but has optimized `getBounds()` implementation.

### Polygon2d

**Location**: `/packages/editor/src/lib/primitives/geometry/Polygon2d.ts`

Extends `Polyline2d` with `isClosed = true`. Inherits segment-based nearest point calculation.

## Caching System

### Geometry Cache

**Location**: `/packages/editor/src/lib/editor/Editor.ts:4704-4719`

```typescript
getShapeGeometry<T extends Geometry2d>(shape: TLShape | TLShapeId, opts?: TLGeometryOpts): T {
    const context = opts?.context ?? 'none'
    if (!this._shapeGeometryCaches[context]) {
        this._shapeGeometryCaches[context] = this.store.createComputedCache(
            'bounds',
            (shape) => {
                this.fonts.trackFontsForShape(shape)
                return this.getShapeUtil(shape).getGeometry(shape, opts)
            },
            { areRecordsEqual: areShapesContentEqual }
        )
    }
    return this._shapeGeometryCaches[context].get(
        typeof shape === 'string' ? shape : shape.id
    )! as T
}
```

**Multiple caches** based on context (e.g., 'arrow' context for arrow binding geometry vs. normal hit testing).

Geometry is computed once per shape and cached until shape content changes.

### Transform Cache

**Location**: `/packages/editor/src/lib/editor/Editor.ts:5465-5467`

```typescript
getPointInShapeSpace(shape: TLShape | TLShapeId, point: VecLike): Vec {
    const id = typeof shape === 'string' ? shape : shape.id
    return this._getShapePageTransformCache().get(id)!.clone().invert().applyToPoint(point)
}
```

Page transforms (position, rotation, scale) are cached per shape.

### Mask Cache

**Location**: `/packages/editor/src/lib/editor/Editor.ts:4901-4927`

```typescript
@computed private _getShapeMaskCache(): ComputedCache<Vec[], TLShape> {
    return this.store.createComputedCache('pageMaskCache', (shape) => {
        if (isPageId(shape.parentId)) return undefined

        const clipPaths: Vec[][] = []
        // Get all ancestors that can potentially clip this shape
        for (const ancestor of this.getShapeAncestors(shape.id)) {
            const util = this.getShapeUtil(ancestor)
            const clipPath = util.getClipPath?.(ancestor)
            if (!clipPath) continue
            if (util.shouldClipChild?.(shape) === false) continue
            const pageTransform = this.getShapePageTransform(ancestor.id)
            clipPaths.push(pageTransform.applyToPoints(clipPath))
        }
        if (clipPaths.length === 0) return undefined

        const pageMask = clipPaths.reduce((acc, b) => {
            const intersection = intersectPolygonPolygon(acc, b)
            if (intersection) {
                return intersection.map(Vec.Cast)
            }
            return []
        })

        return pageMask
    })
}
```

**Clip masks** for shapes inside frames:
- Computed by intersecting all ancestor frame boundaries
- Cached per shape
- Used to exclude shapes outside their containing frames

### Shape Sorting

**Location**: `/packages/editor/src/lib/editor/Editor.ts:5509-5518`

```typescript
@computed getCurrentPageShapesSorted(): TLShape[] {
    const result: TLShape[] = []
    const topLevelShapes = this.getSortedChildIdsForParent(this.getCurrentPageId())

    for (let i = 0, n = topLevelShapes.length; i < n; i++) {
        pushShapeWithDescendants(this, topLevelShapes[i], result)
    }

    return result
}
```

Returns all shapes sorted in z-index order with parent-child hierarchy. Children always appear after parents in the array.

## Performance Characteristics

### Complexity
- **Worst case**: O(n) where n = number of visible shapes
- **Average case**: Much better due to broad phase rejection

### Broad Phase Performance
- Bounding box check: 4 comparisons (minX, minY, maxX, maxY)
- Most shapes fail this check instantly when point is far away
- Only shapes close to the point proceed to expensive distance calculation

### Thin Shape Exception
Shapes with width or height < 1 pixel skip broad phase because:
- A horizontal line has ~0 height, so bounds check would reject valid hits
- Better to compute actual distance than miss the shape entirely

### Zoom Adjustment
Hit test margin divided by zoom level:
- 100% zoom: 8px margin
- 200% zoom: 4px margin
- 400% zoom: 2px margin
- Makes precision feel natural at different zoom levels

## Edge Cases

### Overlapping Hollow Shapes
When multiple hollow shapes contain the same point:
1. First check: Is point within margin of any edge? Return closest.
2. Fallback: Return hollow shape with smallest area (assumes user wants inner shape).

**Bug note** (Line 5359): Self-intersecting hollow shapes (e.g., figure-8 drawing) can confuse this logic.

### Viewport-Sized Shapes
**Location**: Line 5335

```typescript
// If the shape is bigger than the viewport, then skip it.
if (this.getShapePageBounds(shape)!.contains(viewportPageBounds)) continue
```

Hollow shapes larger than the viewport are skipped to prevent accidentally selecting huge background shapes.

### Very Thin Shapes
Lines with width/height < 1 pixel:
- Skip broad phase (bounding box too small)
- Always compute full distance
- Prevents missing thin lines that should be hittable

### Point on Polygon Edge
**Location**: utils.ts:332

```typescript
// Point is on the polygon edge
if (Vec.Dist(A, a) + Vec.Dist(A, b) === Vec.Dist(a, b)) return true
```

Explicitly checks if point lies on edge before winding number calculation.

### Point at Polygon Corner
**Location**: utils.ts:327

```typescript
// Point is the same as one of the corners of the polygon
if (a.x === A.x && a.y === A.y) return true
```

Exact corner match returns true immediately.

## Mathematical Foundations

### Signed Distance Function (SDF)
- **Inside**: distance < 0 (distance to nearest edge, negated)
- **Outside**: distance > 0 (distance to nearest edge)
- **On boundary**: distance = 0

### Hit Testing with Margin
- **Filled shape**: Hit if `distance <= margin`
- **Hollow shape**: Hit if `Math.abs(distance) <= margin` (near edge from either side)
- **Inside hollow with margin**: `distance <= 0 && distance > -innerMargin`

### Distance Calculation
For a point P and edge with endpoints A and B:
1. Project P onto infinite line through A-B
2. Clamp projection to segment [A, B]
3. Return distance from P to clamped point

### Winding Number
Mathematical property: For a closed curve and a point, count signed crossings of a ray from the point:
- Non-zero winding = inside
- Zero winding = outside
- Works for self-intersecting polygons unlike ray casting

## TransformedGeometry2d

**Location**: `/packages/editor/src/lib/primitives/geometry/Geometry2d.ts:431-565`

Wraps a geometry with a transformation matrix:

```typescript
override distanceToPoint(point: VecLike, hitInside = false, filters?: Geometry2dFilters) {
    return (
        this.geometry.distanceToPoint(Mat.applyToPoint(this.inverse, point), hitInside, filters) *
        this.decomposed.scaleX
    )
}
```

**Algorithm**:
1. Transform point to geometry's local space using inverse matrix
2. Compute distance in local space
3. Scale result by transform scale factor

Allows applying rotations, translations, and uniform scaling without recomputing geometry.

## Geometry Filters

**Location**: `/packages/editor/src/lib/primitives/geometry/Geometry2d.ts:25-44`

```typescript
export interface Geometry2dFilters {
    readonly includeLabels?: boolean
    readonly includeInternal?: boolean
}

export const Geometry2dFilters = {
    EXCLUDE_NON_STANDARD: { includeLabels: false, includeInternal: false },
    INCLUDE_ALL: { includeLabels: true, includeInternal: true },
    EXCLUDE_LABELS: { includeLabels: false, includeInternal: true },
    EXCLUDE_INTERNAL: { includeLabels: true, includeInternal: false },
}
```

Used to filter out label geometries or internal geometries when computing distances. Default for hit testing is `EXCLUDE_LABELS`.

## Area Calculation

**Location**: `/packages/editor/src/lib/primitives/geometry/Geometry2d.ts:362-374`

```typescript
getArea() {
    if (!this.isClosed) {
        return 0
    }
    const { vertices } = this
    let area = 0
    for (let i = 0, n = vertices.length; i < n; i++) {
        const curr = vertices[i]
        const next = vertices[(i + 1) % n]
        area += curr.x * next.y - next.x * curr.y
    }
    return area / 2
}
```

**Shoelace formula**: Sum of cross products of consecutive vertices divided by 2.
- Positive area = counter-clockwise winding
- Negative area = clockwise winding
- Used to compare sizes of overlapping hollow shapes

## Shape Types and Fill Status

Shapes have two key properties:
- `isClosed`: Whether the shape is a closed path (true for rectangles, circles; false for lines)
- `isFilled`: Whether the interior is filled (true for solid shapes; false for hollow)

**Combination behaviors**:
- `isClosed=true, isFilled=true`: Filled shape (immediate hit if inside)
- `isClosed=true, isFilled=false`: Hollow shape (must be near edge)
- `isClosed=false`: Open path (always use margin, never inside)

## Related Methods

### getShapesAtPoint
**Location**: `/packages/editor/src/lib/editor/Editor.ts:5404-5411`

Returns **all** shapes at a point (not just topmost):

```typescript
getShapesAtPoint(point: VecLike, opts = {}): TLShape[] {
    return this.getCurrentPageShapesSorted()
        .filter((shape) => !this.isShapeHidden(shape) && this.isPointInShape(shape, point, opts))
        .reverse()
}
```

### isPointInShape
Tests if a point hits a single shape, considering masks.

## Optimization Notes

1. **Early termination**: First filled shape hit returns immediately
2. **Z-index order**: Topmost shapes checked first
3. **Broad phase**: Cheap bounding box rejection before expensive distance calculation
4. **Cached values**: Geometry, transforms, and masks all cached
5. **Viewport culling**: Option to exclude off-screen shapes from hit testing
6. **Computed caches**: Reactive caching invalidates only when shape content changes

## Debug Geometry Colors

**Location**: `/packages/editor/src/lib/primitives/geometry/Geometry2d.ts:71`

```typescript
debugColor?: string
```

Geometries can have debug colors for visualization during development.

## Test Files for Reference

- `/packages/editor/src/lib/primitives/geometry/Stadium2d.test.ts`
- Shape-specific test files in shape utils directories

## Summary of Key Insights

1. **Signed distance is the foundation**: Single number encodes both containment and distance to edge
2. **Winding number over ray casting**: More robust for complex/self-intersecting shapes
3. **Margin adjusts with zoom**: Feels natural at all zoom levels
4. **Hollow shape fallback**: Smallest area heuristic handles overlapping hollow shapes
5. **Broad phase critical**: Bounding box check rejects most shapes instantly
6. **Cache everything**: Geometry, transforms, masks all cached for performance
7. **Z-order matters**: Reverse iteration ensures topmost shape wins
8. **Labels are special**: Checked first, separate child geometries
9. **Frames end search**: Once frame is hit, don't check shapes behind it
10. **Thin shapes need special handling**: Skip broad phase to avoid missing hits
