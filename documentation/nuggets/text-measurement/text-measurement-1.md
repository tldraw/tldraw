---
title: Range API for character measurement
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - text
  - measurement
  - range api
  - svg export
  - getClientRects
---

# Range API for character measurement

HTML and SVG handle text differently. In HTML, you set a width and the browser wraps text automatically, handling line breaks, word spacing, and alignment. In SVG, you position each text element manually at exact coordinates. There's no browser API to ask "where did you wrap this text?"—you have to render text in the DOM and extract character positions after layout.

We use the Range API for this. Here's how it works.

## The Range API

Most developers know `Range` as the API behind text selection. You drag across text, the browser highlights it, and `window.getSelection().getRangeAt(0)` gives you the range. What's less known is that ranges can measure individual characters.

Here's the basic pattern:

```typescript
const range = new Range()
const textNode = element.childNodes[0]

// Position range around a single character
range.setStart(textNode, 0)
range.setEnd(textNode, 1)

// Get the character's bounding rectangles
const rects = range.getClientRects()
const rect = rects[rects.length - 1]
```

This gives us the position and dimensions of one character. By iterating through every character, we can map out where the browser placed each one after handling wrapping, alignment, and directionality.

## Why the last rect

The code takes `rects[rects.length - 1]` instead of `rects[0]`. This is because some browsers return multiple rectangles for the first character on a new line—one for the line break position, and one for the character itself. The last rect is always the actual character.

This matters when text wraps. Without taking the last rect, we'd get incorrect positions at line breaks and the entire SVG export would be misaligned.

## Measuring spans

We iterate through text character by character, grouping consecutive characters into "spans"—chunks of text that belong together on the same line. A new span starts when we hit a word boundary (space to non-space transition) or when the `y` position changes (line break).

```typescript
for (const char of textContent) {
  range.setStart(textNode, idx)
  range.setEnd(textNode, idx + char.length)

  const rects = range.getClientRects()
  const rect = rects[rects.length - 1]

  const top = rect.top + offsetY
  const left = rect.left + offsetX

  const isSpaceCharacter = /\s/.test(char)

  if (
    isSpaceCharacter !== prevCharWasSpaceCharacter ||
    top !== prevCharTop ||
    !currentSpan
  ) {
    // Start new span
    currentSpan = {
      box: { x: left, y: top, w: rect.width, h: rect.height },
      text: char,
    }
  } else {
    // Extend current span
    currentSpan.box.w = (left + rect.width) - currentSpan.box.x
    currentSpan.text += char
  }

  prevCharWasSpaceCharacter = isSpaceCharacter
  prevCharTop = top
  idx += char.length
}
```

Each span records its text and bounding box. This is what we use for SVG export—every span becomes a positioned `<tspan>` element with exact coordinates.

## RTL text

Right-to-left text requires special handling. In LTR text, characters march rightward—extending a span means increasing the width. In RTL text, characters march leftward—extending a span means moving the left edge and increasing the width.

We detect RTL by watching character positions. If the left edge of a character is less than the previous character's left edge, we're in RTL mode:

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
```

We don't parse text or check Unicode ranges. The element has `dir="auto"`, so the browser determines directionality using the Unicode bidirectional algorithm. We just observe where characters end up.

## SVG export

Once we have spans with positions, generating SVG is straightforward. Each span becomes a `<tspan>` with `x` and `y` coordinates. When the `y` position changes, we insert a line break tspan:

```typescript
let currentLineTop = null
const children = []

for (const { text, box } of spans) {
  const didBreakLine = currentLineTop !== null && box.y > currentLineTop

  if (didBreakLine) {
    children.push(
      <tspan
        key={children.length}
        alignmentBaseline="mathematical"
        x={offsetX}
        y={box.y + offsetY}
      >
        {'\n'}
      </tspan>
    )
  }

  children.push(
    <tspan
      key={children.length}
      alignmentBaseline="mathematical"
      x={box.x + offsetX}
      y={box.y + offsetY}
      unicodeBidi="plaintext"
    >
      {text.replace(/\s/g, '\xa0')}
    </tspan>
  )

  currentLineTop = box.y
}
```

The `unicodeBidi="plaintext"` attribute is necessary for mixed RTL/LTR text to render correctly in SVG viewers. Regular spaces are converted to non-breaking spaces (`\xa0`) to prevent collapsing in SVG.

## Performance

Character-by-character measurement is slow. Each `getClientRects()` call triggers layout calculations. For a paragraph of text, that's hundreds of DOM calls.

We only run this during SVG export, not during interactive editing. For measuring text width and height, we use the fast path—a single `getBoundingClientRect()` on the entire element. The Range API path exists specifically to get per-character positions for export, where accuracy matters more than speed.

## Where this lives

The character measurement logic is in `TextManager.measureElementTextNodeSpans()`:

- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/editor/managers/TextManager/TextManager.ts`

SVG generation using the measured spans:

- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/SvgTextLabel.tsx`
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/createTextJsxFromSpans.tsx`

The measurement element is styled to be invisible but still laid out:

- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/editor.css` (lines 690-704)
