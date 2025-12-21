---
title: Elbow arrows
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - elbow
  - arrows
  - routing
---

# Elbow arrows

When we added connector arrows to tldraw, we wanted them to route intelligently around shapes. The standard approach is grid-based pathfinding with A*: overlay a grid on the canvas, mark cells containing shapes as blocked, find the shortest path. This is how most diagramming tools do it.

It doesn't work well for real-time shape dragging.

A 5000x5000px canvas with a 10px grid has 250,000 cells to search. Running A* on every frame as you drag shapes is too expensive. You have two bad choices: use a fine grid and accept sluggish performance, or use a coarse grid and get blocky routes.

Worse, arbitrary shape rotations don't align with grid cells. A slightly rotated rectangle blocks cells it doesn't actually occupy.

We needed a different approach.

## Edge-based routing

The insight: connectors route from shape edge to shape edge, not through arbitrary space.

Each terminal (arrow endpoint) can attach to one of four edges: top, right, bottom, or left. That's 4 × 4 = 16 possible edge combinations. Instead of searching a 250,000-cell grid, we evaluate 16 specific routes and pick the best one.

For each edge pair, we check if other shapes block the path. Shapes don't block entire cells—they block portions of an edge.

Here's the blocking logic from `getElbowArrowInfo.tsx`:

```typescript
if (
    isWithinRange(aValue, bRange) &&
    !a.isPoint &&
    !b.isPoint &&
    !isSelfBoundAndShouldRouteExternal
) {
    const subtracted = subtractRange(aCrossRange, bCrossRange)
    switch (subtracted.length) {
        case 0:
            return null  // edge completely blocked
        case 1:
            isPartial = subtracted[0] !== aCrossRange
            aCrossRange = subtracted[0]
            break
        case 2:
            isPartial = true
            aCrossRange = rangeSize(subtracted[0]) > rangeSize(subtracted[1])
                ? subtracted[0] : subtracted[1]
            break
    }
}
```

Range subtraction works like this:
- If shape B is completely inside shape A's range: return two ranges (left and right of B)
- If B is completely outside A's range: return A unchanged
- If B fully contains A's range: return empty array (completely blocked)
- If B overlaps A on one side: return the remaining range

When a shape blocks part of an edge, we route through the largest remaining gap. When a shape blocks an edge completely, that edge combination is invalid.

## Coordinate transforms

We only implement four routing functions:
- `routeRightToLeft`
- `routeRightToTop`
- `routeRightToBottom`
- `routeRightToRight`

For the other twelve edge combinations, we transform the coordinate space. A route from top to bottom becomes a route from right to left if you rotate the coordinate system 90 degrees.

The transforms are defined in `ElbowArrowWorkingInfo.ts`:

```typescript
export const ElbowArrowTransform = {
    Identity: { x: 1, y: 1, transpose: false },
    Rotate90: { x: -1, y: 1, transpose: true },
    Rotate180: { x: -1, y: -1, transpose: false },
    Rotate270: { x: 1, y: -1, transpose: true },
    FlipX: { x: -1, y: 1, transpose: false },
    FlipY: { x: 1, y: -1, transpose: false },
}
```

Each edge pair maps to a transform and a route function:

```typescript
const routes = {
    top: {
        top: [ElbowArrowTransform.Rotate270, routeRightToRight],
        left: [ElbowArrowTransform.Rotate270, routeRightToTop],
        bottom: [ElbowArrowTransform.Rotate270, routeRightToLeft],
        right: [ElbowArrowTransform.Rotate270, routeRightToBottom],
    },
    right: {
        top: [ElbowArrowTransform.Identity, routeRightToTop],
        right: [ElbowArrowTransform.Identity, routeRightToRight],
        bottom: [ElbowArrowTransform.Identity, routeRightToBottom],
        left: [ElbowArrowTransform.Identity, routeRightToLeft],
    },
    // ... bottom and left follow similar pattern
}
```

Applying a transform flips coordinates, potentially transposes x and y, and updates all relevant geometry:

```typescript
apply(transform: ElbowArrowTransform) {
    this.transform = transformElbowArrowTransform(transform, this.transform)
    this.inverse = invertElbowArrowTransform(this.transform)

    transformBoxInPlace(transform, this.A.original)
    transformBoxInPlace(transform, this.B.original)

    if (transform.x === -1) {
        this.gapX = -this.gapX
        this.midX = this.midX === null ? null : -this.midX
    }
    if (transform.y === -1) {
        this.gapY = -this.gapY
        this.midY = this.midY === null ? null : -this.midY
    }

    if (transform.transpose) {
        let temp = this.midX
        this.midX = this.midY
        this.midY = temp
    }
}
```

After routing in the transformed space, we transform the resulting path back to original coordinates.

## Route patterns

Within each routing function, there are multiple route patterns depending on shape positions. For `routeRightToLeft`, there are five distinct patterns.

**Pattern 1: Simple horizontal with midpoint**

```
┌───┐
│ A ├─┐
└───┘ │ ┌───┐
      └─► B │
        └───┘
```

When shapes are side-by-side with enough space (`gapX > 0 && midX !== null`), the arrow routes straight across with a vertical segment at the midpoint.

**Pattern 2: Around with vertical midpoint**

```
┌───┐
│ A ├─┐
└───┘ │
 ┌────┘
 │ ┌───┐
 └─► B │
   └───┘
```

When shapes overlap horizontally but have a vertical midpoint available (`midY !== null`), the arrow routes around using expanded bounds.

**Pattern 3: Around right then down**

```
┌───┐
│ A ├───┐
└───┘   │
  ┌───┐ │
┌►│ B │ │
│ └───┘ │
└───────┘
```

When the simpler routes don't work, we route around the expanded bounding box.

Each pattern has a distance metric—the Manhattan distance (sum of horizontal and vertical segments). We calculate distances for all valid patterns and pick the shortest.

The distance calculation includes a small bias:

```typescript
const arrow3Distance =
    Math.abs(aEdge.value - info.common.expanded.right) +
    Math.abs(aEdge.crossTarget - info.common.expanded.bottom) +
    Math.abs(info.common.expanded.right - bEdge.expanded) +
    Math.abs(info.common.expanded.bottom - bEdge.crossTarget) +
    info.options.expandElbowLegLength +
    6 // 6 points in this arrow
```

Routes with more points get penalized slightly. This prevents unnecessarily complex paths.

## Expanded bounds

Shapes have "expanded bounds" that arrows avoid. This is the shape's bounding box plus a margin, scaled by arrow stroke width:

```typescript
const expandedA = aTerminal.isPoint
    ? aTerminal.bounds
    : aTerminal.bounds.clone().expandBy(options.expandElbowLegLength)

// Expansion amounts from ArrowShapeUtil.tsx:
expandElbowLegLength: {
    s: 28,
    m: 36,
    l: 44,
    xl: 66,
}
```

Thicker arrows need more routing space to look proportional.

## Route selection

When both terminals have explicit edges, we try that single combination. When terminals have automatic edge selection, we use heuristics.

The primary heuristic picks edges based on gap direction:

```typescript
if (Math.abs(info.gapX) + 1 > Math.abs(info.gapY) && info.midX !== null) {
    // +1 bias towards x-axis prevents flickering at 45 degrees
    if (info.gapX > 0) {
        idealRoute = tryRouteArrow(info, 'right', 'left')
    } else {
        idealRoute = tryRouteArrow(info, 'left', 'right')
    }
}
```

If the ideal route fails (edge blocked, no valid path), we try all sixteen combinations and pick the best.

Route quality is judged by:
1. Fewest corners (points in the path)
2. Shortest Manhattan distance

There's a small increasing bias for later candidates to break ties consistently and prevent flickering when multiple routes have identical scores.

## Casting to geometry

The edge-based routing calculates paths between bounding boxes. The final step casts these paths onto actual shape geometry.

For a shape like a rounded rectangle or an arbitrary polygon, we need to find where the arrow actually intersects the shape's edge. The routing logic in `castPathSegmentIntoGeometry` does this:

```typescript
const intersections = target.geometry.intersectLineSegment(point2, target.target, {
    includeLabels: false,
    includeInternal: false,
})

// Find nearest intersection
for (const intersection of intersections) {
    const point2Distance = Vec.ManhattanDist(pointToFindClosestIntersectionTo, intersection)
    if (point2Distance < nearestDistanceToPoint2) {
        nearestDistanceToPoint2 = point2Distance
        nearestIntersectionToPoint2 = intersection
    }
}
```

We cast a line from the second path point toward the target, find all intersections with the shape's geometry, and pick the nearest. Then we nudge the endpoint away from the shape edge by the arrowhead offset (accounting for both arrow stroke and target stroke).

This means the routing algorithm works purely with rectangles, and we project the results onto actual geometry at the end.

## Edge cases

**Self-bound shapes**: When an arrow connects a shape to itself, we normally route through the shape's interior (treat it as point-to-point). But if both terminals snap to edges, we route externally as if they were different shapes.

**Tiny end nubs**: If the first or last segment is shorter than the minimum end segment length (3× stroke width), we remove it and extend the adjacent segment. This prevents awkward tiny segments near arrowheads.

**Unclosed paths**: For freehand strokes, we find the normal vector at the binding point and determine whether to route along the x-axis or y-axis based on which component is larger.

## Why this works

Edge-based routing reduces the search space from 250,000 cells to 16 edge combinations. We evaluate all 16, calculate exact blocking for each, and pick the best. This runs fast enough for real-time dragging.

The constraint—routing only between edges, not through arbitrary space—matches how people think about connectors. You don't route from the middle of a shape. You route from an edge.

This approach handles rotation naturally. Shapes block edge ranges, not grid cells. A rotated rectangle blocks exactly the edges it should.

The tradeoff: we can't route through narrow gaps between shapes that a grid-based approach might find. In practice, this doesn't matter. The routes we find are clean and intuitive.

---

Source files:
- `packages/tldraw/src/lib/shapes/arrow/elbow/getElbowArrowInfo.tsx` (881 lines)
- `packages/tldraw/src/lib/shapes/arrow/elbow/routes/elbowArrowRoutes.tsx` (404 lines)
- `packages/tldraw/src/lib/shapes/arrow/elbow/routes/ElbowArrowWorkingInfo.ts` (234 lines)
- `packages/tldraw/src/lib/shapes/arrow/elbow/routes/routeArrowWithAutoEdgePicking.tsx` (242 lines)
