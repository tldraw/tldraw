---
title: Elbow arrows
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - elbow
  - arrows
---

# Elbow arrows

When building connector routing for diagramming tools, the obvious approach is grid-based pathfinding: treat the canvas as a grid, mark obstacles, run A\* between endpoints. This works but has a fatal flaw—it doesn't scale. A typical flowchart might have 20 shapes on a 5000×5000 canvas. At 10px grid resolution, that's 250,000 cells to search through. The algorithm works but feels sluggish, especially as you drag shapes around and routes need to recalculate in real-time.

Elbow arrows are orthogonal connectors that travel horizontally and vertically, making right-angle turns between shapes. Instead of pathfinding through a grid, we route directly from edge to edge using coordinate transformations to eliminate code duplication. The result is faster than A\*, requires no grid discretization, and handles arbitrary rotations without special cases.

## Edge-based routing instead of grids

The core insight: connectors don't route through arbitrary space—they route from one shape edge to another shape edge. Each terminal (start or end) can exit from one of four edges: top, right, bottom, or left. That's 16 possible edge combinations.

For each edge, we calculate whether it's actually usable. An edge might be blocked if the other shape sits directly in front of it:

```typescript
// An edge is blocked when it falls within the other shape's range
if (isWithinRange(aEdgeValue, bRange) && !a.isPoint && !b.isPoint) {
	const subtracted = subtractRange(aCrossRange, bCrossRange)
	// If subtraction leaves nothing, this edge is unusable
}
```

When an edge is partially blocked, we shrink its usable range. When fully blocked, we mark it null and skip that direction entirely. No grid, no flood fill—just geometric range checking.

This approach generalizes beyond diagramming. Any system routing between bounded regions (network topology visualization, circuit design tools, subway map generators) benefits from edge-based routing when you know the connectivity upfront. It trades pathfinding flexibility for direct geometric computation, which is exactly what you want when shapes have clear edges and you're optimizing for interactive performance.

## Four routes, not sixteen

Now the problem: we need routing logic for 16 edge combinations (left-to-right, left-to-top, right-to-bottom, etc.). Writing 16 separate functions means duplicating logic and creating maintenance hell. Any bug fix or optimization needs updating in 16 places.

The solution is coordinate space transformation. We only implement four route functions:

- `routeRightToLeft`
- `routeRightToTop`
- `routeRightToBottom`
- `routeRightToRight`

Every other combination transforms the problem into one of these four canonical cases, routes in that normalized space, then transforms back:

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

Need to route left-to-right? That's just right-to-left with a horizontal flip (`FlipX`). Bottom-to-left? Rotate the coordinate space 90 degrees, route, then rotate back. These transforms are cheap—just coordinate sign flips and axis swaps—and they collapse 16 routing functions into 4.

This pattern shows up everywhere in computational geometry. Normalizing to a canonical orientation before processing eliminates combinatorial explosion. Graphics libraries do this for text rendering (normalize rotation to 0°, render, transform back). Collision detection does it for rotated rectangles (transform to axis-aligned boxes, check overlap, transform intersection points back). The key is identifying which cases are truly different versus which are rotational variants of each other.

## Why this beats A\*

A\* through a grid has three problems that edge-based routing solves:

**Resolution tradeoffs.** Fine grids are expensive to search. Coarse grids produce blocky, awkward routes. Edge-based routing has no grid—routes are continuous and precise without discretization artifacts.

**Recalculation cost.** Dragging a shape means invalidating grid cells and recomputing paths. Edge-based routing only recalculates geometric ranges, which is faster than pathfinding.

**Rotated shapes.** Grid-based approaches struggle with arbitrary rotations—you either rotate the grid (expensive) or accept that rotated shapes don't align properly. Edge-based routing works in each shape's local coordinate space and transforms as needed.

The downside: edge-based routing can't navigate arbitrary mazes of obstacles. If your shapes overlap significantly or you need paths that wind through complex arrangements, A\* wins. But for typical diagramming scenarios with spaced-out shapes, direct geometric routing is both faster and produces cleaner results.

## Route selection with Manhattan distance

Each route function doesn't produce one path—it produces several candidates for different configurations. For example, `routeRightToLeft` handles five distinct arrow patterns depending on shape positions:

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

The algorithm computes a distance metric for each valid pattern and picks the shortest. Distance is measured in Manhattan distance (sum of horizontal and vertical segments), which directly corresponds to visual path length for orthogonal connectors.

When routes have equal distances, a bias vector breaks ties—we prefer down and right to prevent flickering when dragging arrows near 45-degree angles. Without this bias, small mouse movements could cause routes to oscillate between equivalent alternatives, which feels broken.

This heuristic approach is faster than optimal pathfinding because we're evaluating a handful of pre-designed patterns rather than searching a graph. It works because orthogonal connectors have limited route topologies—there are only so many sensible ways to connect two edges with right-angle segments.

## Expanded bounds for visual padding

Arrows shouldn't hug shapes too closely—arrowheads overlap edges and the whole thing looks cramped. We solve this by expanding each shape's bounding box before routing:

```typescript
const expandedA = aTerminal.isPoint
	? aTerminal.bounds
	: aTerminal.bounds.clone().expandBy(options.expandElbowLegLength)
```

The expansion amount scales with arrow stroke width. Routes are computed against these expanded bounds, automatically ensuring adequate spacing without special cases in the routing logic.

This "expand bounds for spacing" technique is useful anytime you need geometric operations with margins—UI layout engines do this for padding, 3D rendering does it for shadow volumes, and robotics path planning expands obstacles for collision avoidance. Expanding geometry simplifies the core algorithm by moving spacing concerns to a preprocessing step.

## Casting into actual geometry

Route computation works with bounding boxes, not precise shape geometry. A rotated rectangle or star shape extends beyond its apparent edges. After finding a route, we "cast" the final segments into the actual geometry:

```typescript
const intersections = target.geometry.intersectLineSegment(point2, target.target, {
	includeLabels: false,
	includeInternal: false,
})
```

We find where the route segment actually intersects the shape, then back off by the arrowhead offset so the arrowhead sits cleanly outside. This two-phase approach—route to bounds, then refine to geometry—keeps the routing logic simple while still producing precise visual results.

Games and graphics applications use this pattern for level-of-detail: coarse geometry for physics/collision, detailed geometry for rendering. The key is making the coarse representation conservative (bounding boxes that fully contain the shape) so the refinement step always finds valid intersections.

## Handling edge cases

Real-world usage immediately surfaces scenarios the core algorithm doesn't handle:

**Freehand strokes.** Open paths don't have clear "edges" to exit from. For these, we find the point on the geometry closest to the binding target, calculate the tangent line at that point, and use the tangent's normal to determine exit direction:

```typescript
const normal = next.sub(prev).per().uni()
const axis = Math.abs(normal.x) > Math.abs(normal.y) ? ElbowArrowAxes.x : ElbowArrowAxes.y
```

**Self-bound shapes.** When an arrow connects a shape to itself, default routing would go through the shape interior. If both terminals specifically snap to edges, we route externally instead:

```typescript
const isSelfBoundAndShouldRouteExternal =
	a.targetShapeId === b.targetShapeId &&
	a.targetShapeId !== null &&
	(a.snap === 'edge' || a.snap === 'edge-point') &&
	(b.snap === 'edge' || b.snap === 'edge-point')
```

**Tiny end nubs.** Routes sometimes end with very short L-shaped segments that make arrowheads look awkward. We detect these and remove them, adjusting adjacent points to maintain straight lines.

These aren't design flaws—they're inevitable consequences of users creating configurations the algorithm designer didn't anticipate. The lesson: reserve 30% of your implementation budget for edge cases discovered during real usage.

## Takeaways

Edge-based routing shows that understanding your problem domain can eliminate entire categories of complexity. Grid-based pathfinding is the general solution, but diagramming tools have constraints (shapes have edges, connections are orthogonal) that enable simpler approaches.

The coordinate transformation pattern—normalize to canonical cases, process, transform back—cuts implementation cost dramatically. Anytime you're duplicating logic for rotational variants, ask if transforms can collapse the cases.

Working in expanded/simplified geometry then refining to precise geometry is faster than handling all edge cases upfront. Physics engines, graphics pipelines, and now connector routing all benefit from this two-phase approach.

## Key files

- `packages/tldraw/src/lib/shapes/arrow/elbow/getElbowArrowInfo.tsx` — Main routing algorithm
- `packages/tldraw/src/lib/shapes/arrow/elbow/routes/elbowArrowRoutes.tsx` — Route functions for all 4 primary directions
- `packages/tldraw/src/lib/shapes/arrow/elbow/routes/ElbowArrowWorkingInfo.ts` — Transform handling for rotations/flips
- `packages/tldraw/src/lib/shapes/arrow/elbow/routes/routeArrowWithAutoEdgePicking.tsx` — Edge selection and route picking
- `packages/tldraw/src/lib/shapes/arrow/elbow/definitions.ts` — Type definitions for routes, edges, terminals
