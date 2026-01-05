---
title: Perfect dash patterns
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - perfect
  - dash
  - patterns
status: published
date: 12/21/2025
order: 4
---

# Perfect dash patterns

When we added dashed lines to tldraw, we wanted them to look right—complete dashes at both ends, even spacing, corners that line up on rectangles. SVG's `stroke-dasharray` doesn't do this. The browser just tiles your pattern until it runs out of path.

Set `stroke-dasharray: 4 4` on a 100-pixel line and you get 12.5 repetitions—twelve complete dash-gap cycles, then half a dash that cuts off mid-stroke. It's subtle, but it makes shapes look mechanical rather than designed.

You can't fix this by tweaking the dash length. You need complete cycles that exactly fill the path, and closed shapes need the pattern to meet where the path closes. So we wrote `getPerfectDashProps` to figure this out automatically.

## Working backwards

The trick is counterintuitive: instead of specifying a dash length and seeing how many fit, you calculate how many dashes _should_ fit, then adjust lengths to fill the space exactly.

Start with a target dash length (usually a multiple of stroke width), then figure out how many complete cycles fit:

```typescript
// Desired dash length based on stroke width
let dashLength = strokeWidth * 2

// How many complete cycles fit?
let dashCount = Math.floor(totalLength / dashLength / 2)

// Recalculate dash length to exactly fill the space
dashLength = totalLength / dashCount / 2
```

Then calculate gaps to fill what's left:

```typescript
if (closed) {
	gapLength = (totalLength - dashCount * dashLength) / dashCount
} else {
	gapLength = (totalLength - dashCount * dashLength) / (dashCount - 1)
}
```

Open paths have one fewer gap than dashes—the endpoints don't need gaps beyond them. Closed paths have equal numbers since the pattern wraps around.

## Endpoints and corners

For open paths, you want dashes at both endpoints, not gaps. We fake this by treating the path as slightly longer than it actually is:

```typescript
// Virtually extend the path so dashes appear at endpoints
totalLength += dashLength / 2 // at start
totalLength += dashLength / 2 // at end

// Offset the pattern to center it
strokeDashoffset = dashLength / 2
```

For closed shapes like rectangles, the pattern has to meet where the path closes. A half-dash offset centers the pattern on the closure point, hiding the seam:

```typescript
if (closed) {
	strokeDashoffset = dashLength / 2
}
```

## Short paths

Very short paths are tricky. If the math says "fit 1.5 dashes," what do you actually render?

```typescript
if (dashCount < 3) {
	if (totalLength / strokeWidth < 4) {
		// Very short—just make it solid
		return solid line
	} else {
		// Short but not tiny—force three segments: dash, gap, dash
		dashLength = totalLength / 3
		gapLength = totalLength / 3
	}
}
```

A tiny line becomes solid. A short line gets a minimal dash pattern. Either way, the result looks intentional rather than broken.

Dotted lines use the same approach with a twist: the "dash" is nearly invisible (1/100th of stroke width) and rendered with `stroke-linecap: round` to create circles. We just calculate gap lengths to space the dots evenly.

## In practice

`getPerfectDashProps` also handles terminal styles (outset, skip, none), alignment snapping for parallel lines, and dotted vs dashed rendering. The core idea stays the same—work backwards from how many cycles should fit, then adjust lengths to match.

`PathBuilder` applies this to complex shapes by treating each edge separately. A rectangle's four sides each get their own dash calculation rather than flowing the pattern around corners.

The cost is computational—we're calculating lengths and offsets for every dashed path at render time. But shapes end up looking designed rather than mechanically generated, and for a drawing tool, that's worth it.
