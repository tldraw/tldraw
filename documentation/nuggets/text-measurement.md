# Text measurement caching

There's no JavaScript API for "how big would this text be?" The only way to measure text dimensions is to render it in the DOM and ask the browser. tldraw does this constantly—for text shapes, labels, notes, and anywhere else text appears. We've made it fast by reusing a single hidden element and carefully avoiding unnecessary work.

## The browser's text measurement problem

You can't calculate text dimensions mathematically. Fonts have complex kerning rules, ligatures, and variable-width characters. The same text renders differently across fonts, sizes, and operating systems. The browser is the only reliable authority on how text will actually lay out.

The naive approach creates a new element for each measurement:

```typescript
// Don't do this
function measureText(text: string, styles: Record<string, string>) {
  const div = document.createElement('div')
  Object.assign(div.style, styles)
  div.textContent = text
  document.body.appendChild(div)
  const rect = div.getBoundingClientRect()
  div.remove()
  return { width: rect.width, height: rect.height }
}
```

This works, but it's expensive. Creating DOM nodes, applying styles, and triggering layout are all slow operations. In a typical editing session, tldraw measures text hundreds of times per second—every keystroke, every resize, every zoom level change.

## A single hidden measurement element

Instead of creating elements on demand, we maintain a single persistent `<div>` just for measuring:

```typescript
// packages/editor/src/lib/editor/managers/TextManager/TextManager.ts
constructor(public editor: Editor) {
  const elm = document.createElement('div')
  elm.classList.add('tl-text')
  elm.classList.add('tl-text-measure')
  elm.setAttribute('dir', 'auto')
  elm.tabIndex = -1
  this.editor.getContainer().appendChild(elm)
  this.elm = elm
}
```

The element is styled to be invisible but still participate in layout:

```css
.tl-text-measure {
  position: absolute;
  top: 0px;
  left: 0px;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  width: max-content;
}
```

Using `visibility: hidden` instead of `display: none` is important—the element still takes up space and the browser still calculates its layout. We just hide it visually.

## Property diffing to avoid reflows

Every time you modify an element's style, the browser might need to recalculate layout (reflow). Reflows are expensive—they can block the main thread for milliseconds. The obvious optimization is to avoid unnecessary changes.

When measuring text with different styles, we only update properties that actually changed:

```typescript
private setElementStyles(styles: Record<string, string | undefined>) {
  const stylesToReinstate = {} as any
  for (const key of objectMapKeys(styles)) {
    if (typeof styles[key] === 'string') {
      const oldValue = this.elm.style.getPropertyValue(key)
      if (oldValue === styles[key]) continue  // Skip if unchanged
      stylesToReinstate[key] = oldValue
      this.elm.style.setProperty(key, styles[key])
    }
  }
  return () => {
    for (const key of objectMapKeys(stylesToReinstate)) {
      this.elm.style.setProperty(key, stylesToReinstate[key])
    }
  }
}
```

This returns a cleanup function that restores the original values. If you're measuring multiple text strings with the same font, subsequent measurements skip all the style updates entirely.

## Measuring spans for SVG export

DOM text and SVG text work differently. In the DOM, the browser handles word wrapping, line breaks, and spacing. SVG has no text wrapping—you position each text element manually. To export text to SVG, we need to know exactly where each word ends up after the browser lays it out.

The `measureTextSpans` method extracts this information by measuring character by character:

```typescript
measureElementTextNodeSpans(element: HTMLElement) {
  const spans = []
  const range = new Range()
  let currentSpan = null

  for (const char of element.textContent) {
    range.setStart(textNode, idx)
    range.setEnd(textNode, idx + char.length)
    const rects = range.getClientRects()
    const rect = rects[rects.length - 1]

    const top = rect.top + offsetY
    const isSpaceCharacter = /\s/.test(char)

    if (isSpaceCharacter !== prevCharWasSpaceCharacter || top !== prevCharTop) {
      // Word boundary or new line - start a new span
      if (currentSpan) spans.push(currentSpan)
      currentSpan = { box: { x: left, y: top, w: rect.width, h: rect.height }, text: char }
    } else {
      // Extend the current span
      currentSpan.box.w = right - currentSpan.box.x
      currentSpan.text += char
    }
  }
  return spans
}
```

This walks through each character, using `Range.getClientRects()` to find its exact position. Characters are grouped into spans at word boundaries or line breaks. The result is an array of positioned text chunks that can be rendered as individual SVG `<text>` elements.

## Text truncation with ellipsis

When text overflows a fixed-width container, we sometimes want to truncate with an ellipsis. This requires a two-pass measurement: first measure how wide the ellipsis is, then measure the text with that much less space:

```typescript
if (opts.overflow === 'truncate-ellipsis' && didTruncate) {
  // Measure the ellipsis
  elm.textContent = '…'
  const ellipsisWidth = Math.ceil(this.measureElementTextNodeSpans(elm).spans[0].box.w)

  // Re-measure text with reduced width
  elm.style.setProperty('width', `${elementWidth - ellipsisWidth}px`)
  elm.textContent = normalizedText
  const truncatedSpans = this.measureElementTextNodeSpans(elm, {
    shouldTruncateToFirstLine: true,
  }).spans

  // Append the ellipsis
  const lastSpan = truncatedSpans[truncatedSpans.length - 1]
  truncatedSpans.push({
    text: '…',
    box: { x: lastSpan.box.x + lastSpan.box.w, y: lastSpan.box.y, w: ellipsisWidth, h: lastSpan.box.h }
  })
  return truncatedSpans
}
```

We can't just append "…" to the text before measuring—that would change how whitespace collapses and affect the layout. Instead we measure the space the ellipsis needs, constrain the text width accordingly, and add the ellipsis span manually.

## RTL and bidirectional text

Text direction complicates measurement. In right-to-left languages, characters flow from right to left, so extending a span means adjusting the left edge instead of the right:

```typescript
const isRTL = left < prevCharLeftForRTLTest

if (isRTL) {
  currentSpan.box.x = left
  currentSpan.box.w = currentSpan.box.w + rect.width
} else {
  currentSpan.box.w = right - currentSpan.box.x
}
```

The element uses `dir="auto"` to let the browser detect text direction automatically, and we track the direction during measurement to position spans correctly.

## The tradeoff

This approach trades memory for speed. We keep a DOM element around permanently and track state between measurements. For an application that measures text constantly, the savings compound quickly. A single reused element with property diffing is dramatically faster than the naive create-measure-destroy cycle.

The span measurement for SVG export is inherently slow—we're measuring every character individually. But it only runs during export, not during normal editing. Most text measurements use the simple `measureHtml` path, which just sets innerHTML and calls `getBoundingClientRect()`.

## Key files

- `packages/editor/src/lib/editor/managers/TextManager/TextManager.ts` — The `TextManager` class with all measurement methods
- `packages/editor/editor.css` — The `.tl-text-measure` class hiding the measurement element
- `packages/tldraw/src/lib/shapes/text/TextShapeUtil.tsx` — Text shape using `measureHtml` for sizing
- `packages/tldraw/src/lib/shapes/shared/SvgTextLabel.tsx` — SVG export using `measureTextSpans`
