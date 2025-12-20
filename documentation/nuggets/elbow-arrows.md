# Elbow arrows

Elbow arrows are orthogonal connectors—arrows that travel only horizontally and vertically, making right-angle turns between shapes. Unlike arc arrows that curve smoothly, elbow arrows create the kind of clean, diagram-style connections you'd see in flowcharts or architecture diagrams. Getting them to route nicely around shapes while handling all the edge cases turned out to be surprisingly complex.

## The routing problem

The core challenge: given two shapes (or points), find a path of horizontal and vertical segments that connects them without looking terrible. The path should avoid overlapping with shapes, make a reasonable number of turns, and handle all the weird configurations users might create—overlapping shapes, rotated shapes, shapes bound to themselves, freehand strokes, and more.

The naive approach—always go right then down—fails immediately when shapes overlap or when the "obvious" path would cut through a shape. The algorithm needs to consider multiple possible routes and pick the best one.

## Edge-based routing

Elbow arrows route from edge to edge. Each terminal (start or end) can exit from one of four edges: top, right, bottom, or left. This gives us 16 possible edge combinations to handle.

For each terminal, we compute which edges are actually usable. An edge might be blocked if the other shape is directly in front of it:

```typescript
// An edge is blocked when it falls within the other shape's range
if (isWithinRange(aEdgeValue, bRange) && !a.isPoint && !b.isPoint) {
  const subtracted = subtractRange(aCrossRange, bCrossRange)
  // If subtraction leaves nothing, this edge is unusable
}
```

When an edge is partially blocked, we shrink its usable range. When it's fully blocked, we mark it null and the routing algorithm won't consider that direction.

## Four routes, not sixteen

Rather than implementing 16 separate route functions (one per edge combination), we use a transform system. The code only implements four route functions:

- `routeRightToLeft`
- `routeRightToTop`
- `routeRightToBottom`
- `routeRightToRight`

All other combinations are handled by applying transforms—flips and transpositions—before routing, then inverting them after:

```typescript
const ElbowArrowTransform = {
  Identity: { x: 1, y: 1, transpose: false },
  Rotate90: { x: -1, y: 1, transpose: true },
  Rotate180: { x: -1, y: -1, transpose: false },
  Rotate270: { x: 1, y: -1, transpose: true },
  FlipX: { x: -1, y: 1, transpose: false },
  FlipY: { x: 1, y: -1, transpose: false },
}
```

This approach dramatically reduces code duplication. The transforms are cheap—just coordinate sign flips and axis swaps—and the routing logic only needs to be written once.

## Route selection

Each route function doesn't produce one path; it produces several candidates for different configurations. For example, `routeRightToLeft` handles five arrow patterns:

```
1:              2:         3:          4:          5:
┌───┐           ┌───┐      ┌───┐       ┌───────┐   ┌───────┐ ┌───┐
│ A ├─┐         │ A ├─┐    │ A ├───┐   │ ┌───┐ │   │ ┌───┐ │ │ A ├─┐
└───┘ │ ┌───┐   └───┘ │    └───┘   │   │ │ A ├─┘   └─► B │ │ └───┘ │
      └─► B │    ┌────┘      ┌───┐ │   │ └───┘       └───┘ └───────┘
        └───┘    │ ┌───┐   ┌►│ B │ │   │   ┌───┐
                 └─► B │   │ └───┘ │   └───► B │
                   └───┘   └───────┘       └───┘
```

The algorithm computes a distance metric for each valid pattern and picks the shortest one. Distance is measured in Manhattan distance (sum of horizontal and vertical components), which matches how the paths are actually drawn.

When routes have equal distances, a bias vector breaks ties—preferring down and right to prevent flickering when dragging arrows near 45-degree angles.

## The midpoint handle

Users can drag a midpoint handle to control where the arrow "turns." This is implemented by computing a valid range for the midpoint line based on the gap between shapes:

```typescript
if (gapX > minLegDistanceNeeded) {
  mxRange = {
    a: aTerminal.isPoint ? aTerminal.bounds.maxX + aMinLength : expandedA.maxX,
    b: bTerminal.isPoint ? bTerminal.bounds.minX - bMinLength : expandedB.minX,
  }
}
```

The `elbowMidPoint` property (default 0.5) interpolates within this range. When shapes swap order internally during routing, the midpoint is inverted so dragging it still feels consistent.

## Expanded bounds

Arrows shouldn't hug shapes too closely—it looks cramped and arrowheads can overlap with shape edges. We solve this by expanding each shape's bounding box before routing:

```typescript
const expandedA = aTerminal.isPoint
  ? aTerminal.bounds
  : aTerminal.bounds.clone().expandBy(options.expandElbowLegLength)
```

The expansion amount scales with arrow size. Routes are computed against these expanded bounds, ensuring adequate spacing.

## Casting into geometry

Route computation works with bounding boxes, not actual shape geometry. A rotated rectangle or star shape extends beyond its apparent edges. After finding a route, we "cast" the final segments into the actual geometry:

```typescript
const intersections = target.geometry.intersectLineSegment(point2, target.target, {
  includeLabels: false,
  includeInternal: false,
})
```

We find where the route segment actually intersects the shape, then back off by the arrowhead offset so the arrowhead sits cleanly outside the shape.

## Open shapes need special handling

Freehand strokes and other open paths don't have a clear "inside" or edges to exit from. The algorithm handles these differently:

1. Find the point on the geometry closest to the binding target
2. Calculate the tangent line at that point
3. Use the tangent's normal to determine exit direction
4. If needed, treat the terminal as a point rather than a bounding box

```typescript
const normal = next.sub(prev).per().uni()
const axis = Math.abs(normal.x) > Math.abs(normal.y) ? ElbowArrowAxes.x : ElbowArrowAxes.y
```

This ensures arrows exit perpendicular to freehand strokes rather than awkwardly parallel.

## Self-bound shapes

When an arrow connects a shape to itself, routing gets weird. By default, this would route internally—effectively a point-to-point arrow inside the shape. But when both terminals specifically snap to edges, we route externally instead:

```typescript
const isSelfBoundAndShouldRouteExternal =
  a.targetShapeId === b.targetShapeId &&
  a.targetShapeId !== null &&
  (a.snap === 'edge' || a.snap === 'edge-point') &&
  (b.snap === 'edge' || b.snap === 'edge-point')
```

## Fixing tiny nubs

Sometimes routes end with very short L-shaped segments—tiny nubs that make arrowheads look janky. We detect these and remove them:

```typescript
if (firstSegmentLength < aTerminal.minEndSegmentLength) {
  route.points.splice(1, 1)
  if (route.points.length >= 3) {
    const matchAxis = approximately(a.x, b.x) ? 'y' : 'x'
    route.points[1][matchAxis] = a[matchAxis]
  }
}
```

The adjacent point is adjusted to maintain a straight line, cleaning up the visual result.

## Key files

- `packages/tldraw/src/lib/shapes/arrow/elbow/getElbowArrowInfo.tsx` — Main routing algorithm
- `packages/tldraw/src/lib/shapes/arrow/elbow/routes/elbowArrowRoutes.tsx` — Route functions for all 4 primary directions
- `packages/tldraw/src/lib/shapes/arrow/elbow/routes/ElbowArrowWorkingInfo.ts` — Transform handling for rotations/flips
- `packages/tldraw/src/lib/shapes/arrow/elbow/routes/routeArrowWithAutoEdgePicking.tsx` — Edge selection and route picking
- `packages/tldraw/src/lib/shapes/arrow/elbow/definitions.ts` — Type definitions for routes, edges, terminals
