---
title: SVG paths from hand-drawn points
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - freehand
  - ink
status: published
date: 12/21/2025
order: 4
---

# SVG paths from hand-drawn points

When you draw freehand in tldraw, your pointer generates a stream of points at whatever rate your device samples—maybe 60 points per second on a trackpad, or hundreds on a pressure-sensitive stylus. These raw points aren't a path you can render. Connect them with straight lines and you get a jagged mess that looks nothing like the smooth stroke you intended. Converting raw input to a fluid curve is a classic graphics problem, and tldraw's solution is elegant in its simplicity.

## The averaging trick

The key insight is that SVG's quadratic Bézier curves (`Q`) can be chained smoothly if each curve ends where the next one begins—and that midpoint can be the average of two consecutive input points. By placing control points at the original input locations and endpoints at the midpoints between them, curves flow into each other automatically.

```typescript
// packages/editor/src/lib/primitives/utils.ts
export function average(A: VecLike, B: VecLike) {
	return `${toDomPrecision((A.x + B.x) / 2)},${toDomPrecision((A.y + B.y) / 2)} `
}
```

Given points A, B, and C, we draw a quadratic curve from the midpoint of A-B to the midpoint of B-C, using B as the control point. The curve passes through the control point's vicinity without actually touching it, creating natural smoothing.

## The T command shorthand

SVG provides a convenient shorthand: the `T` command draws a "smooth quadratic" by inferring the control point from the previous curve. If your last `Q` curve ended with a control point at B, then `T` reflects that control point across the current position to maintain tangent continuity. This lets us chain many curves together with just endpoint coordinates:

```typescript
// packages/editor/src/lib/utils/getSvgPathFromPoints.ts
for (let i = 2, max = len - 1; i < max; i++) {
	a = points[i]
	b = points[i + 1]
	result += average(a, b)
}

// The full path for an open stroke:
return `M${precise(points[0])}Q${precise(points[1])}${average(points[1], points[2])}${
	points.length > 3 ? 'T' : ''
}${result}L${precise(points[len - 1])}`
```

The path starts with a `M`ove to the first point, then a `Q`uadratic curve using the second point as control and the midpoint between points 1 and 2 as the endpoint. After that, it's all `T` commands—just a chain of averaged midpoints. The browser infers all the control points automatically.

## Starting and ending gracefully

Open and closed paths need different treatment at their boundaries.

For **open paths**, the stroke begins at the actual first point (not a midpoint) so the line starts exactly where the user put their pointer down. It ends with a straight `L`ine segment to the final point, since there's no next point to average with. This ensures the stroke reaches its intended destination rather than stopping short at the last midpoint.

For **closed paths** like shapes and fills, the stroke needs to loop back seamlessly:

```typescript
if (closed) {
	return `M${average(points[0], points[1])}Q${precise(points[1])}${average(
		points[1],
		points[2]
	)}T${result}${average(points[len - 1], points[0])}${average(points[0], points[1])}Z`
}
```

A closed path starts at the midpoint between the first two points, curves through all the subsequent midpoints, then continues through the midpoint of the last and first points, and finally returns to its starting midpoint. The `Z` command closes the path. Because we started and ended at the same calculated midpoint, the closure is perfectly smooth.

## Edge cases

With only two points, there's nothing to smooth—just draw a line:

```typescript
if (len === 2) {
	return `M${precise(a)}L${precise(b)}`
}
```

With fewer than two points, return an empty string. A single point isn't a path.

## Why quadratic, not cubic?

Cubic Bézier curves (`C`) offer more control with two control points per segment, but they're overkill here. The averaging algorithm naturally produces smooth transitions with quadratics, and the simpler math is faster. When you're rendering dozens of shapes with hundreds of points each, those micro-optimizations add up.

## Relationship to perfect-freehand

This algorithm converts points to paths, but tldraw's freehand strokes involve another layer: the perfect-freehand library (now bundled into tldraw) that simulates pressure-sensitive ink. Perfect-freehand takes raw input points and produces _outline_ points—the boundary of a variable-width stroke. Those outline points form a closed polygon representing the filled stroke shape.

Both systems use the same `average` and `precise` helpers and the same quadratic smoothing technique. The editor's `getSvgPathFromPoints` handles simple polylines (like scribbles), while the tldraw package's `getSvgPathFromStrokePoints` handles the richer stroke data with pressure information. Same algorithm, different data structures.

## Performance in practice

The algorithm is linear in the number of points—one string concatenation per point. String concatenation in JavaScript is highly optimized, and the resulting path string is parsed once by the browser's SVG engine. For typical strokes (tens to hundreds of points), this runs in microseconds. The real performance cost is in the SVG rendering itself, not the path generation.

## Key files

- `packages/editor/src/lib/utils/getSvgPathFromPoints.ts` — Point array to SVG path conversion
- `packages/editor/src/lib/primitives/utils.ts` — The `average` and `precise` helpers
- `packages/tldraw/src/lib/shapes/shared/freehand/svg.ts` — Variant for stroke points with pressure data
- `packages/editor/src/lib/components/default-components/DefaultScribble.tsx` — Usage in scribble rendering
