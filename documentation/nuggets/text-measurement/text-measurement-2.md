---
title: Detecting RTL text by position
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - text
  - rtl
  - right-to-left
  - measurement
  - unicode
status: published
date: 12/21/2025
order: 1
---

# Detecting RTL text by position

When measuring text for SVG export, we need to know whether text flows left-to-right or right-to-left. The naive approach would be parsing Unicode character ranges to identify Arabic, Hebrew, or other RTL scripts. We don't do that. Instead, we let the browser handle directionality with `dir="auto"`, then detect RTL by watching whether characters move leftward as we measure them.

Here's how it works.

## The measurement element

We create a single persistent DOM element for all text measurements:

```typescript
const elm = document.createElement('div')
elm.classList.add('tl-text')
elm.classList.add('tl-text-measure')
elm.setAttribute('dir', 'auto')
elm.tabIndex = -1
this.editor.getContainer().appendChild(elm)
```

The `dir="auto"` attribute is the key. The browser automatically determines text directionality based on its Unicode bidirectional algorithm. We don't parse the text ourselves—we just ask the browser to lay it out correctly, then observe the results.

The element is hidden with `visibility: hidden` and `opacity: 0`, but crucially not `display: none`. The browser still calculates layout for hidden elements, which is exactly what we need.

## Character-by-character measurement

To get precise position data for SVG export, we measure each character individually using the Range API:

```typescript
const range = new Range()
const textNode = element.childNodes[0]

for (const char of childNode.textContent ?? '') {
	// Place range around single character
	range.setStart(textNode, idx)
	range.setEnd(textNode, idx + char.length)

	// Get character rect
	const rects = range.getClientRects()
	const rect = rects[rects.length - 1]

	const left = rect.left + offsetX
	const right = rect.right + offsetX

	// ... use position data

	idx += char.length
}
```

This gives us the exact bounding box for every character after the browser has applied its text layout rules—including directionality.

## Position-based RTL detection

Once we have character positions, detecting RTL is simple. In left-to-right text, successive characters have increasing left positions. In right-to-left text, they march leftward:

```typescript
const isRTL = left < prevCharLeftForRTLTest
```

That's it. If the current character's left edge is to the left of the previous character's left edge, we're in RTL text. We track this per-character because a single line can contain mixed directionality—English followed by Arabic, for example.

## Extending spans

We group characters into spans (words and spaces) for efficiency. When extending a span with a new character, directionality determines how the bounding box grows:

```typescript
if (isRTL) {
	// RTL: new character extends to the left
	currentSpan.box.x = left
	currentSpan.box.w = currentSpan.box.w + rect.width
} else {
	// LTR: new character extends to the right
	currentSpan.box.w = right - currentSpan.box.x
}
```

For LTR text, we keep the left edge fixed and extend rightward by updating the width. For RTL text, we move the left edge leftward and increase the width accordingly. The span's left edge always stays at the leftmost character, regardless of which character came first in the string.

## Newline handling

After a newline, we reset the RTL test:

```typescript
if (char === '\n') {
	prevCharLeftForRTLTest = 0
}
```

Each line starts fresh. This handles cases where directionality changes between lines, or where the first character on a new line might happen to start further left than the last character on the previous line for layout reasons.

## Why position beats parsing

We could implement our own Unicode bidirectional algorithm, parse character ranges to identify RTL scripts, and handle directional override characters. That would be hundreds of lines of complex logic that would need updating as Unicode evolves.

Or we can let the browser do the work. The browser already implements the full Unicode bidirectional algorithm correctly. By setting `dir="auto"` and measuring the results, we get correct behavior for:

- Mixed LTR/RTL text in a single line
- Directional override characters
- Weak directional characters (punctuation, numbers)
- Edge cases in the Unicode spec we've never even heard of

The position-based approach also automatically handles future additions to Unicode. No code changes needed when new scripts are added.

## SVG export

Once we have span positions and directionality, we convert them to SVG:

```typescript
<tspan
  key={children.length}
  alignmentBaseline="mathematical"
  x={box.x + offsetX}
  y={box.y + offsetY}
  unicodeBidi="plaintext"
>
  {correctSpacesToNbsp(text)}
</tspan>
```

The `unicodeBidi="plaintext"` attribute ensures the SVG respects bidirectional text. It's marked as "intended for DTD designers" in the SVG spec, but it's necessary for mixed RTL/LTR text to render correctly in SVG viewers.

## Where this lives

The RTL detection logic is in `TextManager.ts`, specifically in the `measureElementTextNodeSpans` method. The SVG generation is in `createTextJsxFromSpans.tsx`.

This approach has served us well. It handles every RTL language we've tested, including mixed directionality and complex Unicode edge cases, without needing to understand the Unicode bidirectional algorithm ourselves. The browser does the hard work; we just observe and measure.
