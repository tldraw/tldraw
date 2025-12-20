# Perfect dash patterns

Set `stroke-dasharray: 10 5` on an SVG path and you'll get dashes. But they'll look wrong. The pattern will end mid-dash, leaving an ugly stump at the endpoint. Or it will have uneven spacing because 10+5 doesn't divide evenly into your path length. The browser doesn't care—it just repeats the pattern until it runs out of path.

Tldraw's shapes need dashes that look intentional. That means calculating exact dash and gap lengths so the pattern "fits" the path, with whole dashes meeting at clean boundaries.

## The naive approach fails

Consider a 100-pixel line with a 2-pixel stroke. You want dashes roughly 4 pixels long (twice the stroke width) with equal gaps. The naive approach:

```typescript
strokeDasharray = "4 4"  // 4px dash, 4px gap
```

A 4+4=8 pixel pattern repeats 12.5 times in 100 pixels. That half-repetition means the line ends somewhere in the middle of a gap, or worse, mid-dash. It looks like a rendering bug.

## Fitting dashes to the path

The solution is to work backwards: given a path length, figure out how many complete dash-gap cycles fit, then adjust the dash and gap lengths to exactly fill the space.

```typescript
// Start with the desired dash length based on stroke width
let dashLength = Math.min(strokeWidth * lengthRatio, totalLength / 4)

// Calculate how many complete cycles fit
dashCount = Math.floor(totalLength / dashLength / (2 * ratio))

// Now recalculate dash length to exactly fill the path
dashLength = totalLength / dashCount / (2 * ratio)
```

The `ratio` parameter handles dotted vs dashed styles. For dashed lines, `ratio` is 1, meaning equal dash and gap lengths. For dots, `ratio` is 100—the "dash" is tiny (1% of the pattern) and the gap is huge (99%).

After calculating dash length, the gap becomes whatever's left:

```typescript
if (closed) {
	gapLength = (totalLength - dashCount * dashLength) / dashCount
} else {
	gapLength = (totalLength - dashCount * dashLength) / Math.max(1, dashCount - 1)
}
```

Open paths have one fewer gap than dashes (the endpoints don't need gaps beyond them), while closed paths have equal numbers of each.

## Terminal handling

Where should the dash pattern start and end? For a simple line, you probably want the stroke to begin and end with a solid dash, not a gap. For a shape's outline, you might want the pattern to look continuous around corners.

The `start` and `end` parameters control this with three modes:

- **outset**: Extend the path length virtually so the dash pattern starts/ends outside the visible stroke. This creates the illusion of a complete dash at each endpoint.
- **skip**: Remove a full dash length from consideration at the endpoint, starting/ending with a gap.
- **none**: No adjustment—the pattern starts exactly at the path start.

```typescript
if (start === 'outset') {
	totalLength += dashLength / 2
	strokeDashoffset += dashLength / 2
} else if (start === 'skip') {
	totalLength -= dashLength
	strokeDashoffset -= dashLength
}
```

The `strokeDashoffset` shifts where the dash pattern begins along the path. By combining length adjustments with offset, we control exactly which part of the dash cycle appears at each endpoint.

## Closed paths need centering

For closed shapes like rectangles or ellipses, the dash pattern must meet up with itself. If you start at the "beginning" of a closed path, the last dash must flow seamlessly into the first.

```typescript
if (closed) {
	strokeDashoffset = dashLength / 2
}
```

Starting with a half-dash offset means the pattern is centered on the path's start point. The "seam" where the path closes falls in the middle of a dash rather than at a gap boundary, making it invisible.

## Short path edge cases

What happens when the path is shorter than a reasonable dash pattern? A 10-pixel line with 8-pixel dashes would look absurd.

```typescript
if (dashCount < 3 && style === 'dashed') {
	if (totalLength / strokeWidth < 4) {
		// Path is very short—just make it solid
		dashLength = totalLength
		dashCount = 1
		gapLength = 0
	} else {
		// Fall back to thirds: dash, gap, dash
		dashLength = totalLength * (1 / 3)
		gapLength = totalLength * (1 / 3)
	}
}
```

Very short paths become solid. Somewhat short paths get exactly three segments: dash, gap, dash. This looks intentional rather than broken.

## Snap for visual alignment

When multiple paths need aligned dash patterns (like parallel lines), the `snap` parameter rounds the dash count to a multiple:

```typescript
dashCount -= dashCount % snap
```

With `snap: 4`, dash counts round to 4, 8, 12, etc. Two lines of slightly different lengths will have patterns that align at regular intervals.

## Usage in practice

The function returns two strings ready for SVG attributes:

```typescript
const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
	pathLength,
	strokeWidth,
	{ style: 'dashed', lengthRatio: 2 }
)

return <path strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
```

The `PathBuilder` class uses this to render each segment of dashed shapes. For complex paths with multiple segments (like a rectangle's four sides), each segment gets its own calculated dash props. This prevents dashes from flowing around corners—instead, each edge gets its own clean pattern that starts and ends appropriately.

## The dotted variation

Dotted lines use the same algorithm with `ratio: 100` and a tiny base dash length:

```typescript
case 'dotted': {
	ratio = 100
	dashLength = strokeWidth / ratio  // Nearly zero
}
```

With `linecap: round`, these near-zero dashes become circles. The algorithm then calculates gap lengths so these dots are evenly distributed along the path, using the same snapping logic to ensure whole numbers of dots.

## Key files

- `packages/editor/src/lib/editor/shapes/shared/getPerfectDashProps.ts` — The dash calculation algorithm
- `packages/tldraw/src/lib/shapes/shared/PathBuilder.tsx` — Integration with shape rendering (`toDashedSvg` method)
- `packages/editor/src/lib/editor/shapes/group/DashedOutlineBox.tsx` — Usage for selection outlines
