---
title: Arc arrows - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - arc
  - arrows
---

# Arc arrows: raw notes

Internal research notes for the arc-arrows.md article.

## Core problem

When arrows bind to shapes that move, how do you preserve the curve the user drew?

**Bezier approach (rejected):**
- Quadratic bezier with control point has 2 degrees of freedom (x, y)
- When endpoints move independently, control point position becomes ambiguous
- Multiple heuristics possible: relative distance to endpoints, absolute angle, perpendicular distance from baseline
- Each heuristic produces different results
- Certain movements can flip the control point to wrong side of line, reversing curve direction
- Small shape movements can produce disproportionate visual changes

**Circular arc approach (chosen):**
- Single degree of freedom: the bend amount
- Given any three points, exactly one circle passes through all of them
- Bend value = perpendicular distance from midpoint of baseline to arc's middle point
- Positive bend curves one way, negative curves the other
- No S-curves, no loops, no unexpected reversals possible

## Mathematical foundation

**Circle from three points:**
Located in `packages/editor/src/lib/primitives/utils.ts:452`

```typescript
export function centerOfCircleFromThreePoints(a: VecLike, b: VecLike, c: VecLike) {
    const u = -2 * (a.x * (b.y - c.y) - a.y * (b.x - c.x) + b.x * c.y - c.x * b.y)
    const x = ((a.x * a.x + a.y * a.y) * (c.y - b.y) +
               (b.x * b.x + b.y * b.y) * (a.y - c.y) +
               (c.x * c.x + c.y * c.y) * (b.y - a.y)) / u
    const y = ((a.x * a.x + a.y * a.y) * (b.x - c.x) +
               (b.x * b.x + b.y * b.y) * (c.x - a.x) +
               (c.x * c.x + c.y * c.y) * (a.x - b.x)) / u
    // Returns null if points are collinear (u approaches 0)
    return new Vec(x, y)
}
```

**Middle point calculation:**
From `curved-arrow.ts:44-48`:
```typescript
const med = Vec.Med(terminalsInArrowSpace.start, terminalsInArrowSpace.end) // midpoint
const distance = Vec.Sub(terminalsInArrowSpace.end, terminalsInArrowSpace.start)
const u = Vec.Len(distance) ? distance.uni() : Vec.From(distance) // unit vector
const middle = Vec.Add(med, u.per().mul(-bend)) // perpendicular offset by bend amount
```

**Arc info structure:**
From `arrow-types.ts:110-117`:
```typescript
interface TLArcInfo {
    center: VecLike      // circle center
    radius: number       // circle radius
    size: number         // arc angle in radians (negative if counterclockwise)
    length: number       // arc length in distance units (size * radius)
    largeArcFlag: number // SVG: 0 = short arc, 1 = long arc
    sweepFlag: number    // SVG: 0 = counterclockwise, 1 = clockwise
}
```

## Two arcs: handle vs body

**Handle arc:**
- Represents user intent: logical connection with specific bend
- Endpoints are at binding anchor positions (center of shape by default, or precise user-targeted point)
- Source of truth for curvature
- Stored in normalized, relative terms

**Body arc:**
- What actually renders on screen
- Same center and radius as handle arc
- Endpoints sit at intersection points where arc meets shape boundaries
- Accounts for arrowhead offsets

From `arrow-types.ts:120-129`:
```typescript
interface TLArcArrowInfo {
    type: 'arc'
    start: TLArrowPoint
    end: TLArrowPoint
    middle: VecLike
    handleArc: TLArcInfo   // user intent
    bodyArc: TLArcInfo     // rendered
    isValid: boolean
}
```

## Binding and anchor storage

**Normalized anchor positions:**
From `shared.ts:83-92`:
```typescript
const shapePoint = Vec.Add(
    point,
    Vec.MulV(
        binding.props.isPrecise || forceImprecise
            ? binding.props.normalizedAnchor  // 0-1 within bounds
            : { x: 0.5, y: 0.5 },              // center snap
        size
    )
)
```

- Anchors stored as normalized 0-1 positions within shape bounds
- Non-precise bindings snap to center (0.5, 0.5)
- Precise bindings use exact normalized position user targeted

## Shape intersection algorithm

**Finding where arc meets shape boundary:**
From `curved-arrow.ts:120-153`:

1. Transform arc's circle into target shape's local coordinate space
2. Call `geometry.intersectCircle(center, radius)` on shape geometry
3. Filter to intersections on the arc segment (not full circle):
   ```typescript
   intersections = intersections.filter(
       (pt) => distFn(angleToStart, centerInStartShapeLocalSpace.angle(pt)) <= dAB
   )
   ```
4. Sort intersections:
   - **Closed shapes (rectangles, ellipses):** Pick intersection closest to 25% along arc (start terminal) or 75% (end terminal)
   - **Open shapes (lines, polylines):** Pick nearest intersection
5. If no intersection found, use nearest point on geometry (closed) or handle position (open)

**Why 25%/75% targeting:**
For closed shapes, we want arrows pointing "into" the shape rather than grazing tangentially. 25% and 75% positions along the arc typically achieve this.

## Clockwise vs counterclockwise

From `curved-arrow.ts:79-80`:
```typescript
const isClockwise = shape.props.bend < 0
const distFn = isClockwise ? clockwiseAngleDist : counterClockwiseAngleDist
```

- Negative bend = clockwise arc
- Positive bend = counterclockwise arc
- Distance function used throughout for arc angle calculations

## Arrowhead offset handling

**Offset calculation:**
From `curved-arrow.ts:176-183`:
```typescript
if (arrowheadStart !== 'none') {
    const strokeOffset =
        STROKE_SIZES[shape.props.size] / 2 +
        ('size' in startShapeInfo.shape.props
            ? STROKE_SIZES[startShapeInfo.shape.props.size] / 2
            : 0)
    offsetA = (BOUND_ARROW_OFFSET + strokeOffset) * shape.props.scale
    minLength += strokeOffset * shape.props.scale
}
```

**Applying offset along arc:**
From `curved-arrow.ts:282-291`:
```typescript
if (offsetA !== 0) {
    tA.setTo(handleArc.center).add(
        Vec.FromAngle(aCA + dAB * ((offsetA / lAB) * (isClockwise ? 1 : -1))).mul(handleArc.radius)
    )
}
```

Converts linear offset to arc angle: `offsetAngle = (offsetDistance / arcLength) * totalArcAngle`

**Offset flipping when too short:**
From `curved-arrow.ts:294-312`:
```typescript
if (Vec.DistMin(tA, tB, minLength)) {
    if (offsetA !== 0 && offsetB !== 0) {
        offsetA *= -1.5
        offsetB *= -1.5
    } else if (offsetA !== 0) {
        offsetA *= -2
    } else if (offsetB !== 0) {
        offsetB *= -2
    }
    // Clamp to prevent body arc exceeding handle arc
    const minOffsetA = 0.1 - distFn(handle_aCA, aCA) * handleArc.radius
    offsetA = Math.max(offsetA, minOffsetA)
}
```

When endpoints get too close, flip offsets outward (negative multipliers) so arrow pokes slightly into shapes rather than disappearing.

## Edge case handling

**Shape relationships:**
From `shared.ts:291-305`:
```typescript
function getBoundShapeRelationships(editor, startShapeId, endShapeId) {
    if (!startShapeId || !endShapeId) return 'safe'
    if (startShapeId === endShapeId) return 'double-bound'
    const startBounds = editor.getShapePageBounds(startShapeId)
    const endBounds = editor.getShapePageBounds(endShapeId)
    if (startBounds.contains(endBounds)) return 'start-contains-end'
    if (endBounds.contains(startBounds)) return 'end-contains-start'
    return 'safe'
}
```

**Double-bound handling (same shape):**
From `curved-arrow.ts:342-345`:
```typescript
if (relationship === 'double-bound' && lAB < 30) {
    tempA.setTo(a)
    tempB.setTo(b)
    tempC.setTo(c)
}
```

If arc length < 30px for self-referential arrow, use handle positions directly.

**Containment handling:**
Forces precise anchoring when one shape contains the other, because center-snap behavior produces confusing results.

## Constants

From `shared.ts:264-276`:
```typescript
const MIN_ARROW_LENGTH = 10      // minimum rendered arrow length
const BOUND_ARROW_OFFSET = 10    // offset from shape edge for arrowheads
const WAY_TOO_BIG_ARROW_BEND_FACTOR = 10  // fallback to straight if bend exceeds this

const STROKE_SIZES = {
    s: 2,
    m: 3.5,
    l: 5,
    xl: 10,
}
```

From `shared.ts:19`:
```typescript
const MIN_ARROW_BEND = 8  // snap to straight if |bend| < 8px (scaled)
```

## SVG rendering

From `ArrowPath.tsx:13-24`:
```typescript
case 'arc':
    return new PathBuilder()
        .moveTo(info.start.point.x, info.start.point.y, { offset: 0, roundness: 0 })
        .circularArcTo(
            info.bodyArc.radius,
            !!info.bodyArc.largeArcFlag,
            !!info.bodyArc.sweepFlag,
            info.end.point.x,
            info.end.point.y,
            { offset: 0, roundness: 0 }
        )
        .toSvg(opts)
```

Uses SVG `A` (arc) command which requires:
- `rx`, `ry` (radius - same for circular arc)
- `largeArcFlag` (0 or 1)
- `sweepFlag` (0 or 1)
- End point coordinates

## Validity checks

From `curved-arrow.ts:87-94`:
```typescript
if (
    handleArc.length === 0 ||
    handleArc.size === 0 ||
    !isSafeFloat(handleArc.length) ||
    !isSafeFloat(handleArc.size)
) {
    return getStraightArrowInfo(editor, shape, bindings)
}
```

Falls back to straight arrow if arc geometry is degenerate.

From `curved-arrow.ts:405`:
```typescript
isValid: bodyArc.length !== 0 && isFinite(bodyArc.center.x) && isFinite(bodyArc.center.y)
```

## Arrowhead types

From `arrowheads.ts`:
- `arrow` - chevron shape (PI/6 rotation)
- `triangle` - filled triangle
- `inverted` - inverted triangle
- `dot` - circle
- `diamond` - diamond shape
- `square` - square shape
- `bar` - perpendicular line

Arrowhead size based on stroke width, clamped between `strokeWidth` and `strokeWidth * 3`, with a target of `compareLength / 5`.

## Key source files

- `packages/tldraw/src/lib/shapes/arrow/curved-arrow.ts` - Main arc geometry
- `packages/tldraw/src/lib/shapes/arrow/shared.ts` - Bindings, terminals, constants
- `packages/tldraw/src/lib/shapes/arrow/arrowheads.ts` - Arrowhead rendering
- `packages/tldraw/src/lib/shapes/arrow/ArrowPath.tsx` - SVG path generation
- `packages/tldraw/src/lib/shapes/arrow/arrow-types.ts` - Type definitions
- `packages/editor/src/lib/primitives/utils.ts` - Circle-from-three-points math
