---
title: Text measurement - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - text
  - measurement
---

# Text measurement - raw notes

## Core problem

**HTML vs SVG text rendering:**
- HTML: Set width, browser handles line breaks, word spacing, alignment automatically
- SVG: Must position each text element manually at exact coordinates
- No browser API to query "where did you wrap this text?"
- Must render text in DOM and extract character/word positions after layout

## Key implementation files

### Primary file: TextManager.ts
**Path:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/src/lib/editor/managers/TextManager/TextManager.ts`

### Supporting files:
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/SvgTextLabel.tsx` - SVG export using span measurement
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/createTextJsxFromSpans.tsx` - Converts spans to SVG JSX
- `/Users/stephenruiz/Documents/GitHub/tldraw/packages/editor/editor.css` (lines 690-704) - Hidden `.tl-text-measure` element styling

## TextManager class architecture

### Constructor (lines 77-90)
```typescript
constructor(public editor: Editor) {
  const elm = document.createElement('div')
  elm.classList.add('tl-text')
  elm.classList.add('tl-text-measure')
  elm.setAttribute('dir', 'auto')
  elm.tabIndex = -1
  this.editor.getContainer().appendChild(elm)
  this.elm = elm

  for (const key of objectMapKeys(initialDefaultStyles)) {
    elm.style.setProperty(key, initialDefaultStyles[key])
  }
}
```

**Key details:**
- Single persistent DOM element for all measurements
- Appended to editor container
- `dir="auto"` - browser automatically determines text directionality (LTR/RTL)
- `tabIndex = -1` - not focusable

### Initial default styles (lines 64-71)
```typescript
const initialDefaultStyles = Object.freeze({
  'overflow-wrap': 'break-word',
  'word-break': 'auto',
  width: null,
  height: null,
  'max-width': null,
  'min-width': null,
})
```

### CSS styling (editor.css lines 690-704)
```css
.tl-text-measure {
  z-index: var(--tl-layer-canvas-hidden);
  opacity: 0;
  visibility: hidden;

  position: absolute;
  top: 0px;
  left: 0px;
  width: max-content;
  box-sizing: border-box;
  pointer-events: none;
}
```

**Critical CSS properties:**
- `visibility: hidden` (NOT `display: none`) - Browser still calculates layout, just hides visually
- `opacity: 0` - Additional visual hiding
- `pointer-events: none` - No interaction
- `position: absolute` - Out of normal flow
- Commented out debug properties show it can be made visible for debugging

## Range API implementation

### Core measurement function: measureElementTextNodeSpans (lines 159-253)

**Function signature:**
```typescript
measureElementTextNodeSpans(
  element: HTMLElement,
  { shouldTruncateToFirstLine = false }: { shouldTruncateToFirstLine?: boolean } = {}
): { spans: { box: BoxModel; text: string }[]; didTruncate: boolean }
```

**Return type - BoxModel (from tlschema/misc/geometry-types.ts):**
```typescript
export interface BoxModel {
  x: number
  y: number
  w: number
  h: number
}
```

### Algorithm breakdown

**Setup (lines 163-178):**
```typescript
const spans = []

// Measurements relative to containing element
const elmBounds = element.getBoundingClientRect()
const offsetX = -elmBounds.left
const offsetY = -elmBounds.top

// Create range for character-by-character measurement
const range = new Range()
const textNode = element.childNodes[0]
let idx = 0

let currentSpan = null
let prevCharWasSpaceCharacter = null
let prevCharTop = 0
let prevCharLeftForRTLTest = 0
let didTruncate = false
```

**Character iteration (lines 180-245):**
```typescript
for (const childNode of element.childNodes) {
  if (childNode.nodeType !== Node.TEXT_NODE) continue

  for (const char of childNode.textContent ?? '') {
    // Place range around single character
    range.setStart(textNode, idx)
    range.setEnd(textNode, idx + char.length)

    // Get character rect(s)
    const rects = range.getClientRects()
    // Take last rect - handles line break case where first rect is at line break
    const rect = rects[rects.length - 1]!

    // Calculate position relative to element
    const top = rect.top + offsetY
    const left = rect.left + offsetX
    const right = rect.right + offsetX

    // Detect RTL by checking if character moved leftward
    const isRTL = left < prevCharLeftForRTLTest

    const isSpaceCharacter = spaceCharacterRegex.test(char)

    // Detect span boundaries
    if (
      isSpaceCharacter !== prevCharWasSpaceCharacter ||  // Word boundary
      top !== prevCharTop ||                              // Line break
      !currentSpan                                        // Start of text
    ) {
      if (currentSpan) {
        // Check if we should truncate to first line
        if (shouldTruncateToFirstLine && top !== prevCharTop) {
          didTruncate = true
          break
        }
        spans.push(currentSpan)
      }

      // Start new span
      currentSpan = {
        box: { x: left, y: top, w: rect.width, h: rect.height },
        text: char,
      }
      prevCharLeftForRTLTest = left
    } else {
      // Extend current span
      if (isRTL) {
        // RTL: new character extends to the left
        currentSpan.box.x = left
        currentSpan.box.w = currentSpan.box.w + rect.width
      } else {
        // LTR: new character extends to the right
        currentSpan.box.w = right - currentSpan.box.x
      }
      currentSpan.text += char
    }

    // Handle newline for RTL detection
    if (char === '\n') {
      prevCharLeftForRTLTest = 0
    }

    prevCharWasSpaceCharacter = isSpaceCharacter
    prevCharTop = top
    idx += char.length
  }
}

// Add the last span
if (currentSpan) {
  spans.push(currentSpan)
}

return { spans, didTruncate }
```

**Space character regex (line 62):**
```typescript
const spaceCharacterRegex = /\s/
```

## RTL (Right-to-Left) detection

**Key insight:** Don't parse text or check Unicode ranges - let browser handle directionality with `dir="auto"`, then detect by character position changes.

**Algorithm (lines 197, 228-233):**
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

**Logic:** In RTL text, successive characters have decreasing left positions (march leftward). When extending a span:
- LTR: Keep left edge fixed, extend right edge
- RTL: Move left edge leftward, increase width

**Newline handling (lines 237-239):**
```typescript
if (char === '\n') {
  prevCharLeftForRTLTest = 0
}
```
Reset RTL test after newline since next line starts fresh.

## Text normalization

**Function: normalizeTextForDom (lines 5-13):**
```typescript
const fixNewLines = /\r?\n|\r/g

function normalizeTextForDom(text: string) {
  return text
    .replace(fixNewLines, '\n')  // Normalize all line endings to \n
    .split('\n')
    .map((x) => x || ' ')         // Replace empty lines with single space
    .join('\n')
}
```

**Why needed:**
- Normalize line endings: Windows (\r\n), Unix (\n), old Mac (\r) → all to \n
- Empty lines collapse in HTML - replace with space to preserve layout
- Called before setting `textContent` on measurement element

## Ellipsis truncation - two-pass algorithm

**Context:** `measureTextSpans` function (lines 263-334)

**Problem:** Adding "…" to text changes browser's whitespace collapse behavior, affecting layout of text before ellipsis.

**Solution:** Measure twice (lines 300-327)

### Pass 1: Measure ellipsis width
```typescript
if (opts.overflow === 'truncate-ellipsis' && didTruncate) {
  // First, measure how wide the ellipsis is
  elm.textContent = '…'
  const ellipsisWidth = Math.ceil(this.measureElementTextNodeSpans(elm).spans[0].box.w)
```

### Pass 2: Measure text with reduced width
```typescript
  // Subtract ellipsis width from available space
  elm.style.setProperty('width', `${elementWidth - ellipsisWidth}px`)
  elm.textContent = normalizedText
  const truncatedSpans = this.measureElementTextNodeSpans(elm, {
    shouldTruncateToFirstLine: true,
  }).spans
```

### Pass 3: Manually append ellipsis span
```typescript
  // Add ellipsis as separate span
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
}
```

**Note:** Using `Math.min` ensures ellipsis doesn't overflow container bounds.

## measureTextSpans configuration

**Options interface (lines 47-60):**
```typescript
export interface TLMeasureTextSpanOpts {
  overflow: 'wrap' | 'truncate-ellipsis' | 'truncate-clip'
  width: number
  height: number
  padding: number
  fontSize: number
  fontWeight: string
  fontFamily: string
  fontStyle: string
  lineHeight: number
  textAlign: TLDefaultHorizontalAlignStyle
  otherStyles?: Record<string, string>
  measureScrollWidth?: boolean
}
```

**Styles applied for span measurement (lines 271-286):**
```typescript
const shouldTruncateToFirstLine =
  opts.overflow === 'truncate-ellipsis' || opts.overflow === 'truncate-clip'
const elementWidth = Math.ceil(opts.width - opts.padding * 2)

const newStyles = {
  'font-family': opts.fontFamily,
  'font-style': opts.fontStyle,
  'font-weight': opts.fontWeight,
  'font-size': opts.fontSize + 'px',
  'line-height': opts.lineHeight.toString(),
  width: `${elementWidth}px`,
  height: 'min-content',
  'text-align': textAlignmentsForLtr[opts.textAlign],
  'overflow-wrap': shouldTruncateToFirstLine ? 'anywhere' : undefined,
  'word-break': shouldTruncateToFirstLine ? 'break-all' : undefined,
  ...opts.otherStyles,
}
```

**Text alignment mapping (lines 15-22):**
```typescript
const textAlignmentsForLtr = {
  start: 'left',
  'start-legacy': 'left',
  middle: 'center',
  'middle-legacy': 'center',
  end: 'right',
  'end-legacy': 'right',
}
```

**Truncation behavior:**
- When truncating: `overflow-wrap: anywhere` and `word-break: break-all` - aggressive breaking
- When wrapping: Uses default `overflow-wrap: break-word` (from initialDefaultStyles)

## Style management optimization

**setElementStyles method (lines 92-107):**
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

**Optimization:** Only updates properties that changed - avoids unnecessary reflows when measuring similar text repeatedly.

**Usage pattern:**
```typescript
const restoreStyles = this.setElementStyles(newStyles)
try {
  // ... perform measurements
} finally {
  restoreStyles()  // Always restore previous styles
}
```

## SVG export implementation

### SvgTextLabel component
**Path:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/SvgTextLabel.tsx`

**Key code (lines 42-61):**
```typescript
const opts = {
  fontSize,
  fontFamily: DefaultFontFamilies[font],
  textAlign: align,
  verticalTextAlign: verticalAlign,
  width: Math.ceil(bounds.width),
  height: Math.ceil(bounds.height),
  padding,
  lineHeight: TEXT_PROPS.lineHeight,
  fontStyle: 'normal',
  fontWeight: 'normal',
  overflow: 'wrap' as const,
  offsetX: 0,
  offsetY: 0,
  fill: labelColor,
  stroke: undefined as string | undefined,
  strokeWidth: undefined as number | undefined,
}

const spans = editor.textMeasure.measureTextSpans(text, opts)
```

**Font families (from tlschema/styles/TLFontStyle.ts lines 83-88):**
```typescript
export const DefaultFontFamilies = {
  draw: "'tldraw_draw', sans-serif",
  sans: "'tldraw_sans', sans-serif",
  serif: "'tldraw_serif', serif",
  mono: "'tldraw_mono', monospace",
}
```

**Text properties (from default-shape-constants.ts lines 4-10):**
```typescript
export const TEXT_PROPS = {
  lineHeight: 1.35,
  fontWeight: 'normal',
  fontVariant: 'normal',
  fontStyle: 'normal',
  padding: '0px',
}
```

**Font sizes (default-shape-constants.ts lines 21-26):**
```typescript
export const FONT_SIZES: Record<TLDefaultSizeStyle, number> = {
  s: 18,
  m: 24,
  l: 36,
  xl: 44,
}
```

### createTextJsxFromSpans function
**Path:** `/Users/stephenruiz/Documents/GitHub/tldraw/packages/tldraw/src/lib/shapes/shared/createTextJsxFromSpans.tsx`

**Vertical alignment calculation (lines 37-44):**
```typescript
const offsetY =
  (opts.offsetY ?? 0) +
  opts.fontSize / 2 +
  (opts.verticalTextAlign === 'start'
    ? padding
    : opts.verticalTextAlign === 'end'
      ? opts.height - padding - bounds.height
      : (Math.ceil(opts.height) - bounds.height) / 2)
```

**SVG tspan generation (lines 46-81):**
```typescript
let currentLineTop = null
const children = []
for (const { text, box } of spans) {
  // Add line break tspan when line changes
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
      unicodeBidi="plaintext"  // Critical for mixed RTL/LTR
    >
      {correctSpacesToNbsp(text)}
    </tspan>
  )

  currentLineTop = box.y
}
```

**Space to non-breaking space conversion (lines 9-11):**
```typescript
function correctSpacesToNbsp(input: string) {
  return input.replace(/\s/g, '\xa0')  // \xa0 is Unicode for &nbsp;
}
```
**Why needed:** Preserves space characters in SVG - regular spaces might collapse.

**unicodeBidi property:**
- Property: `unicodeBidi="plaintext"`
- SVG attribute (lines 72-74 comment): "while discouraged ('intended for Document Type Definition (DTD) designers'), is necessary for ensuring correct mixed RTL/LTR behavior when exporting SVGs"
- Allows proper bidirectional text rendering in SVG viewers

**Final SVG text element (lines 83-97):**
```typescript
return (
  <text
    fontSize={opts.fontSize}
    fontFamily={opts.fontFamily}
    fontStyle={opts.fontStyle}
    fontWeight={opts.fontWeight}
    dominantBaseline="mathematical"
    alignmentBaseline="mathematical"
    stroke={opts.stroke}
    strokeWidth={opts.strokeWidth}
    fill={opts.fill}
  >
    {children}
  </text>
)
```

**Baseline alignment:** `dominantBaseline="mathematical"` and `alignmentBaseline="mathematical"` ensure consistent vertical text positioning across fonts.

## Performance characteristics

**When character-by-character measurement runs:**
- During SVG export only (not interactive editing)
- Slow operation - hundreds of DOM calls per paragraph
- Acceptable because export is infrequent operation

**Simple measurement path:**
- `measureText()` and `measureHtml()` methods (lines 113-153)
- Use `getBoundingClientRect()` on entire element
- Fast - single DOM call
- Used for interactive editing, sizing, etc.

**measureText vs measureHtml:**
```typescript
measureText(textToMeasure: string, opts: TLMeasureTextOpts): BoxModel & { scrollWidth: number } {
  const div = document.createElement('div')
  div.textContent = normalizeTextForDom(textToMeasure)
  return this.measureHtml(div.innerHTML, opts)
}

measureHtml(html: string, opts: TLMeasureTextOpts): BoxModel & { scrollWidth: number } {
  // ... set styles
  elm.innerHTML = html
  const scrollWidth = opts.measureScrollWidth ? elm.scrollWidth : 0
  const rect = elm.getBoundingClientRect()
  return { x: 0, y: 0, w: rect.width, h: rect.height, scrollWidth }
}
```

## Edge cases and special handling

### Empty lines
- `normalizeTextForDom` converts empty lines to single space (line 11)
- Prevents collapse in HTML rendering
- Preserves vertical spacing

### Line break characters
- Multiple formats supported: \r\n, \n, \r
- All normalized to \n
- Newline character resets RTL detection (line 237-239)

### getClientRects() multiple rectangles
**Line 190-191 comment:** "some browsers return multiple rects for the first char in a new line - one for the line break, and one for the character itself"
**Solution:** Take last rect: `const rect = rects[rects.length - 1]!`

### Truncation boundaries
- `shouldTruncateToFirstLine` stops at first line break (lines 211-214)
- Returns `didTruncate: boolean` to signal truncation occurred
- Used by ellipsis algorithm to determine if "…" needed

### Character length handling
- Use `char.length` not `1` for index increment (lines 185-186, 243)
- Handles multi-byte characters (emoji, some Unicode)
- JavaScript strings iterate by UTF-16 code units

## Browser compatibility notes

**Range API:**
- Widely supported modern browser API
- Originally designed for text selection
- Rarely used for layout measurement (obscure use case)
- `Range.getClientRects()` returns DOMRectList

**dir="auto" attribute:**
- Browser determines text directionality automatically
- Inspects text content (Unicode bidirectional algorithm)
- No manual directionality detection needed in JS

## Related CSS for text rendering

**Base text styles (editor.css lines 651-688):**
- Extensive normalization to ensure consistent rendering
- `font-kerning: auto` - enable proper spacing
- `font-feature-settings: normal` - standard OpenType features
- `white-space: pre-wrap` - preserve spaces and wrap
- `word-spacing: 0px` - no extra word spacing
- `word-wrap: break-word` - allow breaking long words
- `writing-mode: horizontal-tb !important` - force horizontal

## Constants and magic numbers

**Line height:** 1.35 (TEXT_PROPS.lineHeight) - ratio, not pixel value

**Padding values:**
- Standard label padding: 16px (LABEL_PADDING)
- Arrow label padding: 4.25px (ARROW_LABEL_PADDING)

**Element width calculation (line 273):**
```typescript
const elementWidth = Math.ceil(opts.width - opts.padding * 2)
```
Subtracts padding from both sides, rounds up to integer pixels.

**Ellipsis width rounding (line 303):**
```typescript
const ellipsisWidth = Math.ceil(this.measureElementTextNodeSpans(elm).spans[0].box.w)
```
Round up to prevent subpixel overflow issues.

## Type definitions

**Span structure (implicit from return type):**
```typescript
{
  text: string      // The actual text content
  box: BoxModel     // Position and dimensions
}
```

**BoxModel structure (tlschema/misc/geometry-types.ts lines 7-12):**
```typescript
export interface BoxModel {
  x: number  // Left position
  y: number  // Top position
  w: number  // Width
  h: number  // Height
}
```

## Key insights summary

1. **Range API is the secret weapon** - Most developers don't know you can measure individual character positions
2. **Single measurement element** - Reused for all measurements, styled to be invisible but still laid out
3. **Browser does the heavy lifting** - dir="auto" for directionality, natural text wrapping, kerning, ligatures
4. **RTL detection via position** - Check if characters move leftward, don't parse text
5. **Ellipsis requires two passes** - Adding ellipsis changes whitespace collapse
6. **Character boundaries define spans** - Group by word/space transitions and line breaks
7. **SVG needs explicit positioning** - Every word/span gets absolute coordinates
8. **Performance trade-off** - Slow but accurate, only runs during export
9. **Whitespace normalization critical** - Empty lines become spaces, all line endings unified
10. **Style change optimization** - Only update CSS properties that changed
