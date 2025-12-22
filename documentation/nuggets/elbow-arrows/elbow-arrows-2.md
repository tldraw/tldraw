---
title: Coordinate transformation for route normalization
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - elbow
  - arrows
  - routing
status: published
date: 12/21/2025
order: 1
---

# Elbow arrows

When we built elbow arrow routing, the straightforward approach would have been to write a routing function for each combination of edge directions. With 4 possible edges on each shape (top, right, bottom, left), that's 16 different cases to handle.

We implemented 4 functions instead. The trick is a coordinate transformation system that normalizes the problem space—any edge combination can be rotated into one of the 4 base cases, solved, then rotated back.

## The base cases

We only implement these route functions:

- `routeRightToLeft` — Shapes side by side, arrow flows horizontally
- `routeRightToTop` — Right edge to top edge
- `routeRightToBottom` — Right edge to bottom edge
- `routeRightToRight` — Both on right edges, wrapping around

That's it. Every other combination maps to one of these through coordinate transforms.

## Transform definitions

Each transform is defined by three values:

```typescript
export const ElbowArrowTransform = {
	Identity: { x: 1, y: 1, transpose: false },
	Rotate90: { x: -1, y: 1, transpose: true },
	Rotate180: { x: -1, y: -1, transpose: false },
	Rotate270: { x: 1, y: -1, transpose: true },
}
```

The `x` and `y` values control mirroring (-1 flips that axis), while `transpose` swaps x and y coordinates. Together these operations rotate the coordinate space in 90-degree increments.

## Mapping edges to transforms

Here's how we route from a top edge to a left edge:

```typescript
const routes = {
	top: {
		left: [ElbowArrowTransform.Rotate270, routeRightToTop],
		// ... other combinations
	},
	// ... other starting edges
}
```

The system rotates the coordinate space by 270 degrees, which transforms "top to left" into "right to top"—one of our base cases. We run `routeRightToTop` in the rotated space, then apply the inverse transform to get the actual route.

## Applying transforms

When we apply a transform to the working state, we transform all geometry:

```typescript
apply(transform: ElbowArrowTransform) {
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

The bounding boxes rotate. Distance metrics flip sign when axes mirror. Midpoint handles swap x and y values when the coordinate space transposes.

## Why this matters

Without transforms, we'd need 16 separate routing functions. Each would handle the same patterns—wrapping around shapes, finding midpoints, checking for blocked edges—but with different coordinate math. A bug fix would need to propagate across all 16.

With transforms, we fix a bug once. The rotation ensures every edge combination gets the same routing logic, just in a different coordinate frame.

## The inverse transform

After routing in the transformed space, we apply the inverse transform to get world coordinates:

```typescript
this.inverse = invertElbowArrowTransform(this.transform)
```

The route comes out as a sequence of points. Apply the inverse, and those points map back to the correct positions for the actual edge directions we started with.

## Where this lives

The transform definitions are in `packages/tldraw/src/lib/shapes/arrow/elbow/routes/ElbowArrowWorkingInfo.ts`. The route mapping table is in `packages/tldraw/src/lib/shapes/arrow/elbow/routes/elbowArrowRoutes.tsx`. The four base routing functions live in the same file, implementing the actual pathfinding logic.

This pattern shows up elsewhere in the codebase whenever we can reduce complexity by choosing a canonical orientation. The arrow rendering code does something similar—normalize the geometry, solve the simpler problem, transform back.
