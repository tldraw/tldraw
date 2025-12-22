---
title: Ellipsis truncation two-pass algorithm
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - text
  - measurement
  - truncation
  - ellipsis
  - whitespace
status: published
date: 12/21/2025
order: 2
---

# Ellipsis truncation two-pass algorithm

When we truncate text with an ellipsis, we can't just append "…" to the end and call it done. Adding the ellipsis character changes how the browser collapses whitespace, which means the text before the ellipsis takes up different space than it would without it. We need to measure the ellipsis first, then measure the text with reduced width, then manually position the ellipsis as a separate span.

## The problem

Here's what you might expect to work:

```typescript
// Wrong: Just append the ellipsis
elm.textContent = text + '…'
elm.style.width = `${maxWidth}px`
const spans = measureElementTextNodeSpans(elm, { shouldTruncateToFirstLine: true })
```

This fails because the browser sees "…" at the end of the text and applies different whitespace collapse rules. A space followed by an ellipsis might collapse differently than a space at the end of a line. The text wraps at different points, and you get the wrong truncation position.

The ellipsis width isn't the only issue—it's that the ellipsis character changes the browser's layout behavior for the text before it.

## The solution

We measure in three passes:

### Pass 1: Measure the ellipsis width

```typescript
elm.textContent = '…'
const ellipsisWidth = Math.ceil(this.measureElementTextNodeSpans(elm).spans[0].box.w)
```

We measure the ellipsis by itself to know exactly how much space it takes up. We round up with `Math.ceil` to prevent subpixel overflow issues where the ellipsis might extend past the container boundary.

### Pass 2: Measure text with reduced width

```typescript
elm.style.setProperty('width', `${elementWidth - ellipsisWidth}px`)
elm.textContent = normalizedText
const truncatedSpans = this.measureElementTextNodeSpans(elm, {
	shouldTruncateToFirstLine: true,
}).spans
```

Now we subtract the ellipsis width from the available space and measure the text by itself. This gives us the actual truncation point—the browser wraps the text exactly where it would if the ellipsis weren't affecting whitespace collapse.

### Pass 3: Manually append the ellipsis span

```typescript
const lastSpan = truncatedSpans[truncatedSpans.length - 1]!
truncatedSpans.push({
	text: '…',
	box: {
		x: Math.min(lastSpan.box.x + lastSpan.box.w, opts.width - opts.padding - ellipsisWidth),
		y: lastSpan.box.y,
		w: ellipsisWidth,
		h: lastSpan.box.h,
	},
})

return truncatedSpans
```

We position the ellipsis at the end of the last span. The `Math.min` ensures the ellipsis doesn't overflow the container—if the last span extends to the right edge, we clamp the ellipsis position to stay within bounds.

The ellipsis becomes its own span with explicit coordinates. When we convert these spans to SVG for export, each span gets positioned exactly where we measured it.

## Why this works

By measuring the text without the ellipsis present, we get the browser's natural line-breaking behavior. The whitespace collapses the same way it would in a normal paragraph that just happens to end at a line break.

Then we manually add the ellipsis as a completely separate element with its own positioning. It doesn't participate in the text layout—it's just placed at the calculated position.

This is only necessary when truncating to a single line with ellipsis. Normal wrapping doesn't need this—the browser handles multi-line text layout correctly on its own.

## Where this lives

The ellipsis algorithm is in `TextManager.ts`, specifically in the `measureTextSpans` method (lines 300-327). It runs only when `opts.overflow === 'truncate-ellipsis'` and the text actually got truncated (`didTruncate` is true).

The measured spans are used by `SvgTextLabel.tsx` and `createTextJsxFromSpans.tsx` to generate SVG text elements with explicit positioning. Each span becomes a `<tspan>` element with exact x/y coordinates.

You can find the full implementation at:

- `/packages/editor/src/lib/editor/managers/TextManager/TextManager.ts`
- `/packages/tldraw/src/lib/shapes/shared/SvgTextLabel.tsx`
- `/packages/tldraw/src/lib/shapes/shared/createTextJsxFromSpans.tsx`
