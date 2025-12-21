# Brush vs scribble selection: raw notes

Internal research notes for the brush-scribble-selection.md article.

## Core selection modes

**Brush selection (rectangular marquee):**
- Activated by default when clicking and dragging on canvas
- Creates rectangular selection box from origin to current pointer position
- Uses `Box.FromPoints([originPagePoint, currentPagePoint])`
- Located in: `packages/tldraw/src/lib/tools/SelectTool/childStates/Brushing.ts`

**Scribble selection (freeform lasso):**
- Activated by holding Alt key during drag
- Creates freeform path following pointer movement
- Each frame creates line segment from previous to current pointer position
- Located in: `packages/tldraw/src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts`

**Mode switching:**
From `Brushing.ts:49-52` and `Brushing.ts:98-101`:
```typescript
if (altKey) {
    this.parent.transition('scribble_brushing', info)
    return
}
```
Checking Alt key on `onEnter` and `onKeyDown` events triggers immediate transition.

## Brush selection algorithm

### Basic flow
From `Brushing.ts:115-211`:

1. Get origin and current pointer positions
2. Create brush box: `Box.FromPoints([originPagePoint, currentPagePoint])`
3. Get brush corners for edge testing
4. Determine shapes to test (visible or all, based on viewport)
5. For each shape, test intersection
6. Update selection set
7. Update editor instance state with brush bounds

### Shape filtering and exclusion

**Exclusion set creation:**
From `Brushing.ts:54-61`:
```typescript
this.excludedShapeIds = new Set(
    editor
        .getCurrentPageShapes()
        .filter(
            (shape) => editor.isShapeOfType(shape, 'group') || editor.isShapeOrAncestorLocked(shape)
        )
        .map((shape) => shape.id)
)
```

**Excluded shapes:**
- Groups (cannot be selected directly)
- Locked shapes and their descendants

**Already selected shapes:**
From `Brushing.ts:164`:
```typescript
if (excludedShapeIds.has(shape.id) || results.has(shape.id)) continue testAllShapes
```
Skip shapes already in the exclusion set or already selected in current pass.

### Viewport optimization

From `Brushing.ts:141-158`:
```typescript
// On a page with ~5000 shapes, on-screen hit tests are about 2x faster than
// testing all shapes.

const brushBoxIsInsideViewport = editor.getViewportPageBounds().contains(brush)
const shapesToHitTest =
    brushBoxIsInsideViewport && !this.viewportDidChange
        ? editor.getCurrentPageRenderingShapesSorted()
        : editor.getCurrentPageShapesSorted()
```

**Two optimization conditions:**
1. Brush box must be entirely inside viewport bounds
2. Viewport must not have changed during the brushing interaction

**Viewport change tracking:**
From `Brushing.ts:42-47`:
```typescript
this.cleanupViewportChangeReactor = react('viewport change while brushing', () => {
    editor.getViewportPageBounds() // capture the viewport change
    if (!isInitialCheck && !this.viewportDidChange) {
        this.viewportDidChange = true
    }
})
```
Reactive observer marks `viewportDidChange = true` if viewport bounds change after initial check.

### Three-tier intersection test

**Tier 1: Complete containment (fast path)**
From `Brushing.ts:169-173`:
```typescript
if (brush.contains(pageBounds)) {
    this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
    continue testAllShapes
}
```
Uses `Box.Contains()` from `packages/editor/src/lib/primitives/Box.ts:416-418`:
```typescript
static Contains(A: Box, B: Box) {
    return A.minX < B.minX && A.minY < B.minY && A.maxY > B.maxY && A.maxX > B.maxX
}
```
If brush completely contains shape's bounding box, it's a definite hit.

**Tier 2: Wrap mode check**
From `Brushing.ts:175-179`:
```typescript
if (isWrapping || editor.isShapeOfType(shape, 'frame')) {
    continue testAllShapes
}
```

Wrap mode logic from `Brushing.ts:126`:
```typescript
const isWrapping = isWrapMode ? !ctrlKey : ctrlKey
```
- Default mode (isWrapMode = false): Hold Ctrl to enable wrapping
- Wrap mode (isWrapMode = true): Release Ctrl to enable wrapping
- Frames **always** require wrap mode regardless of setting

**Tier 3: Edge intersection test**
From `Brushing.ts:183-199`:
```typescript
if (brush.collides(pageBounds)) {
    pageTransform = editor.getShapePageTransform(shape)
    if (!pageTransform) continue testAllShapes
    localCorners = pageTransform.clone().invert().applyToPoints(corners)
    const geometry = editor.getShapeGeometry(shape)
    hitTestBrushEdges: for (let i = 0; i < 4; i++) {
        A = localCorners[i]
        B = localCorners[(i + 1) % 4]
        if (geometry.hitTestLineSegment(A, B, 0)) {
            this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
            break hitTestBrushEdges
        }
    }
}
```

**Coordinate transformation:**
- Brush corners defined in page space
- Shape geometry defined in shape's local space
- Transform brush corners into shape space: `pageTransform.clone().invert().applyToPoints(corners)`
- This is cheaper than transforming complex shape geometry into page space

**Collision check:**
From `Box.ts:412-414`:
```typescript
static Collides(A: Box, B: Box) {
    return !(A.maxX < B.minX || A.minX > B.maxX || A.maxY < B.minY || A.minY > B.maxY)
}
```
Axis-aligned bounding box overlap test.

### Hit test geometry

From `Geometry2d.ts:146-148`:
```typescript
hitTestLineSegment(A: VecLike, B: VecLike, distance = 0, filters?: Geometry2dFilters): boolean {
    return this.distanceToLineSegment(A, B, filters) <= distance
}
```

**Distance calculation:**
From `Geometry2d.ts:120-144`:
```typescript
distanceToLineSegment(A: VecLike, B: VecLike, filters?: Geometry2dFilters) {
    if (Vec.Equals(A, B)) return this.distanceToPoint(A, false, filters)
    const { vertices } = this
    if (vertices.length === 0) throw Error('nearest point not found')
    if (vertices.length === 1) return Vec.Dist(A, vertices[0])
    let nearest: Vec | undefined
    let dist = Infinity
    let d: number, p: Vec, q: Vec
    const nextLimit = this.isClosed ? vertices.length : vertices.length - 1
    for (let i = 0; i < vertices.length; i++) {
        p = vertices[i]
        if (i < nextLimit) {
            const next = vertices[(i + 1) % vertices.length]
            if (linesIntersect(A, B, p, next)) return 0
        }
        q = Vec.NearestPointOnLineSegment(A, B, p, true)
        d = Vec.Dist2(p, q)
        if (d < dist) {
            dist = d
            nearest = q
        }
    }
    if (!nearest) throw Error('nearest point not found')
    return this.isClosed && this.isFilled && pointInPolygon(nearest, this.vertices) ? -dist : dist
}
```

**Two tests:**
1. Edge intersection: `linesIntersect(A, B, p, next)` returns `0` immediately if line segments cross
2. Nearest point: Find closest point on line segment to any vertex, return negative distance if inside filled polygon

**Line intersection test:**
From `intersect.ts:233-240`:
```typescript
function ccw(A: VecLike, B: VecLike, C: VecLike) {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x)
}

export function linesIntersect(A: VecLike, B: VecLike, C: VecLike, D: VecLike) {
    return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D)
}
```
Uses counter-clockwise (ccw) orientation test. Lines AB and CD intersect if A and B are on opposite sides of CD, and C and D are on opposite sides of AB.

### Frame masking

From `Brushing.ts:217-241`:
```typescript
private handleHit(
    shape: TLShape,
    currentPagePoint: Vec,
    currentPageId: TLPageId,
    results: Set<TLShapeId>,
    corners: Vec[]
) {
    if (shape.parentId === currentPageId) {
        results.add(shape.id)
        return
    }

    const selectedShape = this.editor.getOutermostSelectableShape(shape)
    const pageMask = this.editor.getShapeMask(selectedShape.id)
    if (
        pageMask &&
        !polygonsIntersect(pageMask, corners) &&
        !pointInPolygon(currentPagePoint, pageMask)
    ) {
        return
    }
    results.add(selectedShape.id)
}
```

**Mask check logic:**
- If shape is direct child of page, add immediately
- Otherwise, get outermost selectable ancestor
- Get page mask (visible polygon after frame clipping)
- Only select if mask intersects brush corners OR pointer is inside mask
- This prevents selecting shapes by brushing their invisible (clipped) portions

**Polygon intersection:**
From `intersect.ts:354-364`:
```typescript
export function polygonsIntersect(a: VecLike[], b: VecLike[]) {
    let a0: VecLike, a1: VecLike, b0: VecLike, b1: VecLike
    for (let i = 0, n = a.length; i < n; i++) {
        a0 = a[i]
        a1 = a[(i + 1) % n]
        for (let j = 0, m = b.length; j < m; j++) {
            b0 = b[j]
            b1 = b[(j + 1) % m]
            if (linesIntersect(a0, a1, b0, b1)) return true
        }
    }
    return false
}
```
Tests all edge pairs between two polygons for intersection.

### Selection state management

**Initial selection handling:**
From `Brushing.ts:123`:
```typescript
const results = new Set(shiftKey ? this.initialSelectedShapeIds : [])
```
- Shift key held: Start with previously selected shapes (additive selection)
- No shift key: Start with empty set (replace selection)

**State update:**
From `Brushing.ts:207-210`:
```typescript
const current = editor.getSelectedShapeIds()
if (current.length !== results.size || current.some((id) => !results.has(id))) {
    editor.setSelectedShapes(Array.from(results))
}
```
Only update selection if it has changed (avoid unnecessary reactive updates).

**Brush state:**
From `Brushing.ts:202-205`:
```typescript
const currentBrush = editor.getInstanceState().brush
if (!currentBrush || !brush.equals(currentBrush)) {
    editor.updateInstanceState({ brush: { ...brush.toJson() } })
}
```
Store brush box in instance state for rendering (the translucent rectangle overlay).

## Scribble selection algorithm

### Basic flow
From `ScribbleBrushing.ts:81-167`:

1. Initialize with empty selection sets on entry
2. Push current pointer position to scribble visual
3. Create line segment from previous to current position
4. For each visible shape, test if segment crosses geometry
5. Add newly hit shapes to selection set
6. Update editor selection state
7. Continue until pointer up

### Incremental selection

From `ScribbleBrushing.ts:14-21`:
```typescript
hits = new Set<TLShapeId>()
size = 0
scribbleId = 'id'
initialSelectedShapeIds = new Set<TLShapeId>()
newlySelectedShapeIds = new Set<TLShapeId>()
```

**Three selection sets:**
- `initialSelectedShapeIds`: Shapes selected before scribble started (if Shift held)
- `newlySelectedShapeIds`: Shapes crossed during this scribble
- Final selection: Union of both sets

From `ScribbleBrushing.ts:104-111`:
```typescript
if (
    editor.isShapeOfType(shape, 'group') ||
    newlySelectedShapeIds.has(shape.id) ||
    editor.isShapeOrAncestorLocked(shape)
) {
    continue
}
```
**Skip shapes that are:**
- Groups
- Already selected in this scribble pass
- Locked or have locked ancestor

**Key difference from brush:**
Once a shape is added to `newlySelectedShapeIds`, it's never tested again. Selection only grows, never shrinks.

### Bounding box early-out

From `ScribbleBrushing.ts:99-139`:
```typescript
const minDist = 0 // this.editor.options.hitTestMargin / zoomLevel

// ...

const { bounds } = geometry
if (
    bounds.minX - minDist > Math.max(A.x, B.x) ||
    bounds.minY - minDist > Math.max(A.y, B.y) ||
    bounds.maxX + minDist < Math.min(A.x, B.x) ||
    bounds.maxY + minDist < Math.min(A.y, B.y)
) {
    continue
}
```

**Four culling conditions:**
1. Segment entirely to the left of shape bounds
2. Segment entirely above shape bounds
3. Segment entirely to the right of shape bounds
4. Segment entirely below shape bounds

If any condition is true, skip expensive geometry intersection test.

### Line segment hit test

From `ScribbleBrushing.ts:124-141`:
```typescript
const pageTransform = editor.getShapePageTransform(shape)
if (!geometry || !pageTransform) continue
const pt = pageTransform.clone().invert()
A = pt.applyToPoint(previousPagePoint)
B = pt.applyToPoint(currentPagePoint)

// ... bounds check ...

if (geometry.hitTestLineSegment(A, B, minDist)) {
    const outermostShape = this.editor.getOutermostSelectableShape(shape)
    // ... mask check ...
    newlySelectedShapeIds.add(outermostShape.id)
}
```

Same coordinate transformation as brush: Transform segment endpoints into shape's local space.

### Frame special handling

From `ScribbleBrushing.ts:115-121`:
```typescript
if (
    editor.isShapeOfType(shape, 'frame') &&
    geometry.bounds.containsPoint(editor.getPointInShapeSpace(shape, originPagePoint))
) {
    continue
}
```

**Frames ignored if:**
Scribble origin point is inside the frame's bounds. This prevents accidentally selecting a frame when scribbling inside it to select its children.

### Mask intersection for scribble

From `ScribbleBrushing.ts:143-154`:
```typescript
const pageMask = this.editor.getShapeMask(outermostShape.id)
if (pageMask) {
    const intersection = intersectLineSegmentPolygon(
        previousPagePoint,
        currentPagePoint,
        pageMask
    )
    if (intersection !== null) {
        const isInMask = pointInPolygon(currentPagePoint, pageMask)
        if (!isInMask) continue
    }
}
```

**More complex than brush:**
- First check if line segment intersects mask polygon
- If it does intersect, also check if current point is inside mask
- Only select if both conditions are true
- This ensures you can't select clipped shapes by scribbling through their invisible portions

**Line-polygon intersection:**
From `intersect.ts:123-138`:
```typescript
export function intersectLineSegmentPolygon(a1: VecLike, a2: VecLike, points: VecLike[]) {
    const result: VecLike[] = []
    let segmentIntersection: VecLike | null

    for (let i = 1, n = points.length; i < n + 1; i++) {
        segmentIntersection = intersectLineSegmentLineSegment(
            a1,
            a2,
            points[i - 1],
            points[i % points.length]
        )

        if (segmentIntersection) result.push(segmentIntersection)
    }

    if (result.length === 0) return null // no intersection
    return result
}
```
Tests segment against each edge of the polygon, returns array of intersection points or null.

### Scribble visual feedback

From `ScribbleBrushing.ts:31-37`:
```typescript
const scribbleItem = this.editor.scribbles.addScribble({
    color: 'selection-stroke',
    opacity: 0.32,
    size: 12,
})

this.scribbleId = scribbleItem.id
```

**Scribble properties:**
- Color: 'selection-stroke' (theme-dependent)
- Opacity: 0.32 (32% transparent)
- Size: 12 pixels wide
- Same visual system used for eraser feedback

From `ScribbleBrushing.ts:76-79`:
```typescript
private pushPointToScribble() {
    const { x, y } = this.editor.inputs.getCurrentPagePoint()
    this.editor.scribbles.addPoint(this.scribbleId, x, y)
}
```

**Scribble manager:**
Located in `packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts`

From `ScribbleManager.ts:74-82`:
```typescript
addPoint(id: ScribbleItem['id'], x: number, y: number, z = 0.5) {
    const item = this.scribbleItems.get(id)
    if (!item) throw Error(`Scribble with id ${id} not found`)
    const { prev } = item
    const point = { x, y, z }
    if (!prev || Vec.Dist(prev, point) >= 1) {
        item.next = point
    }
    return item
}
```
Only adds point if distance from previous point >= 1 pixel (reduces point count).

From `ScribbleManager.ts:104-106`:
```typescript
if (item.scribble.points.length > 8) {
    item.scribble.state = 'active'
}
```
Scribble starts in 'starting' state, transitions to 'active' after 8 points accumulated.

From `ScribbleBrushing.ts:45`:
```typescript
this.editor.scribbles.stop(this.scribbleId)
```
On exit, marks scribble as 'stopping', which triggers fade-out animation.

### Selection state update

From `ScribbleBrushing.ts:160-166`:
```typescript
const current = editor.getSelectedShapeIds()
const next = new Set<TLShapeId>(
    shiftKey ? [...newlySelectedShapeIds, ...initialSelectedShapeIds] : [...newlySelectedShapeIds]
)
if (current.length !== next.size || current.some((id) => !next.has(id))) {
    this.editor.setSelectedShapes(Array.from(next))
}
```

Similar to brush, but combines two sets when Shift is held.

## Edge scrolling

Both modes support edge scrolling when pointer approaches viewport edge.

From `Brushing.ts:76-79` and similar in `ScribbleBrushing.ts`:
```typescript
override onTick({ elapsed }: TLTickEventInfo) {
    const { editor } = this
    editor.edgeScrollManager.updateEdgeScrolling(elapsed)
}
```

**Edge scroll manager:**
Located in `packages/editor/src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.ts`

From `EdgeScrollManager.ts:64-84`:
```typescript
private getEdgeProximityFactors(
    position: number,
    dimension: number,
    isCoarse: boolean,
    insetStart: boolean,
    insetEnd: boolean
) {
    const { editor } = this
    const dist = editor.options.edgeScrollDistance
    const pw = isCoarse ? editor.options.coarsePointerWidth : 0 // pointer width
    const pMin = position - pw
    const pMax = position + pw
    const min = insetStart ? 0 : dist
    const max = insetEnd ? dimension : dimension - dist
    if (pMin < min) {
        return Math.min(1, (min - pMin) / dist)
    } else if (pMax > max) {
        return -Math.min(1, (pMax - max) / dist)
    }
    return 0
}
```

**Edge scroll algorithm:**
1. Calculate proximity factor (0-1) based on pointer distance from edge
2. Apply easing function over delay period
3. Move camera proportional to proximity factor
4. Selection updates each tick to include newly-visible shapes

**Configuration options:**
- `edgeScrollDistance`: How close to edge triggers scrolling
- `edgeScrollDelay`: Delay before scrolling starts
- `edgeScrollEaseDuration`: Duration of ease-in animation
- `coarsePointerWidth`: Extra margin for touch/stylus inputs

## Wrap mode semantics

**User preference:**
From `UserPreferencesManager.ts:108-110`:
```typescript
@computed getIsWrapMode() {
    return this.user.userPreferences.get().isWrapMode ?? defaultUserPreferences.isWrapMode
}
```

**Default behavior:**
- `isWrapMode = false` (default): Shapes selected if they touch/intersect selection area
- Hold Ctrl: Switch to wrap mode (must completely enclose)

**Wrap mode enabled:**
- `isWrapMode = true`: Shapes must be completely enclosed by default
- Hold Ctrl: Switch to intersection mode (touch to select)

**Frame exception:**
From `Brushing.ts:177`:
```typescript
if (isWrapping || editor.isShapeOfType(shape, 'frame')) {
```
Frames **always** require wrap mode regardless of setting or Ctrl key state.

**Scribble limitation:**
Scribble selection does not support wrap mode. All selections are intersection-based (touch to select).

## Filled vs hollow shapes

Both selection modes use the same geometry system from hit testing.

**Filled shapes:**
From `Geometry2d.ts:143`:
```typescript
return this.isClosed && this.isFilled && pointInPolygon(nearest, this.vertices) ? -dist : dist
```
If nearest point on segment is inside polygon, return negative distance (inside). This means brush/scribble can cross the interior without touching edges.

**Hollow shapes:**
Only edges count. Interior crossings don't trigger selection.

**Shape properties:**
- `isFilled`: Whether shape interior counts for hit testing
- `isClosed`: Whether shape is a closed polygon (affects edge iteration)

From `Geometry2d.ts:128-134`:
```typescript
const nextLimit = this.isClosed ? vertices.length : vertices.length - 1
for (let i = 0; i < vertices.length; i++) {
    p = vertices[i]
    if (i < nextLimit) {
        const next = vertices[(i + 1) % vertices.length]
        if (linesIntersect(A, B, p, next)) return 0
    }
```
Open shapes (lines, polylines) test N-1 edges. Closed shapes test N edges (wrapping around).

## Performance characteristics

**Brush selection complexity:**
- O(4 * S) edge tests in worst case, where S = number of shapes
- Four brush edges tested against each shape's geometry
- Early exits reduce actual work:
  - Complete containment: Skip geometry test
  - No collision: Skip geometry test
  - Viewport culling: Test only visible shapes

**Scribble selection complexity:**
- O(F * S) worst case, where F = number of frames, S = number of shapes
- Each frame tests new line segment against all untested shapes
- Better in practice due to:
  - Each shape tested only once (incremental selection)
  - Bounding box early-out culls most shapes
  - Only tests visible shapes: `editor.getCurrentPageRenderingShapesSorted()`

**5000 shape benchmark:**
From comment in `Brushing.ts:151-152`:
```
On a page with ~5000 shapes, on-screen hit tests are about 2x faster than
testing all shapes.
```

## State machine integration

Both are child states of SelectTool.

**State transitions:**
- Idle → Brushing: Click and drag on canvas
- Brushing → ScribbleBrushing: Press Alt key
- ScribbleBrushing → Brushing: Release Alt key
- Brushing/ScribbleBrushing → Idle: Pointer up or complete

From `Brushing.ts:49-52`:
```typescript
if (altKey) {
    this.parent.transition('scribble_brushing', info)
    return
}
```

From `ScribbleBrushing.ts:60-65`:
```typescript
if (!this.editor.inputs.getAltKey()) {
    this.parent.transition('brushing')
} else {
    this.updateScribbleSelection(false)
}
```

**Cancellation:**
Both modes support Escape key to cancel and restore initial selection.

From `Brushing.ts:93-96`:
```typescript
override onCancel(info: TLCancelEventInfo) {
    this.editor.setSelectedShapes(this.initialSelectedShapeIds)
    this.parent.transition('idle', info)
}
```

## Visual rendering

**Brush:**
Translucent rectangle overlay stored in instance state:
```typescript
editor.updateInstanceState({ brush: { ...brush.toJson() } })
```
Rendered by UI layer as simple box with selection stroke color.

**Scribble:**
Polyline path with tapered ends, managed by ScribbleManager:
- Points stored as array in scribble item
- Maximum 8 points kept in active scribble (older points shifted off)
- Fades out when stopping
- Limited to 5 concurrent scribbles max (sanity check)

From `ScribbleManager.ts:181`:
```typescript
.slice(-5) // limit to three as a minor sanity check
```
Comment says "three" but code says 5 (likely outdated comment).

## Key differences summary

| Aspect | Brush | Scribble |
|--------|-------|----------|
| Shape | Rectangle | Freeform path |
| Algorithm | Box intersection | Line segment intersection |
| Re-testing | Every frame | Once per shape |
| Wrap mode | Supported | Not supported |
| Frames | Require wrap | Skip if origin inside |
| Visual | Solid rectangle | Tapered polyline |
| Coordinate tests | 4 edges per shape | 1 segment per frame |
| State | Stored in instance | Managed separately |

## Constants and configuration

None specific to brush/scribble selection. Related constants:

**Edge scrolling:**
- Default `edgeScrollDistance`: Set in editor options
- Default `edgeScrollDelay`: Set in editor options
- Default `edgeScrollEaseDuration`: Set in editor options
- Default `coarsePointerWidth`: Set in editor options (for touch)

**Scribble visual:**
- Size: 12 pixels
- Opacity: 0.32 (32%)
- Color: 'selection-stroke' (theme color)
- Minimum point distance: 1 pixel
- Points before active: 8
- Max concurrent scribbles: 5

## Key source files

- `packages/tldraw/src/lib/tools/SelectTool/childStates/Brushing.ts` - Rectangular brush selection state
- `packages/tldraw/src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts` - Freeform scribble selection state
- `packages/editor/src/lib/primitives/geometry/Geometry2d.ts` - Base geometry class with `hitTestLineSegment()` and `distanceToLineSegment()`
- `packages/editor/src/lib/primitives/Box.ts` - Rectangle intersection via `contains()` and `collides()`
- `packages/editor/src/lib/primitives/intersect.ts` - Line intersection functions: `linesIntersect()`, `polygonsIntersect()`, `intersectLineSegmentPolygon()`
- `packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts` - Scribble visual feedback system
- `packages/editor/src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.ts` - Edge scrolling during selection
- `packages/editor/src/lib/editor/managers/UserPreferencesManager/UserPreferencesManager.ts` - Wrap mode preference storage
