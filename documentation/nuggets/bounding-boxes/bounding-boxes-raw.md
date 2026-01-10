---
title: Bounding Boxes - Raw Notes and Implementation Details
created_at: 01/10/2026
updated_at: 01/10/2026
keywords:
  - bounding
  - boxes
  - bounds
  - collision
  - aabb
  - viewport
  - culling
status: draft
date: 01/10/2026
order: 1
---

# Bounding Boxes - Raw Notes and Implementation Details

## Core Implementation Files

### Main Box Class

- **File**: `/packages/editor/src/lib/primitives/Box.ts:26-621`
- **Structure**: Simple 4-property model: `x`, `y`, `w` (width), `h` (height)

### Geometry System

- **Base class**: `/packages/editor/src/lib/primitives/geometry/Geometry2d.ts`
- **Group implementation**: `/packages/editor/src/lib/primitives/geometry/Group2d.ts`
- **Rectangle implementation**: `/packages/editor/src/lib/primitives/geometry/Rectangle2d.ts`

### Editor Methods

- **Shape geometry**: `/packages/editor/src/lib/editor/Editor.ts:4711`
- **Page bounds**: `/packages/editor/src/lib/editor/Editor.ts:4838`
- **Masked bounds**: `/packages/editor/src/lib/editor/Editor.ts:4969`

### Viewport Culling

- **Not visible shapes**: `/packages/editor/src/lib/editor/derivations/notVisibleShapes.ts`

## Box Class Structure

### Properties and Accessors

**Location**: `/packages/editor/src/lib/primitives/Box.ts:26-100`

```typescript
export class Box {
  constructor(x = 0, y = 0, w = 0, h = 0) {
    this.x = x
    this.y = y
    this.w = w
    this.h = h
  }

  // Edge accessors
  get minX() { return this.x }
  get maxX() { return this.x + this.w }
  get minY() { return this.y }
  get maxY() { return this.y + this.h }

  // Aliases
  get left() { return this.x }
  get right() { return this.x + this.w }
  get top() { return this.y }
  get bottom() { return this.y + this.h }

  // Center points
  get midX() { return this.x + this.w / 2 }
  get midY() { return this.y + this.h / 2 }
  get center() { return new Vec(this.midX, this.midY) }

  // Dimensions
  get width() { return this.w }
  get height() { return this.h }
  get aspectRatio() { return this.w / this.h }

  // Corner points
  get corners(): Vec[] {
    return [
      new Vec(this.minX, this.minY),
      new Vec(this.maxX, this.minY),
      new Vec(this.maxX, this.maxY),
      new Vec(this.minX, this.maxY),
    ]
  }
}
```

The Box class uses a minimal representation (x, y, w, h) with computed properties for common access patterns. This keeps storage efficient while providing convenient accessors.

## AABB Collision Detection

### Core Collision Algorithm

**Location**: `/packages/editor/src/lib/primitives/Box.ts:421-423`

```typescript
static Collides(A: Box, B: Box) {
  return !(A.maxX < B.minX || A.minX > B.maxX || A.maxY < B.minY || A.minY > B.maxY)
}
```

**Algorithm explanation**:
- Uses AABB (Axis-Aligned Bounding Box) collision detection
- Tests for separation along each axis
- Returns false if ANY separation exists (early exit)
- Four comparisons total, short-circuits on first true

**Why this works**:
If two boxes don't overlap, one must be entirely to the left, right, above, or below the other. The algorithm checks all four cases and uses DeMorgan's law inversion for clean logic.

### Containment Check

**Location**: `/packages/editor/src/lib/primitives/Box.ts:425-427`

```typescript
static Contains(A: Box, B: Box) {
  return A.minX <= B.minX && A.minY <= B.minY && A.maxX >= B.maxX && A.maxY >= B.maxY
}
```

Strict containment: all edges of B must be within A's edges.

### Point Containment

**Location**: `/packages/editor/src/lib/primitives/Box.ts:433-449`

```typescript
static ContainsPoint(A: Box, B: VecLike, margin = 0) {
  return !(
    B.x < A.minX - margin ||
    B.y < A.minY - margin ||
    B.x > A.maxX + margin ||
    B.y > A.maxY + margin
  )
}

containsPoint(point: VecLike, margin = 0) {
  return Box.ContainsPoint(this, point, margin)
}
```

Supports optional margin for hit testing tolerance. The margin expands the box in all directions for the check.

## Bounds Expansion

### Expand to Include Another Box

**Location**: `/packages/editor/src/lib/primitives/Box.ts:216-227`

```typescript
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

Mutates the box to encompass both boxes. Used to compute selection bounds by iteratively expanding to include each selected shape.

### Expand by Margin

**Location**: `/packages/editor/src/lib/primitives/Box.ts:229-235`

```typescript
expandBy(n: number) {
  this.x -= n
  this.y -= n
  this.w += n * 2
  this.h += n * 2
  return this
}
```

Expands all edges by n pixels. Useful for adding padding or margins around shapes.

## Creating Bounds from Points

### FromPoints Factory

**Location**: `/packages/editor/src/lib/primitives/Box.ts:390-406`

```typescript
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

**Algorithm**:
1. Initialize min values to Infinity, max values to -Infinity
2. Iterate through all points once
3. Track min/max in both dimensions
4. Construct box from computed bounds

This is the fundamental operation for computing bounds from geometry vertices.

## Geometry2d Bounds System

### Bounds Caching

**Location**: `/packages/editor/src/lib/primitives/geometry/Geometry2d.ts:338-346`

```typescript
private _bounds: Box | undefined

get bounds(): Box {
  if (!this._bounds) {
    this._bounds = this.getBounds()
  }
  return this._bounds
}

getBounds(): Box {
  return Box.FromPoints(this.vertices)
}
```

**Caching pattern**:
- Private `_bounds` property stores cached value
- Lazy evaluation on first access via getter
- Subsequent accesses return cached value
- Vertices are also cached similarly (lines 308-317)

### Bounds Vertices

**Location**: `/packages/editor/src/lib/primitives/geometry/Geometry2d.ts:319-332`

```typescript
getBoundsVertices(): Vec[] {
  if (this.excludeFromShapeBounds) return []
  return this.vertices
}

private _boundsVertices: Vec[] | undefined

get boundsVertices(): Vec[] {
  if (!this._boundsVertices) {
    this._boundsVertices = this.getBoundsVertices()
  }
  return this._boundsVertices
}
```

**Key insight**: `boundsVertices` can differ from `vertices`. Shapes can selectively exclude certain geometries (like labels) from their overall bounds by returning empty array when `excludeFromShapeBounds` is true.

### Geometry Flags

```typescript
export interface Geometry2dOptions {
  isClosed?: boolean    // Is the shape a closed path?
  isFilled?: boolean    // Is the interior filled (vs hollow)?
  isLabel?: boolean     // Is this a label geometry?
  isInternal?: boolean  // Is this internal geometry?
  excludeFromShapeBounds?: boolean  // Exclude from shape bounds computation?
}
```

**Flag behaviors**:
- `isLabel`: Marks geometry as text label, receives special hit testing
- `excludeFromShapeBounds`: Label bounds don't affect shape's overall bounds
- `isInternal`: Internal geometry excluded from certain calculations
- `isClosed`: Determines if point-in-polygon testing applies
- `isFilled`: Determines if interior hits count

## Composite Geometry: Group2d

### Structure

**Location**: `/packages/editor/src/lib/primitives/geometry/Group2d.ts:10-35`

```typescript
export class Group2d extends Geometry2d {
  children: Geometry2d[]
  ignoredChildren: Geometry2d[]

  constructor(config: Omit<Geometry2dOptions, 'isClosed' | 'isFilled'> & { children: Geometry2d[] }) {
    super({ isClosed: true, isFilled: false, ...config })
    const children: Geometry2d[] = []
    const ignoredChildren: Geometry2d[] = []

    for (const childOrPossibleGroup of config.children) {
      if (childOrPossibleGroup.ignore) {
        ignoredChildren.push(childOrPossibleGroup)
      } else if (childOrPossibleGroup instanceof Group2d) {
        // Flatten nested groups
        children.push(...childOrPossibleGroup.children)
        ignoredChildren.push(...childOrPossibleGroup.ignoredChildren)
      } else {
        children.push(childOrPossibleGroup)
      }
    }

    this.children = children
    this.ignoredChildren = ignoredChildren
  }
}
```

**Design decisions**:
- Groups flatten nested groups during construction
- Ignored children (flagged with `ignore: true`) stored separately
- Used for shapes with labels (shape geometry + label geometry)

### Composite Distance Calculation

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

Returns the minimum distance to any child geometry. This allows composite shapes to have accurate hit testing across all their parts.

### Composite Bounds Vertices

**Location**: `/packages/editor/src/lib/primitives/geometry/Group2d.ts:117-120`

```typescript
override getBoundsVertices(): Vec[] {
  return this.children.flatMap((c) => c.boundsVertices)
}
```

Flattens all children's bounds vertices into single array. The parent Box.FromPoints call then computes the enclosing bounds.

## Editor Bounds Methods

### Three Types of Bounds

The Editor provides three distinct bounds concepts:

1. **Local Bounds** (shape space): `getShapeGeometry(shape).bounds`
2. **Page Bounds** (page space): `getShapePageBounds(shape)`
3. **Masked Page Bounds** (clipped by frames): `getShapeMaskedPageBounds(shape)`

### Shape Geometry (Local Bounds)

**Location**: `/packages/editor/src/lib/editor/Editor.ts:4711-4726`

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

**Caching strategy**:
- Context-aware caches (e.g., "arrow" context for binding geometry)
- Uses computed cache that tracks shape changes
- `areShapesContentEqual` determines cache invalidation
- Font tracking ensures text shapes recompute when fonts load

### Page Space Transform

**Location**: `/packages/editor/src/lib/editor/Editor.ts:4784-4798`

```typescript
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

**Algorithm**:
- Recursive composition up the parent hierarchy
- Base case: shapes on page use local transform only
- Recursive case: compose parent's page transform with local transform
- Results cached per shape

### Page Bounds Computation

**Location**: `/packages/editor/src/lib/editor/Editor.ts:4838-4847`

```typescript
@computed private _getShapePageBoundsCache(): ComputedCache<Box, TLShape> {
  return this.store.createComputedCache<Box, TLShape>('pageBoundsCache', (shape) => {
    const pageTransform = this._getShapePageTransformCache().get(shape.id)
    if (!pageTransform) return new Box()
    return Box.FromPoints(
      pageTransform.applyToPoints(this.getShapeGeometry(shape).boundsVertices)
    )
  })
}
```

**Algorithm**:
1. Get shape's page transform (cached)
2. Get shape's geometry bounds vertices (local space, cached)
3. Transform vertices to page space
4. Compute axis-aligned box from transformed points

**Why transform vertices, not bounds**:
A rotated rectangle's AABB is different from its local bounds. By transforming vertices and recomputing the AABB, we get the correct page-space bounds for rotated shapes.

### Masked Page Bounds

**Location**: `/packages/editor/src/lib/editor/Editor.ts:4969-4990`

```typescript
getShapeMaskedPageBounds(shape: TLShapeId | TLShape): Box | undefined {
  if (typeof shape !== 'string') shape = shape.id
  return this._getShapeMaskedPageBoundsCache().get(shape)
}
```

Used when shapes are clipped by parent frames. Returns the intersection of the shape's bounds with its clipping mask.

### Shape Mask Computation

**Location**: `/packages/editor/src/lib/editor/Editor.ts:4907-4935`

```typescript
@computed private _getShapeMaskCache(): ComputedCache<Vec[], TLShape> {
  return this.store.createComputedCache('pageMaskCache', (shape) => {
    if (isPageId(shape.parentId)) return undefined

    const clipPaths: Vec[][] = []
    // Walk ancestors and collect all clip paths
    for (const ancestor of this.getShapeAncestors(shape.id)) {
      const util = this.getShapeUtil(ancestor)
      const clipPath = util.getClipPath?.(ancestor)
      if (!clipPath) continue
      if (util.shouldClipChild?.(shape) === false) continue
      const pageTransform = this.getShapePageTransform(ancestor.id)
      clipPaths.push(pageTransform.applyToPoints(clipPath))
    }
    if (clipPaths.length === 0) return undefined

    // Compute intersection of all clip paths
    const pageMask = clipPaths.reduce((acc, b) => {
      const intersection = intersectPolygonPolygon(acc, b)
      return intersection ? intersection.map(Vec.Cast) : []
    })

    return pageMask
  })
}
```

**Algorithm**:
1. Walk up the ancestor hierarchy
2. Collect clip paths from each ancestor that can clip
3. Transform clip paths to page space
4. Iteratively intersect all clip paths
5. Final polygon is the shape's clipping mask

This handles nested frames where a shape might be clipped by multiple ancestors.

## Viewport Culling

### Not Visible Shapes Derivation

**Location**: `/packages/editor/src/lib/editor/derivations/notVisibleShapes.ts:11-68`

```typescript
export function notVisibleShapes(editor: Editor) {
  return computed<Set<TLShapeId>>('notVisibleShapes', function updateNotVisibleShapes(prevValue) {
    const viewportPageBounds = editor.getViewportPageBounds()
    const viewMinX = viewportPageBounds.minX
    const viewMinY = viewportPageBounds.minY
    const viewMaxX = viewportPageBounds.maxX
    const viewMaxY = viewportPageBounds.maxY

    const nextValue = new Set<TLShapeId>()
    const shapeIds = editor.getCurrentPageShapeIds()

    for (const id of shapeIds) {
      const pageBounds = editor.getShapePageBounds(id)

      // Inlined AABB collision check for performance
      if (
        pageBounds !== undefined &&
        pageBounds.maxX >= viewMinX &&
        pageBounds.minX <= viewMaxX &&
        pageBounds.maxY >= viewMinY &&
        pageBounds.minY <= viewMaxY
      ) {
        continue  // Shape is visible
      }

      const shape = editor.getShape(id)
      if (!shape) continue

      const canCull = editor.getShapeUtil(shape.type).canCull(shape)
      if (!canCull) continue

      nextValue.add(id)  // Shape is culled (not visible)
    }

    return nextValue
  })
}
```

**Performance optimizations**:
1. **Inlined AABB check**: Avoids function call overhead in hot loop
2. **Early viewport extraction**: Gets bounds values once before loop
3. **Lazy shape fetch**: Only fetches full shape if bounds check passes
4. **canCull flag**: Some shapes opt out of culling (always render)
5. **Incremental tracking**: Tracks changes to avoid full recomputation

### Viewport Bounds Computation

**Location**: `/packages/editor/src/lib/editor/Editor.ts:2312-2320`

```typescript
@computed getViewportPageBounds() {
  const { w, h } = this.getViewportScreenBounds()
  const { x: cx, y: cy, z: cz } = this.getCamera()
  return new Box(-cx, -cy, w / cz, h / cz)
}
```

Converts screen viewport to page coordinates using camera position and zoom level.

## Selection Bounds

### Current Page Bounds

**Location**: `/packages/editor/src/lib/editor/Editor.ts:5166-5180`

```typescript
@computed getCurrentPageBounds(): Box | undefined {
  let commonBounds: Box | undefined

  this.getCurrentPageShapeIdsSorted().forEach((shapeId) => {
    const bounds = this.getShapeMaskedPageBounds(shapeId)
    if (!bounds) return
    if (!commonBounds) {
      commonBounds = bounds.clone()
    } else {
      commonBounds = commonBounds.expand(bounds)
    }
  })

  return commonBounds
}
```

**Algorithm**:
1. Iterate all shapes on current page
2. Get masked page bounds for each
3. Expand accumulator to include each shape
4. Result is bounds enclosing all shapes

### Selection Bounds

**Location**: `/packages/editor/src/lib/editor/Editor.ts:5144-5164`

```typescript
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

Same pattern as page bounds, but only for selected shapes.

## Edge Cases and Special Handling

### Zero-Size Box Fix

**Location**: `/packages/editor/src/lib/primitives/Box.ts:613-616`

```typescript
zeroFix() {
  this.w = Math.max(1, this.w)
  this.h = Math.max(1, this.h)
  return this
}
```

Ensures boxes always have minimum 1px dimensions. Prevents degenerate cases that cause division by zero or other math issues.

### Floating-Point Precision

**Location**: `/packages/editor/src/lib/primitives/Box.ts:429-436`

```typescript
static ContainsApproximately(A: Box, B: Box, precision?: number) {
  return (
    approximatelyLte(A.minX, B.minX, precision) &&
    approximatelyLte(A.minY, B.minY, precision) &&
    approximatelyLte(B.maxX, A.maxX, precision) &&
    approximatelyLte(B.maxY, A.maxY, precision)
  )
}
```

Uses approximate comparison with tolerance for floating-point arithmetic errors. Critical for operations that accumulate small errors.

### Aspect Ratio During Resize

**Location**: `/packages/editor/src/lib/primitives/Box.ts:535-581`

Complex algorithm for maintaining aspect ratio:
1. Compute scale factors in X and Y
2. Detect axis flips (negative scale)
3. Adjust opposite corner based on aspect ratio
4. Use `isTall` boolean to choose constrained axis

### Labels Excluded from Bounds

**Location**: `/packages/tldraw/src/lib/shapes/geo/GeoShapeUtil.tsx:105-115`

```typescript
new Rectangle2d({
  ...labelBounds,
  isFilled: true,
  isLabel: true,
  excludeFromShapeBounds: true,  // Key line!
  isEmptyLabel: isEmptyLabel,
})
```

Labels can extend outside their parent shape's bounds. By excluding labels from bounds computation, shapes maintain predictable sizes while labels can "overflow" visually.

### Thin Shape Handling

Shapes with very small dimensions (< 1 pixel width or height) need special handling in hit testing. Their bounding boxes are essentially lines, so broad-phase rejection would incorrectly exclude them.

**Location**: `/packages/editor/src/lib/editor/Editor.ts:5304-5310`

```typescript
if (outerMargin === 0 && (geometry.bounds.w < 1 || geometry.bounds.h < 1)) {
  // Skip broad phase for very thin shapes
  distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
} else {
  // Normal broad phase + narrow phase
}
```

## Performance Characteristics

### Complexity Analysis

- **Collision check**: O(1) - constant time AABB comparison
- **Containment check**: O(1) - constant time edge comparisons
- **FromPoints**: O(n) - single pass through vertices
- **Viewport culling**: O(n) - checks all shapes, but fast AABB rejection
- **Expand**: O(1) - constant time min/max operations

### Cache Invalidation

The reactive caching system invalidates on:
- Shape content changes (position, rotation, scale, props)
- Parent hierarchy changes
- Camera/viewport changes (for viewport bounds only)

`areShapesContentEqual` check prevents invalidation on non-content changes like selection state.

### Memory Considerations

- Box class: 4 numbers (32 bytes approximately)
- Geometry cache: One geometry per shape per context
- Transform cache: One Mat per shape
- Bounds cache: One Box per shape

## Summary of Key Insights

1. **Simple primitives**: Box uses just x, y, w, h with computed properties for convenience
2. **AABB is fast**: Axis-aligned collision detection is just 4 comparisons
3. **Transform vertices, not bounds**: Correctly handles rotated shapes
4. **Multi-level caching**: Geometry, transforms, and bounds all cached independently
5. **Context-aware caches**: Different use cases (hit testing, binding) can have different geometries
6. **Label exclusion**: Labels don't affect shape bounds via `excludeFromShapeBounds`
7. **Lazy evaluation**: Bounds computed on first access, cached thereafter
8. **Incremental updates**: Reactive system only recomputes what changed
9. **Precision handling**: Approximate comparisons for floating-point safety
10. **Viewport culling**: Inlined AABB check in hot loop for performance
