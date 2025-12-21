---
title: The averaging algorithm for smooth curves
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - freehand
  - SVG
  - bezier
readability: 8
voice: 7
potential: 8
accuracy: 9
notes: "Clear algorithm explanation with verified code. Opening uses 'you' instead of 'we' - should start with our experience per VOICE.md. 'Breaking this down:' feels tutorial-like."
---

# SVG paths from hand-drawn points

When you draw on the tldraw canvas, your pointer generates discrete points—60 Hz from a trackpad, 100+ Hz from a stylus. Connect these points with straight line segments and you get jagged, unappealing strokes. We need smooth curves that preserve the gesture's natural flow.

The trick is surprisingly simple: place curve endpoints at the midpoint between consecutive input points, using the original points as control points. This produces quadratic Bézier curves that flow naturally into each other, and it's the mathematical heart of tldraw's smoothing system.

## The averaging algorithm

For three consecutive input points A, B, and C:

- Start point: midpoint of A and B
- Control point: B (the actual input point)
- End point: midpoint of B and C

The quadratic curve from `mid(A,B)` to `mid(B,C)` with control point B automatically flows into the next curve because the curves meet at their shared endpoint. There's no tangent calculation needed—the geometry handles continuity naturally.

Here's what the core helper looks like:

```typescript
export function average(A: VecLike, B: VecLike) {
	return `${toDomPrecision((A.x + B.x) / 2)},${toDomPrecision((A.y + B.y) / 2)} `
}
```

This function returns a formatted midpoint string ready for SVG path commands. The `toDomPrecision` helper rounds to four decimal places—DOM rendering doesn't benefit from higher precision, and this keeps path strings smaller.

## Building the path

The path generation starts simple. For less than two points, return an empty string. For exactly two points, draw a straight line:

```typescript
if (len === 2) {
	return `M${precise(a)}L${precise(b)}`
}
```

For three or more points, we build a chain of quadratic curves. The SVG `T` command (smooth quadratic) reflects the previous control point across the current position to maintain tangent continuity. This means we only need to specify endpoints—the browser infers all intermediate control points automatically.

Open paths (like selection brushes) start and end at the actual input points. The user placed the pointer at specific start and end locations, so we honor those exactly. Only the intermediate section gets smoothed:

```typescript
return `M${precise(points[0])}Q${precise(points[1])}${average(points[1], points[2])}${
	points.length > 3 ? 'T' : ''
}${result}L${precise(points[len - 1])}`
```

Breaking this down:

- `M${precise(points[0])}` — Move to the first point exactly
- `Q${precise(points[1])}` — Start a quadratic curve with points[1] as control
- `${average(points[1], points[2])}` — End at the midpoint between points 1 and 2
- `${points.length > 3 ? 'T' : ''}` — Add T command only if there are 4+ points
- `${result}` — Chain of averaged midpoints for all remaining segments
- `L${precise(points[len - 1])}` — Line to the last point exactly

Closed paths (like completed shapes) work differently. There's no meaningful "start" or "end" in a closed loop, so we start and end at midpoints to ensure smooth closure:

```typescript
return `M${average(points[0], points[1])}Q${precise(points[1])}${average(
	points[1],
	points[2]
)}T${result}${average(points[len - 1], points[0])}${average(points[0], points[1])}Z`
```

The loop wraps seamlessly because the start and end positions are the same calculated midpoint.

## Why quadratic instead of cubic?

Cubic Bézier curves (`C` command) use two control points per segment, offering more control but requiring more computation and longer path strings. For smoothing discrete point samples, quadratic curves provide sufficient quality with better performance.

More importantly, quadratic curves have a natural advantage for this approach: the `T` command enables extreme compression. With cubic curves, you'd need to manually calculate and specify both control points for each segment. With quadratic curves and the averaging technique, the browser handles all intermediate control points automatically. You just provide endpoints.

A typical stroke might have 50-200 points. The difference between specifying every control point and just specifying endpoints adds up quickly, both in computation time and path string size.

## Where this lives

The core algorithm lives in `/packages/editor/src/lib/utils/getSvgPathFromPoints.ts`. It's used for scribbles (brush selection, laser pointer), simple polylines, and preview paths during drawing.

For pressure-sensitive strokes like draw shapes, there's a variant at `/packages/tldraw/src/lib/shapes/shared/freehand/svg.ts` that handles `StrokePoint` structures. The smoothing algorithm is identical—the only difference is that pressure-sensitive points wrap the actual Vec in a `.point` property.

The averaging approach isn't unique to tldraw, but it's a nice example of finding the simplest solution that works. Place endpoints between input points, use input points as control points, and let the geometry handle the rest.
