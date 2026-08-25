# @tldraw/rich-text-layout

A DOM-free layout engine for rich text documents. Give it ProseMirror / TipTap JSON, a stylesheet and a way to measure glyphs, and it returns positioned lines and fragments you can render to SVG, canvas or absolutely positioned DOM. What [`@chenglou/pretext`](https://github.com/chenglou/pretext) does for a string, this does for a document.

The core knows nothing about tldraw. Node classification, styling, fonts and measurement are all injected; tldraw is the first consumer, through an adapter that lives in the `tldraw` package.

## What it does

- Walks ProseMirror JSON into blocks and inline runs using an injected `NodeRegistry`. Unknown inline nodes degrade to their text, unknown blocks to paragraphs.
- Resolves a small CSS-like style model (fonts, line height, margins, list padding, `white-space`, `overflow-wrap`, `tab-size`, `direction`, decorations, backgrounds) from an ordered rule sheet, with `px`/`em`/`ch`/`lh` units and a browser-default sheet you can layer on.
- Flows inline content over pretext: `white-space: pre-wrap`, `normal` and `pre`, mixed fonts on one line (a bold word in a sentence keeps its break opportunities), hard breaks, tabs, `overflow-wrap: break-word`, `word-break: break-all`, letter spacing, trailing-space hanging, CSS line boxes with half-leading, sub/superscripts.
- Stacks blocks with sibling and parent/child margin collapsing, `min-height`, list markers and nesting, and `direction: auto` with visual reordering of mixed-direction lines.
- Emits `<text>`/`<tspan>` SVG (plus canvas and DOM helpers) with baselines from real font metrics, so resvg, Figma and browsers all place the glyphs in the same spot.

## Installation

```bash
npm install @tldraw/rich-text-layout
# optional, for node: a canvas backend
npm install @napi-rs/canvas
```

`@chenglou/pretext` is the only runtime dependency of the core (plus `@tldraw/utils` for the library version registration every tldraw package carries). `@napi-rs/canvas` is an optional peer dependency used only by the node backend.

## Usage

### In node

```ts
import { readFileSync } from 'fs'
import {
	createNodeMeasureContext,
	installMeasureContext,
	layoutDocument,
	layoutPlainText,
	renderSvg,
} from '@tldraw/rich-text-layout'

const measureContext = await createNodeMeasureContext({
	fonts: [
		{ family: 'Inter', data: readFileSync('Inter-Regular.woff2') },
		{ family: 'Inter', data: readFileSync('Inter-Bold.woff2') },
	],
})
await installMeasureContext(measureContext) // loads pretext bound to this backend

const layout = layoutDocument(doc, {
	maxWidth: 320,
	rootStyle: { fontFamily: 'Inter', fontSize: 16, lineHeight: 1.4, whiteSpace: 'pre-wrap' },
})

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}">${renderSvg(layout)}</svg>`
```

`layoutPlainText('Hello world', { style, maxWidth })` is the same thing for a plain string.

### In the browser

Use a real canvas context; the document's fonts (loaded via `@font-face` or `FontFace`) are what it measures with.

```ts
const ctx = document.createElement('canvas').getContext('2d')!
await installMeasureContext(createCanvasMeasureContext(ctx))
```

### Measurement is injected

```ts
interface MeasureContext {
	measure(text: string, font: FontSpec): { width: number }
	metrics(font: FontSpec): { ascent: number; descent: number; zeroAdvance: number }
}
```

pretext grabs `OffscreenCanvas` (or a DOM canvas) at first use and has no injection point. `installMeasureContext` swaps in a shim canvas for the handful of synchronous calls pretext needs to capture a context, then restores the global. Every advance and metric in the engine, including pretext's own, comes from the installed context, which is how a fake context with fixed advances can drive the test suite and how a pure-JS font ruler (`@wingleeio/pretext-native`, for workers) could be dropped in without touching the core. `createFakeMeasureContext` ships for exactly that kind of test.

Call `installMeasureContext` once before laying anything out; layout functions are synchronous and throw if it has not resolved.

### Styling

A `StyleSheet` is an ordered list of `{ match, style }` rules. Later rules win; there is no specificity.

```ts
import { defaultUserAgentStyles, markRule, nodeRule } from '@tldraw/rich-text-layout'

const styles = [
	nodeRule('paragraph', { marginTop: 0, marginBottom: 0, minHeight: '1lh' }),
	nodeRule(['bulletList', 'orderedList'], { paddingLeft: '1.625ch', textAlign: 'left' }),
	nodeRule('heading', { marginTop: '5px', marginBottom: '10px', lineHeight: 1.35 }),
	markRule('code', { fontFamily: 'Menlo, monospace' }),
	markRule('highlight', (ctx) => ({ background: ctx.marks[0].attrs?.color ?? '#fddd00' })),
]

layoutDocument(doc, { styles }) // applied after defaultUserAgentStyles
```

`defaultUserAgentStyles` approximates browser defaults for the StarterKit node set: heading sizes and margins, `ul`/`ol` padding, disc/circle/square nesting, decimal counters, `code` in monospace, `sub`/`sup` sizing. Pass `userAgentStyles: null` to start from nothing. Rules get a `StyleMatchContext` (`node`, `marks`, `ancestors`, `index`, `listDepth`) and can return a declaration or compute one.

Headings, lists and code are nothing but rules; the engine has no node-type special cases. `src/consumer.test.ts` lays out a document with its own node types, marks with attributes, fonts and sheet (no user agent defaults) through the public API alone, which is the test that a second consumer needs no core changes.

### Engines

Browsers disagree on a few layout rules, and the engine makes those explicit instead of baking one browser in:

```ts
layoutDocument(doc, { engine: 'webkit' })
layoutDocument(doc, { profile: { trailingSpacesInMaxContent: false, subscriptShift: 0.25 } })
```

`engine` picks a preset (`chromiumLayoutProfile`, the default, or `webkitLayoutProfile`); `profile` overrides individual fields of `LayoutProfile`: whether preserved trailing spaces count toward max-content width, whether a line is shaped as a whole or word by word, the `sub`/`super` baseline shifts, how `line-height: normal` is derived from font metrics, and whether line boxes snap to whole pixels. The WebKit preset's shaping and trailing-space rules were measured with `yarn golden --webkit` (Latin text otherwise matches WebKit as closely as Chromium, 0.05px); its line-box rounding comes from the WebKit behaviour documented in tldraw issue 8970. Not in the profile: pretext's own line-fit tolerances and URL break opportunities are chosen from `navigator`, so in node the engine breaks URLs like Chromium even with `engine: 'webkit'` (13 of the 32 URL cases wrap one line later in WebKit).

### Alignment

`textAlign` accepts `start`, `end`, `left`, `right`, `center` and `justify`. Justified lines stretch their interior spaces; the last line of a paragraph and lines before a hard break stay ragged, as in browsers. The user agent sheet also reads TipTap's `textAlign` and `dir` block attributes (from the TextAlign and TextDirection extensions) so documents that carry alignment and direction lay out without extra rules.

### Several measure contexts

A process can hold any number of measure contexts (a browser canvas and a node canvas, or two font sets). Pass one per call with `LayoutOptions.measureContext`; `installMeasureContext` sets the default. pretext's per-font caches are namespaced by context, so switching between them costs nothing and never mixes widths.

### Output

### Hit-testing and selection

`LayoutQuery` turns a layout back into document coordinates:

```ts
const query = new LayoutQuery(layout)
query.hitTest(x, y) // → { position: { path, offset }, lineIndex, fragmentIndex, trailing }
query.caretRect({ path: [0, 0], offset: 3 }) // → { x, y, height, lineIndex }
query.rangeRects(anchor, head) // → one rect per line, zero-width for empty lines in the range
```

Positions use the same `path`/`offset` coordinates as `Fragment.source`. Points outside the text snap to the nearest line and edge; an offset shared by the end of one line and the start of the next resolves to the end of the first, the way a browser keeps the caret at the end of a wrapped line.

### List markers

Disc, circle and square markers come out as shapes, not glyphs: Blink sizes and places them from the rounded font ascent `A` (`⌊2A/3⌋`-derived width, `⌊2A/3⌋ + 7` px before the content edge, `⌊3(A − ⌊2A/3⌋)/2⌋` below the content-area top), and those rules are reproduced so the SVG, canvas and DOM renderers draw the same bullet Chromium does at every size. Counters are text with a trailing space, right-aligned to the content edge, rendered with tabular figures like `::marker`. `Fragment.symbol` carries the shape geometry for renderers of your own.

### Renderers

- `renderSvg(layout, options)` / `renderSvgTree(layout, options)`: one `<text>` per line with a `<tspan x y>` per fragment carrying `font-family`, `font-size`, `font-weight`, `font-style`, `fill`, `letter-spacing` and `text-decoration`; `<rect>`s for inline backgrounds; optional `paint-order: stroke` outlines. Baselines come from metrics, never from `dominant-baseline`.
- `drawLayout(layout, ctx)`: `fillText` per fragment.
- `renderDom(layout, { createElement })`: absolutely positioned spans.

## Golden harness

`yarn golden` (in this package) measures a corpus of plain strings across the four tldraw families, four sizes and bounded/unbounded widths in Chromium, using the exact element and styles tldraw's DOM `TextManager` uses, and compares with the engine. `yarn golden --rich` adds rich text documents through `createTldrawTextMeasurer`; `--pixels` rasterizes the native SVG with Chromium and resvg and compares against Chromium's `<foreignObject>` rendering. Results land in `golden/report.md`; Chromium measurements are cached under `golden/results/` and refreshed with `--refresh`.

### Drift (macOS, Chromium 140, engine with mac system fonts as fallbacks)

Plain text, 1120 cases (35 strings × 4 families × 4 sizes × bounded/unbounded), tldraw's fonts plus mac system fonts as fallbacks:

| group                                                                                                        | max dw      | p95 dw | max dh          | line mismatches |
| ------------------------------------------------------------------------------------------------------------ | ----------- | ------ | --------------- | --------------- |
| Latin, punctuation, numbers, URLs, tabs, spaces, combining marks, Vietnamese, German (27 strings × 32 cases) | 0.17px      | 0.05px | 49px (one line) | 2               |
| emoji (Apple Color Emoji fallback)                                                                           | 12px        |        | 0               | 0               |
| arabic, hebrew, korean, mixed direction with the sans and draw primaries                                     | 0px         |        | 0               | 0               |
| arabic, hebrew, korean with the serif and mono primaries                                                     | up to 203px |        | 59px            | 7               |
| chinese, japanese, thai                                                                                      | up to 95px  |        | 59px            | 18              |

Rich text, 296 cases (paragraphs, marks, hard breaks, headings h1–h6, bullet/ordered/nested lists, code, links, highlights, mixed runs): max 0.9px width and 1.6px height drift and no line-count mismatches outside the CJK/RTL/emoji documents. See `golden/report.md` for the full tables and the worst cases.

The two Latin line mismatches are `paragraph/draw/36/200` and `longWords/draw/36/200`: the draw font (Shantell Sans) has contextual alternates, so a word's advance is not the sum of its parts. pretext measures segments, browsers shape runs, and at a 200px wrap width one word lands on the other side of the boundary.

### Native SVG pixel diff

Share of pixels (luminance difference over 48/255) that differ from Chromium's `<foreignObject>` rendering of the same box, over 272 rich documents in the sans and draw fonts:

| rasterizer of the native SVG | median | p95  | max   |
| ---------------------------- | ------ | ---- | ----- |
| Chromium                     | 0.17%  | 6.2% | 9.0%  |
| resvg                        | 4.5%   | 9.5% | 12.7% |

The worst cases are lists in the draw font (Chromium draws bullets as shapes and spaces the `1.` counters slightly differently from the glyph markers the engine emits), `strike` in resvg (line-through thickness and position), and long draw-font headings (Shantell Sans contextual alternates are shaped per `<tspan>` in SVG but per line in HTML). Glyph placement itself agrees to within a pixel.

## Decisions

Where this implementation departs from the brief, and why.

- **Paragraph-level segmentation with per-run width patching, not per-run pretext calls.** The brief suggested `prepareWithSegments` + `layoutNextLineRange` per run. Laying out runs independently breaks words at mark boundaries (`**Hello**, world` would break before the comma) because pretext can't see across runs. Instead each hard-break-free chunk is prepared once in its dominant font and the segment widths of other runs are re-measured in their own fonts (including per-grapheme advances for `break-word`). This touches pretext's prepared arrays, which its types expose, so the coupling is isolated to `layout/inline.ts` and the pretext version is pinned.
- **Hard breaks are split outside pretext.** Chunks are split on `hardBreak` and literal newlines before prepare, so `white-space: normal` can still honour hard breaks (pretext's `normal` mode collapses newlines) and doubled breaks produce empty lines like `<br><br>`.
- **`word-break: break-all`** is implemented by interleaving zero-width spaces between graphemes before prepare (pretext treats them as free break opportunities) and stripping them from fragments. `overflow-wrap: normal` nulls pretext's per-grapheme advances so overlong words overflow instead of breaking.
- **Tab stops** are `tab-size × space advance` of the block font, patched onto the prepared text (pretext hard-codes eight spaces). Plain-text measurement in tldraw uses the UA default of 8 because `tab-size: 2` only applies inside `.tl-rich-text`.
- **Max-content width comes from whole-fragment measurements**, not pretext's per-segment sums: fonts with kerning or contextual alternates shape a word differently from the sum of its pieces, and browsers measure the shaped run. This took the hyphen/URL cases from 9px of drift to 0.03px.
- **Trailing whitespace**: in `pre-wrap`, trailing preserved spaces count toward max-content width (Chromium includes them) but not toward alignment or `LineBox.width` (they hang). In `normal` they collapse away.
- **Margins**: the layout root is treated as a block formatting context (tldraw's measurement element has `contain: layout` and the label containers are inline-block or flex items), so the first top margin and last bottom margin are contained, siblings collapse to the larger margin, and a container with no padding collapses through to its first/last leaf.
- **`opts.richText` rather than an HTML parser.** tldraw's call sites only had HTML. `TLMeasureTextOpts.richText` carries the source document alongside the HTML; the DOM measurer ignores it, the headless measurer lays it out directly and only falls back to tag-stripping when it's absent.
- **Injection keeps `editor.textMeasure: TextManager`.** `TLEditorOptions.textMeasurer` is wrapped by `TextManager`, which delegates and skips creating DOM when one is injected. The public type of `editor.textMeasure` doesn't change, and `editor.textMeasure.injected` exposes the delegate for the export path.
- **`TestEditor` now injects its character-count fake** through the option instead of monkey-patching; the full `tldraw` suite passed unchanged before and after the switch.
- **`@tldraw/utils` is a dependency** because `check-packages` requires every published package to call `registerTldrawLibraryVersion`. It has no DOM or tldraw-schema coupling; the core still has a single layout dependency, pretext.
- **The node backend is exported from the main entry** (`createNodeMeasureContext`, with a dynamic `import('@napi-rs/canvas')`) rather than a separate `backends/node` entry point: the repo's `prepack` rewrites `exports` to the root entry only. No `dependenciesMeta` entry was needed: `@napi-rs/canvas` ships prebuilt binaries as optional dependencies and has no install script.
- **Node backend retains font data and its canvas.** skia reads registered fonts through the buffer it was given; once that buffer was collected, every measurement with the face silently returned 0 (reproduced with `--expose-gc`). Font data is now copied and owned for the life of the process, and the canvas is retained alongside its context as a precaution.
- **pretext's emoji calibration is disabled under a layout-less DOM.** pretext compares canvas and DOM emoji widths when `document` exists; under jsdom the DOM span has no layout and the "correction" would be the whole glyph. The shim reports the probe glyph at no more than 1em when the document body has no layout.
- **Fallback fonts are the consumer's job.** A canvas backend in a container has no system fonts, so `createNodeMeasureContext` / `createCanvasMeasureContext` take `fallbackFamilies` that are appended to every font list; skia then picks glyphs from them for scripts the primary family lacks. The harness registers macOS system fonts for evaluation. Chromium's own fallback choices (PingFang, Apple SD Gothic Neo, Geeza Pro, Lucida Grande for Hebrew, Thonburi) vary by platform and language, so CJK/RTL/Thai widths can only ever match a browser that uses the same fallback face.
- **Bidi** uses pretext's per-segment embedding levels (first-strong paragraph direction, resolved per segment start) with a UAX #9 L2 reordering of fragments; `direction: auto` detection uses script classes, since JS regular expressions cannot test Bidi_Class. This is an approximation: neutrals at run boundaries and nested embeddings are resolved more coarsely than a full UBA implementation.
- **Vertical-align `sub`/`super`** shift the baseline by 1/5 and 1/3 of the parent font size (Blink's rule) rather than reading the font's subscript metrics.
- **`line-height: normal`** is ascent + descent from the measure context; browsers also add the font's line gap, which canvas metrics don't expose.
- **The golden harness lives in this package** (`golden/`), driven by Playwright directly rather than the examples app e2e suite: it needs no dev server, and it can build the measurement element from `editor.css` the way `TextManager` does.

## Known drift

| case                                                                   | drift          | cause                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paragraph/draw/36/200`, `longWords/draw/36/200`                       | one extra line | Shantell Sans contextual alternates: segment-sum vs shaped-run widths at a wrap boundary                                                                                                                                                                                           |
| `japanese/*`, `chinese/*`                                              | 70–95px wide   | Chromium uses PingFang SC / Hiragino Sans on macOS; the harness can only register Hiragino Sans GB and Apple SD Gothic Neo (PingFang's `.ttc` is a stub skia can't load)                                                                                                           |
| `arabic/mono`, `hebrew/serif`, `hebrew/mono`, `korean/serif`, `thai/*` | 10–200px wide  | Chromium picks a different fallback face depending on the primary font's classification (a monospace or serif Arabic/Hebrew face); with the sans and draw primaries the engine matches Chromium exactly (509.2 = 509.2 for Arabic, 554.7 = 554.7 for Hebrew, 602 = 602 for Korean) |
| `emoji/serif`                                                          | 12px at 44px   | Chromium's emoji advance with a serif primary differs; sans/draw/mono match exactly                                                                                                                                                                                                |
| `rtlBold/*`                                                            | ≤18px          | the bold Arabic run is shaped in a different fallback face than Chromium's                                                                                                                                                                                                         |
| `code/*`, `longCode/*`, `codeOnly/*`                                   | ≤1.6px tall    | `fontBoundingBoxAscent/Descent` from skia differ slightly from Blink's for IBM Plex Mono, which widens the mixed-font line box                                                                                                                                                     |
| lists                                                                  | ≤0.9px wide    | `ch` (zero advance) differs by a fraction of a pixel between skia and Blink                                                                                                                                                                                                        |
| `hyphenated`, `url` in the draw font                                   | ≤0.03px        | residual kerning differences                                                                                                                                                                                                                                                       |

Everything else in the corpus is within 0.2px. The headline: for the Latin-script text tldraw's bundled fonts cover, the engine reproduces Chromium's geometry; for scripts that depend on font fallback it reproduces Chromium only when it is given the same fallback face.

## Limitations

- pretext must not have been used with another canvas before `installMeasureContext` runs in the same process; the installer throws if it cannot capture pretext's context.
- No `text-indent`, `text-transform`, `word-spacing`, vertical writing, or borders/padding other than `padding-left`; no replaced elements (an image node lays out as an empty block).
- Letter spacing is applied per chunk in the dominant run's value; mixed letter spacing within a paragraph is approximated.
- Line gap is ignored for `line-height: normal` (canvas metrics don't expose it); override `LayoutProfile.normalLineHeight` if your backend knows it.
- Font fallback is the backend's job: `createCanvasMeasureContext` and `createNodeMeasureContext` take `fallbackFamilies`, and any family list in a style can name fallback faces directly. Metrics always come from the primary family, as in browsers.
