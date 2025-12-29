---
title: Perfect dash patterns
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - dash
  - pattern
  - SVG
status: published
date: 12/21/2025
order: 1
---

# Perfect dash patterns

The tldraw SDK is all about making the little details work. If you've ever used dashed lines in tldraw, you might have noticed that the dashes always line up with the corners of your shape, the handles of a spline, or the start and end of an arrow. While this might seem like the obvious way that dashes _should_ work, you might be surprised to learn that SVG offers no such feature. We implement these perfect dashes entirely ourselves.

Here's how it works.

## The problem

SVG's `stroke-dasharray` just tiles a pattern until it runs out of path. If you have a 100px line and set `stroke-dasharray: 4 4`, you get 12.5 complete dash-gap pairs and one incomplete dash at the end. It looks mechanical and wrong.

We want complete dashes at the endpoints of open paths. That means working backwards from the total length, figuring out how many complete dashes should fit, then adjusting the dash and gap lengths to divide evenly.

## Terminal handling

For open paths, we control what appears at each end using terminal modes. There are three options: `outset`, `skip`, and `none`.

### Outset

The `outset` mode extends the virtual path length by half a dash. This ensures a complete dash appears at the endpoint.

```typescript
if (start === 'outset') {
	totalLength += dashLength / 2
	strokeDashoffset += dashLength / 2
}

if (end === 'outset') {
	totalLength += dashLength / 2
}
```

We add half a dash length to both the total path length and the stroke offset. The offset shifts the pattern so that the virtual extension beyond the actual path start contains half a dash, which means the visible path begins with a complete dash.

This is the default for both ends of an open path, and it's why arrow shafts always start and end with a dash rather than a gap.

### Skip

The `skip` mode does the opposite—it removes a full dash length from the calculation to ensure the endpoint falls in a gap.

```typescript
if (start === 'skip') {
	totalLength -= dashLength
	strokeDashoffset -= dashLength
}

if (end === 'skip') {
	totalLength -= dashLength
}
```

We use this for arrow handle paths, where we want the dashes to skip the connection points at each end. The path still renders normally, but the dash pattern is calculated as if the path were shorter, so the visible endpoints land in gaps.

### None

The `none` mode makes no adjustment—the pattern starts wherever it naturally falls. This is rarely what you want for endpoints, but it's useful when a path segment is part of a larger pattern that continues elsewhere.

### Offset centering

The `strokeDashoffset` adjustment is what makes outset and skip work correctly. Without it, extending or reducing the virtual length would shift the pattern's starting position in the wrong direction.

When we add half a dash to the start with outset, we also add half a dash to the offset. This means "the pattern should be positioned as if it started half a dash length before the visible path begins." The result is that the first visible segment is a complete dash.

For skip, we reduce both the length and the offset by a full dash, effectively saying "position the pattern as if it started a full dash before the visible path, then cut off that much from the calculation." The endpoint lands in a gap.

## Closed paths are different

Terminal handling only applies to open paths. For closed shapes, the pattern needs to wrap around cleanly where the path returns to its starting point.

The math changes because the number of gaps equals the number of dashes—the final gap connects back to the first dash. For open paths, we have one fewer gap than dashes, since there's no gap beyond the endpoints:

```typescript
if (closed) {
	strokeDashoffset = dashLength / 2
	gapLength = (totalLength - dashCount * dashLength) / dashCount
} else {
	gapLength = (totalLength - dashCount * dashLength) / Math.max(1, dashCount - 1)
}
```

The offset for closed paths is always half the dash length, which centers the pattern on the seam where the path closes.

## Where this lives

The terminal handling logic lives in `/packages/editor/src/lib/editor/shapes/shared/getPerfectDashProps.ts` (lines 65-78). This function calculates `strokeDasharray` and `strokeDashoffset` for any path, and it's exported from `@tldraw/editor` as part of the public API.

Arrow shapes use both outset and skip depending on context—outset for the shaft to ensure dashes appear at arrow endpoints, skip for handle paths to avoid dashes at connection points. Geo shapes use the defaults, which puts dashes at corners.

The cost is computational—we're calculating lengths and offsets for every dashed path at render time. For tldraw's scale that's fine, and the visual consistency is worth it.
