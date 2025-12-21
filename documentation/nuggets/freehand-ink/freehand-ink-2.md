---
title: Quadratic curves and the T command optimization
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - freehand
  - SVG
  - bezier
---

# SVG paths from hand-drawn points

When we convert raw pointer input to smooth SVG paths, we use quadratic Bezier curves chained together with the `T` command. This choice saves enormous amounts of path data while keeping the math simple and the curves smooth.

## Quadratic vs cubic

The obvious choice for smooth curves is cubic Bezier curves—they're more powerful, with two control points per segment instead of one. But for our use case, quadratic curves are sufficient, and they unlock a major optimization.

With cubic curves (`C` command), you specify two control points and an endpoint for each segment:

```
M10,10 C15,5 25,5 30,10 C35,15 45,15 50,10
```

For a path with 100 points, you're writing `(2 + 2) * 100 = 400` coordinate pairs—two control points plus an endpoint for each segment after the first.

With quadratic curves (`Q` command), you specify one control point and an endpoint:

```
M10,10 Q15,5 20,10 Q25,15 30,10 Q35,5 40,10
```

Already smaller—`(1 + 1) * 100 = 200` coordinate pairs. But quadratic curves have a secret weapon: the `T` command.

## The T command trick

SVG's `T` command is "smooth quadratic curve to." It assumes the previous command was `Q` or `T`, reflects the previous control point across the current position, and draws a curve to the specified endpoint. You only write the endpoint—the browser calculates the control point automatically.

This means we can write:

```
M10,10 Q15,5 20,10 T30,10 T40,10 T50,10
```

Now we're down to just one coordinate pair per segment after the first two points. For a 100-point path, that's `2 + 2 + (100 - 2) = 102` coordinate pairs instead of 400 (cubic) or 200 (plain quadratic).

The path string for a typical 50-point stroke drops from ~2KB to ~500 bytes. For hundreds of draw shapes on screen, this matters.

## Why it works for smoothing

We use the averaging trick: place endpoints at the midpoint between consecutive input points, and use the actual input points as control points.

For three consecutive points A, B, C:

- Control point: B (the raw input point)
- Endpoint: midpoint of B and C

The quadratic curve naturally flows into the next segment because they meet at the shared midpoint. When we chain these with `T`, the browser reflects each control point automatically, maintaining smooth tangent continuity throughout the path.

Here's the core of the implementation:

```typescript
// Start with first point, first curve with explicit control point
let result = `M${precise(points[0])}Q${precise(points[1])}${average(points[1], points[2])}`

// Chain remaining curves with T command
if (points.length > 3) {
	result += 'T'
	for (let i = 2; i < points.length - 1; i++) {
		result += average(points[i], points[i + 1])
	}
}

// End with line to last point
result += `L${precise(points[points.length - 1])}`
```

The `average` function returns a formatted midpoint string:

```typescript
function average(A: VecLike, B: VecLike) {
	return `${toDomPrecision((A.x + B.x) / 2)},${toDomPrecision((A.y + B.y) / 2)} `
}
```

We also round coordinates to 4 decimal places (`toDomPrecision`). DOM rendering doesn't benefit from higher precision, and it shaves more bytes off the path string.

## What we gave up

Cubic curves could produce slightly smoother results in theory. In practice, the difference is imperceptible for hand-drawn strokes, where the input itself is imperfect and the averaging trick provides plenty of smoothness.

Cubic curves also don't have a `T` equivalent—the `S` command exists for smooth cubic curves, but it still requires writing one control point and the endpoint. You can't get down to just endpoints.

Simpler math, smaller path strings, and imperceptible visual difference. Quadratic curves win.

## Where this lives

The core algorithm is in `/packages/editor/src/lib/utils/getSvgPathFromPoints.ts`. A variant for pressure-sensitive strokes (which processes outline points rather than centerline points) lives in `/packages/tldraw/src/lib/shapes/shared/freehand/svg.ts`, using the same quadratic smoothing approach.

For scribbles—temporary overlays like brush selection or laser pointer—we use the simple centerline version with `closed: false`. For draw shapes with variable width, we run the outline points through the same algorithm to get smooth boundaries.

The T command optimization makes these paths fast to generate, small to store, and quick for browsers to parse. That's worth more than the theoretical smoothness gains from cubic curves.
