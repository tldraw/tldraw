---
title: Perfect dash patterns
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - dash
  - pattern
  - SVG
---

# Perfect dash patterns

When we added dashed and dotted lines to tldraw, we wanted them to look right. Complete dashes at both ends, corners that line up on rectangles, arrow bindings that meet cleanly on handles. SVG's `stroke-dasharray` doesn't give you this for free—it just tiles a pattern until the path ends, leaving incomplete dashes wherever it runs out of space.

Here's the problem: if you have a 100px line and you set `stroke-dasharray="4 4"` (4px dash, 4px gap), SVG draws 12.5 complete cycles and stops. The last dash gets cut off partway through. For a mechanical, technical look that might be fine. For the kind of polished canvas experience we wanted, it looks wrong.

We solve this by working backwards from the dash count.

## The approach

Instead of deciding on a dash length and letting SVG tile it, we calculate how many complete cycles should fit along the path, then adjust the dash and gap lengths to make that number work perfectly.

The formula for dash count is:

```typescript
dashCount = Math.floor(totalLength / dashLength / (2 * ratio))
```

Let's break this down. `totalLength / dashLength` gives us how many dashes would fit if we packed them edge-to-edge with no gaps. But we don't want edge-to-edge dashes—we want dashes and gaps.

The `(2 * ratio)` term accounts for this. For dashed style, `ratio = 1`, meaning the dash and gap are equally weighted. So `2 * ratio = 2`, and dividing by 2 converts "how many dash lengths fit" into "how many dash-plus-gap pairs fit". For dotted style, `ratio = 100`, meaning the gap is 100 times longer than the tiny invisible dash. Dividing by `2 * 100 = 200` converts dash lengths into dash-plus-gap-that's-100x-longer pairs.

We floor the result because partial cycles are exactly what we're trying to avoid.

Once we know the dash count, we recalculate the actual dash length to divide the total length evenly:

```typescript
dashLength = totalLength / dashCount / (2 * ratio)
```

This is the same formula, but now `dashCount` is fixed and `dashLength` becomes the variable. We're solving for the length that makes the math work out perfectly.

For gaps, open and closed paths differ:

```typescript
// Open paths: n dashes need n-1 gaps
gapLength = (totalLength - dashCount * dashLength) / Math.max(1, dashCount - 1)

// Closed paths: n dashes need n gaps (pattern wraps)
gapLength = (totalLength - dashCount * dashLength) / dashCount
```

The difference is that closed shapes wrap the pattern back to the start, so you need one more gap to complete the cycle. Open paths end with a dash, not a gap, so you have one fewer.

## Terminal handling

For open paths, we also need to control what happens at the endpoints. Arrow bindings, for example, should end on a dash at the handle, not in the middle of a gap. We support three terminal modes:

- `'outset'`: Extends the virtual path by half a dash at each end, ensuring dashes at both endpoints
- `'skip'`: Reduces the path length by a full dash to avoid a dash at that end
- `'none'`: No adjustment

The adjustment happens before we calculate the dash count, so it affects the entire pattern:

```typescript
if (start === 'outset') {
	totalLength += dashLength / 2
	strokeDashoffset += dashLength / 2
} else if (start === 'skip') {
	totalLength -= dashLength
	strokeDashoffset -= dashLength
}
```

The offset adjustment shifts where the pattern starts drawing, so that even though we extended the virtual path length, the dashes still appear in the right places visually.

For closed shapes, we offset by half a dash to center the pattern on the seam where the path loops back to the start:

```typescript
strokeDashoffset = dashLength / 2
```

This hides the closure point so the pattern looks continuous.

## Edge cases

Very short paths get special handling. If the path is shorter than 4 stroke widths, we render it solid—there's not enough space for dashes to look intentional. If it's short but not that short, we force exactly three segments: dash, gap, dash. This avoids the awkward look of a single dash with tiny gaps on either side.

Dotted lines use a different trick. The "dash" is actually 1/100th of the stroke width—effectively invisible. We render it with `stroke-linecap: round`, which turns each tiny dash into a circular dot. The large gaps give you evenly spaced dots that land exactly where you want them.

## Where this lives

The core function is `getPerfectDashProps` in `/packages/editor/src/lib/editor/shapes/shared/getPerfectDashProps.ts`. It takes a total length and stroke width and returns `strokeDasharray` and `strokeDashoffset` values you can apply directly to SVG elements.

`PathBuilder` in `/packages/tldraw/src/lib/shapes/shared/PathBuilder.tsx` uses this for complex paths, calling it for each segment and handling terminal modes based on whether the path is closed and where the segment falls in the sequence.

The cost is computational—we're calculating lengths and offsets for every dashed path at render time. We cache path geometry where we can, but the tradeoff is worth it. Dashes that line up with corners and handles make the whole canvas feel more polished.
