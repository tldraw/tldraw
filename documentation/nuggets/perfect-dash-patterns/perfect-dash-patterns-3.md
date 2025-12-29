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
order: 2
---

# Perfect dash patterns

When we added dashed and dotted lines to tldraw, we wanted them to look right—complete dashes at both ends, even spacing, corners that line up. SVG's `stroke-dasharray` doesn't do this. It tiles a pattern until the path ends, which means you'll usually get an incomplete dash at one end. We calculate patterns that fit the path exactly.

Here's how it works.

## The basic algorithm

SVG's `stroke-dasharray` property takes a dash length and gap length: `"8 4"` means 8 pixels of dash, 4 pixels of gap, repeated. The problem is that a 100-pixel line doesn't divide evenly by 12, so you get 8 full cycles and then 4 pixels of an incomplete dash at the end.

We work backwards. Instead of tiling a fixed pattern, we figure out how many complete dash-gap pairs _should_ fit, then adjust the lengths to fill the path exactly.

```typescript
// Start with a reasonable dash length
dashLength = Math.min(strokeWidth * lengthRatio, totalLength / 4)

// Calculate how many dashes fit
dashCount = Math.floor(totalLength / dashLength / (2 * ratio))

// Recalculate dash length to exactly divide the path
dashLength = totalLength / dashCount / (2 * ratio)

// Calculate gap length based on what's left
gapLength = (totalLength - dashCount * dashLength) / (dashCount - 1)
```

The `ratio` parameter controls dash-to-gap proportion. For dashed lines, `ratio = 1` means equal weighting. For dotted lines, `ratio = 100` creates tiny invisible dashes with large gaps.

## Short paths need special handling

When a path is very short relative to stroke width, the standard algorithm breaks down. If `totalLength / strokeWidth < 4`, we render it as solid:

```typescript
if (dashCount < 3 && style === 'dashed') {
	if (totalLength / strokeWidth < 4) {
		// Very short—just make it solid
		dashLength = totalLength
		dashCount = 1
		gapLength = 0
	} else {
		// Short but not tiny—force three segments
		dashLength = totalLength * (1 / 3)
		gapLength = totalLength * (1 / 3)
	}
}
```

The threshold of 4 stroke widths is arbitrary but works well in practice. Below that, trying to fit dashes looks messy. A 10-pixel line with a 3-pixel stroke is better as a solid.

When the path is short enough to require fewer than three dashes but not short enough to be solid, we force exactly three equal segments: dash-gap-dash. This ensures a recognizable dashed pattern even on small shapes.

## Dotted lines are a hack

The dotted style doesn't use actual dots. It uses `ratio = 100` to create dashes that are 1/100th the stroke width—essentially invisible. Combined with `stroke-linecap: round`, these tiny dashes render as circles:

```typescript
case 'dotted': {
  ratio = 100
  dashLength = strokeWidth / ratio
  break
}
```

The gap is 100 times longer than the dash, so the pattern is mostly gap with tiny points of "dash" that become dots through rounding. This works because SVG doesn't have a native dotted stroke style that respects spacing.

## Parallel lines need alignment

When drawing shapes with multiple parallel edges—like rectangles—you want the dashes to line up. We use a `snap` parameter to force alignment:

```typescript
dashCount -= dashCount % snap
```

With `snap = 2`, this ensures an even number of dashes. Parallel lines with the same total length and dash count will have identical patterns. Without this, slight differences in calculated dash count would cause edges to look misaligned even though they're the same length.

## Where this lives

The core calculation is in `/packages/editor/src/lib/editor/shapes/shared/getPerfectDashProps.ts`. It returns `strokeDasharray` and `strokeDashoffset` as strings you can apply directly to SVG elements.

The function also handles terminal modes—whether to extend the pattern beyond the path endpoints, skip the first/last dash, or leave it as-is. We use these for arrow handles, where you don't want a dash right at the connection point.

The cost is computational—we're calculating lengths and offsets for every dashed path at render time. But the results are cached through React's rendering, and the math is fast enough that it hasn't been a problem.
