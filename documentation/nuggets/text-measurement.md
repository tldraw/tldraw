# Text measurement

Browsers don't tell you where text will break into lines—you have to render it and ask. For SVG export, tldraw needs to know the exact position of every word after the browser lays out wrapped text. The trick is measuring character-by-character using the DOM Range API, which most developers don't know exists.

## The problem with SVG text

When you export tldraw content to SVG, there's a fundamental mismatch: HTML has automatic text wrapping, but SVG doesn't. In HTML, you set a width and the browser handles line breaks, word spacing, and alignment. In SVG, you position each text element manually at exact coordinates.

This means when exporting a text shape that wraps across multiple lines, we need to ask the browser: "After you wrap this text, where did each word end up?" There's no `getTextLayout()` API. The only way is to render the text in the DOM and somehow extract the position of each word.

The naive approach is to measure words one at a time:

```typescript
// Don't do this
function measureWords(text: string, width: number) {
	const div = document.createElement('div')
	div.style.width = width + 'px'
	const positions = []

	for (const word of text.split(' ')) {
		div.textContent = word
		document.body.appendChild(div)
		positions.push(div.getBoundingClientRect())
		div.remove()
	}
	return positions
}
```

But this doesn't work. Measuring words in isolation tells you nothing about where they'll land when the browser wraps multi-word text. Word "three" might fit on the first line alone, but after words "one" and "two" it wraps to line two. You can't know without rendering the full paragraph.

## Measuring characters with Range API

The solution is an obscure browser API that most developers never use: `Range.getClientRects()`. Ranges are typically used for text selection, but they have a superpower—you can create a range spanning a single character and ask the browser where that character rendered:

```typescript
const range = new Range()
const textNode = element.childNodes[0]

// Measure character at index 5
range.setStart(textNode, 5)
range.setEnd(textNode, 6)
const rect = range.getClientRects()[0]
// rect tells you the exact x, y, width, height of that character
```

This works after the browser has laid out the text—line breaks, kerning, ligatures, all resolved. The character positions tell you everything about how the browser wrapped your text.

Here's how tldraw walks through every character to build word spans:

```typescript
// packages/editor/src/lib/editor/managers/TextManager/TextManager.ts
measureElementTextNodeSpans(element: HTMLElement) {
  const spans = []
  const range = new Range()
  let currentSpan = null
  let prevCharTop = 0
  let prevWasSpace = null

  for (const char of element.textContent) {
    range.setStart(textNode, idx)
    range.setEnd(textNode, idx + char.length)
    const rect = range.getClientRects()[range.getClientRects().length - 1]

    const top = rect.top
    const isSpace = /\s/.test(char)

    // Start a new span when we hit a word boundary or line break
    if (isSpace !== prevWasSpace || top !== prevCharTop) {
      if (currentSpan) spans.push(currentSpan)
      currentSpan = { box: { x: rect.left, y: top, w: rect.width, h: rect.height }, text: char }
    } else {
      // Extend the current span
      currentSpan.box.w = rect.right - currentSpan.box.x
      currentSpan.text += char
    }

    prevWasSpace = isSpace
    prevCharTop = top
    idx += char.length
  }

  return spans
}
```

The algorithm groups characters into spans by detecting boundaries: when the top position changes (new line) or when we transition between space and non-space characters (word boundary). The result is an array of `{ text, box }` objects—exactly what you need to render as SVG `<text>` elements.

## Why ellipsis truncation needs two passes

When text overflows a container, you might want to show "Some long text that doesn't fi…" instead of just clipping. The obvious approach is to append "…" and measure:

```typescript
// Don't do this
const textWithEllipsis = text + '…'
const spans = measureTextSpans(textWithEllipsis, { width })
```

But this fails because **adding the ellipsis changes how the browser collapses whitespace**. If your text ends with spaces, the browser collapses them differently when followed by a visible character versus when they're at the end. The ellipsis character affects the layout of the text before it.

The solution is to measure twice:

```typescript
if (opts.overflow === 'truncate-ellipsis' && didTruncate) {
	// First, measure how wide the ellipsis is
	elm.textContent = '…'
	const ellipsisWidth = Math.ceil(this.measureElementTextNodeSpans(elm).spans[0].box.w)

	// Second, measure the text with that much less space available
	elm.style.setProperty('width', `${elementWidth - ellipsisWidth}px`)
	elm.textContent = normalizedText
	const truncatedSpans = this.measureElementTextNodeSpans(elm, {
		shouldTruncateToFirstLine: true,
	}).spans

	// Finally, manually append the ellipsis span
	const lastSpan = truncatedSpans[truncatedSpans.length - 1]
	truncatedSpans.push({
		text: '…',
		box: {
			x: lastSpan.box.x + lastSpan.box.w,
			y: lastSpan.box.y,
			w: ellipsisWidth,
			h: lastSpan.box.h,
		},
	})
	return truncatedSpans
}
```

This guarantees the text measures correctly without the ellipsis interfering, then adds the ellipsis as a separate positioned span.

## Detecting RTL by looking backward

Right-to-left text (Arabic, Hebrew) flows backward, which means when you extend a span with a new character, you need to adjust the left edge instead of the right edge. But how do you detect if text is RTL?

The element uses `dir="auto"` so the browser handles directionality, but that doesn't tell you which mode it chose. The solution is surprisingly simple—just check if the next character is to the left of the previous one:

```typescript
const isRTL = left < prevCharLeftForRTLTest

if (isRTL) {
	// RTL: new character extends to the left
	currentSpan.box.x = left
	currentSpan.box.w = currentSpan.box.w + rect.width
} else {
	// LTR: new character extends to the right
	currentSpan.box.w = right - currentSpan.box.x
}

prevCharLeftForRTLTest = left
```

This works because in RTL text, successive characters march leftward instead of rightward. No need to parse the text or check Unicode ranges—the character positions tell you everything.

## The reused measurement element

The Range API is the surprising insight, but there's a predictable optimization too: instead of creating DOM elements on demand, tldraw maintains a single persistent `<div>` for all measurements:

```typescript
constructor(public editor: Editor) {
  const elm = document.createElement('div')
  elm.classList.add('tl-text-measure')
  elm.setAttribute('dir', 'auto')
  this.editor.getContainer().appendChild(elm)
  this.elm = elm
}
```

Styled to be invisible but still participate in layout:

```css
.tl-text-measure {
	position: absolute;
	opacity: 0;
	visibility: hidden;
}
```

Using `visibility: hidden` instead of `display: none` is critical—the browser still calculates layout, we just hide the result visually. The element also tracks which styles are currently set and only updates properties that changed, avoiding unnecessary reflows when measuring similar text repeatedly.

## When this matters

Most text measurements use the simple path: set `innerHTML`, call `getBoundingClientRect()`, done. The character-by-character span measurement is slow—hundreds of DOM calls per paragraph—but it only runs during SVG export, not during interactive editing.

The Range API trick is the key insight: browsers expose character-level layout information, but most developers don't know this API exists. If you need to understand how text wrapped or position individual words, measuring characters with ranges is the only way.

## Key files

- `packages/editor/src/lib/editor/managers/TextManager/TextManager.ts` — `measureElementTextNodeSpans` using Range API
- `packages/tldraw/src/lib/shapes/shared/SvgTextLabel.tsx` — SVG export using span measurement
- `packages/editor/editor.css` — Hidden `.tl-text-measure` element styling
