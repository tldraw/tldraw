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

`engine` picks a preset (`chromiumLayoutProfile`, the default, or `webkitLayoutProfile`); `profile` overrides individual fields of `LayoutProfile`: whether preserved trailing spaces count toward max-content width, whether a line is shaped as a whole or word by word, the `sub`/`super` baseline shifts, how `line-height: normal` is derived from font metrics, whether an inline box's half-leading is floored to a whole pixel (Blink does, so a line mixing fonts whose rounded ascent + descent differ in parity is a pixel shorter than the exact union of its boxes, and baselines sit up to half a pixel higher), and whether line boxes snap to whole pixels. The WebKit preset's shaping and trailing-space rules were measured with `yarn golden --webkit` (Latin text otherwise matches WebKit as closely as Chromium, 0.05px); its line-box rounding comes from the WebKit behaviour documented in tldraw issue 8970. Not in the profile: pretext's own line-fit tolerances and URL break opportunities are chosen from `navigator`, so in node the engine breaks URLs like Chromium even with `engine: 'webkit'` (13 of the 32 URL cases wrap one line later in WebKit).

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

## tldraw integration

`<Tldraw>` uses the native measurer by default, with DOM measurement during initialization, while fonts load, and for unsupported content or failed requests. Font-loading events invalidate cached measurements without recreating the editor. Custom rich text extensions and arbitrary measurement CSS use the DOM, as do scripts and emoji outside the supported Latin corpus.

If you use custom Tiptap extensions or custom rich text CSS, use `textMeasurer="dom"` and export with `text: 'foreignObject'`. The headless layout engine does not interpret extension HTML, CSS, or node views. Passing `extensions` to `createTldrawTextMeasurer` only classifies additional nodes as block or inline; it does not add support for their appearance.

Pass `textMeasurer="dom"` to force DOM measurement. An explicit `textMeasurer` instance or factory takes precedence over the default; factories receive the editor during construction and own one measurer per editor. Bare `Editor` and `<TldrawEditor>` instances continue to use DOM measurement unless a measurer is supplied.

Rich-text callers use `editor.textMeasure.measureRichText({ richText, html: () => renderHtml(richText) }, opts)` or `measureRichTextBatch`. Pretext reads the source document without evaluating the HTML callback; DOM evaluates it only when needed. Existing HTML-only implementations remain compatible through the manager's adapter. Arbitrary HTML stays on the DOM backend; the explicit Pretext measurer rejects HTML without a source document rather than approximating its geometry.

`DomTextMeasurer` and `createTldrawTextMeasurer` implement `TLTextMeasurer`. Instances supplied to an editor are disposed with it; use a factory when each editor needs its own resources. Measurement contexts supplied to the pure layout adapter remain caller-owned. Call `releaseMeasureContext(context)` after the final consumer finishes to release the engine's context registrations and caches.

Headless measurement and native SVG export can also be configured explicitly:

### Headless measurement

```ts
import { createNodeMeasureContext, installMeasureContext } from '@tldraw/rich-text-layout'
import { createTldrawTextMeasurer, setNativeTextExportMeasurer, Editor } from 'tldraw'

const measureContext = await createNodeMeasureContext({ fonts: tldrawFonts })
await installMeasureContext(measureContext)

const measurer = createTldrawTextMeasurer({ measureContext })
const editor = new Editor({ ...options, textMeasurer: measurer })
setNativeTextExportMeasurer(editor, measurer)
```

`TLEditorOptions.textMeasurer` replaces the DOM-backed `TextManager` methods (`measureText`, `measureHtml`, `measureHtmlBatch`, `measureTextSpans`). With it, the editor creates no hidden measurement elements, and text, geo, note and arrow labels and frame headings get real geometry in node. `createTldrawTextMeasurer` builds its stylesheet from the `.tl-rich-text` rules in `editor.css` (`pre-wrap`, `tab-size: 2`, `p { margin: 0; min-height: 1lh }`, list padding in `ch` with the 10/100-item gutters, heading margins and line height, `code` in `tldraw_mono`, link underline, `mark` background) on top of the user agent sheet. The four families must be registered under their CSS names (`tldraw_draw`, `tldraw_sans`, `tldraw_serif`, `tldraw_mono`); the woff2 files in `@tldraw/assets/fonts` load directly.

### Native SVG text export

```ts
const { svg } = await editor.getSvgString(ids, { text: 'native' })
```

With custom extensions, `text: 'native'` falls back to HTML `<foreignObject>` export unless you register an explicit layout provider that handles those extensions. This fallback requires an HTML-capable renderer. Custom CSS cannot be detected automatically; select `text: 'foreignObject'` explicitly for styled rich text.

`text: 'native'` (default `'foreignObject'`) makes `RichTextSVG` emit `<text>`/`<tspan>` through this engine instead of an HTML island, so rasterizers without an HTML engine (resvg, Figma import, Inkscape) render the text. In a browser it lays out with a canvas measure context; an explicit `setNativeTextExportMeasurer(editor, provider)` registration supplies its `layoutRichText` capability independently of the shape measurement backend. Register the same measurer for headless exports to use the engine that sized the shapes. The caller owns registered providers; browser-created export contexts are invalidated when fonts load and released when the editor is disposed. Fonts referenced by family name need to be resolvable by the rasterizer; resvg, for example, matches the family name inside the font file, so `tldraw_sans` has to be mapped to `IBM Plex Sans` and the woff2 decompressed to ttf (see `packages/tldraw/src/test/nativeTextExport.test.ts` for a complete node-to-PNG run whose output is committed as `__snapshots__/native-text-export.png`).

## Golden harness

`yarn golden` (in this package) measures a corpus of plain strings across the four tldraw families, four sizes and bounded/unbounded widths in Chromium, using the exact element and styles tldraw's DOM `TextManager` uses, and compares with the engine. `yarn golden --rich` adds rich text documents through `createTldrawTextMeasurer`; `--pixels` rasterizes the native SVG with Chromium and resvg and compares against Chromium's `<foreignObject>` rendering. Results land in `golden/report.md`; Chromium measurements are cached under `golden/results/` and refreshed with `--refresh`.

### Drift (macOS, Chromium 149, engine with mac system fonts as fallbacks)

Plain text, 1120 cases (35 strings × 4 families × 4 sizes × bounded/unbounded), tldraw's fonts plus mac system fonts as fallbacks:

| group                                                                                                        | max dw      | p95 dw | max dh | line mismatches |
| ------------------------------------------------------------------------------------------------------------ | ----------- | ------ | ------ | --------------- |
| Latin, punctuation, numbers, URLs, tabs, spaces, combining marks, Vietnamese, German (27 strings × 32 cases) | 0.31px      | 0.04px | 0      | 0               |
| emoji (Apple Color Emoji fallback)                                                                           | 12px        |        | 0      | 0               |
| arabic, hebrew, korean, mixed direction with the sans and draw primaries                                     | ≤0.06px     |        | 0      | 0               |
| arabic, hebrew, korean, mixed direction with the serif and mono primaries                                    | up to 203px |        | 59px   | 7               |
| chinese, japanese, thai                                                                                      | up to 95px  |        | 59px   | 18              |

Rich text, 334 cases (paragraphs, marks, hard breaks, tabs, headings h1–h6, bullet/ordered/nested lists, code, links, highlights, mixed runs): max 0.84px width and 0.9px height drift outside the CJK/RTL/emoji documents, which drift in width only, and no line-count mismatches. See `golden/report.md` for the full tables and the worst cases.

Latin text has no line-count mismatches. The last two, `paragraph/draw/36/200` and `longWords/draw/36/200`, came from the draw font (Shantell Sans): it has contextual alternates, so a word's advance is not the sum of its parts, and pretext's grapheme-sum advances broke an overlong word one grapheme early. Words that have to be broken inside are now measured by shaped prefix (see Decisions), which matches Blink's break offset.

The fallback-script drift above is specific to the node backend's fallback faces. Through a browser canvas (`createCanvasMeasureContext` in Chromium 149), the same 35 strings laid out as rich text match Chromium's DOM measurement for every script, including Chinese, Korean, Arabic, Hebrew, Thai and emoji, except Japanese at max-content width (up to 2.6px, 0.4%); no case differs in height.

### Native SVG pixel diff

Share of pixels (luminance difference over 48/255) that differ from Chromium's `<foreignObject>` rendering of the same box, over 310 rich documents in the sans and draw fonts:

| rasterizer of the native SVG | median | p95   | max   |
| ---------------------------- | ------ | ----- | ----- |
| Chromium                     | 0.21%  | 11.5% | 14.0% |
| resvg                        | 4.5%   | 7.9%  | 11.1% |

The worst cases in both rasterizers are ordered lists in the draw font (`tenItems`, `numbered`, `numberedStart`, 9–11%), where Chromium spaces the `1.` counters slightly differently from the glyph markers the engine emits. resvg also differs on long draw-font headings (Shantell Sans contextual alternates are shaped per `<tspan>` in SVG but per line in HTML) and on `link` (underline thickness and position). Glyph placement itself agrees to within a pixel.

## Decisions

Where this implementation departs from the brief, and why.

- **Paragraph-level segmentation with per-run width patching, not per-run pretext calls.** The brief suggested `prepareWithSegments` + `layoutNextLineRange` per run. Laying out runs independently breaks words at mark boundaries (`**Hello**, world` would break before the comma) because pretext can't see across runs. Instead each hard-break-free chunk is prepared once in its dominant font and the segment widths of other runs are re-measured in their own fonts (including the per-grapheme advances for `break-word`). This touches pretext's prepared arrays, which its types expose, so the coupling is isolated to `layout/inline.ts` and the pretext version is pinned.
- **Hard breaks are split outside pretext.** Chunks are split on `hardBreak` and literal newlines before prepare, so `white-space: normal` can still honour hard breaks (pretext's `normal` mode collapses newlines) and doubled breaks produce empty lines like `<br><br>`.
- **Overlong words break at shaped prefixes.** pretext's `overflow-wrap: break-word` advances are single-grapheme measurements, and in fonts with kerning or contextual alternates their sum overshoots the shaped word by several pixels per word (`(enforcement` in Shantell Sans at 26px: 184px summed, 178px shaped), so the emergency break landed a grapheme earlier than Blink, which breaks where the shaped run stops fitting. For the segments that are wider than the line, the advances are replaced with differences between shaped prefixes, measured once per chunk; segments that fit keep pretext's arrays, so ordinary paragraphs pay nothing.
- **Text-default pictographs get their break opportunities back.** pretext glues pictographs without Emoji_Presentation (🌧️, 🏷️, 🕊️) into the neighbouring word like a symbol, so `rain🌧️drops` could not wrap; Blink breaks around them (Line_Break ID). Zero-width spaces are slipped in between such a pictograph and an adjacent letter, digit or pictograph, except for the handful Chromium keeps glued (🅰 🅱 🅾 🅿 🕉). Line-break classes are otherwise pretext's approximation: `☺` stays glued where Blink breaks, `✅ ❌ ⭐` break where Blink doesn't, and a hyphen after an emoji can start a line.
- **`word-break: break-all`** is implemented by interleaving zero-width spaces between graphemes before prepare (pretext treats them as free break opportunities) and stripping them from fragments. `overflow-wrap: normal` nulls pretext's per-grapheme advances so overlong words overflow instead of breaking.
- **Tab stops** are `tab-size × space advance` of the block font, patched onto the prepared text (pretext hard-codes eight spaces). As in Blink, a tab whose next stop is less than half a space away advances to the stop after it; at tldraw's `tab-size: 2`, the golden `tabs` document in the draw font hits this. pretext's line-fit pass doesn't know this rule, so a line whose tabs hit it can fit a word that Blink would wrap. Plain-text measurement in tldraw uses the UA default of 8 because `tab-size: 2` only applies inside `.tl-rich-text`.
- **Max-content width comes from whole-fragment measurements**, not pretext's per-segment sums: fonts with kerning or contextual alternates shape a word differently from the sum of its pieces, and browsers measure the shaped run. This took the hyphen/URL cases from 9px of drift to 0.03px.
- **Trailing whitespace**: in `pre-wrap`, trailing preserved spaces count toward max-content width (Chromium includes them). At a soft wrap they hang, taking no part in alignment or `LineBox.width`; before a forced break or at the end of the paragraph Blink keeps them in the line, so a centred or end-aligned last line ending in a space sits half a space or a space further left, and the engine does the same. In `normal` they collapse away.
- **Margins**: the layout root is treated as a block formatting context (tldraw's measurement element has `contain: layout` and the label containers are inline-block or flex items), so the first top margin and last bottom margin are contained, siblings collapse to the larger margin, and a container with no padding collapses through to its first/last leaf.
- **`opts.richText` rather than an HTML parser.** tldraw's call sites only had HTML. `TLMeasureTextOpts.richText` carries the source document alongside the HTML; the DOM measurer ignores it, the headless measurer lays it out directly and only falls back to tag-stripping when it's absent.
- **`TextManager` delegates to independent backends.** `DomTextMeasurer` owns hidden DOM elements; `createTldrawTextMeasurer` adapts the layout engine; the default selection policy combines browser Pretext initialization with DOM fallback. Export uses its own explicit layout provider and does not inspect the measurement backend.
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

| case                                                                   | drift         | cause                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `japanese/*`, `chinese/*`                                              | 70–95px wide  | Chromium uses PingFang SC / Hiragino Sans on macOS; the harness can only register Hiragino Sans GB and Apple SD Gothic Neo (PingFang's `.ttc` is a stub skia can't load)                                                                                                           |
| `arabic/mono`, `hebrew/serif`, `hebrew/mono`, `korean/serif`, `thai/*` | 10–200px wide | Chromium picks a different fallback face depending on the primary font's classification (a monospace or serif Arabic/Hebrew face); with the sans and draw primaries the engine matches Chromium exactly (509.2 = 509.2 for Arabic, 554.7 = 554.7 for Hebrew, 602 = 602 for Korean) |
| `emoji/serif`                                                          | 12px at 44px  | Chromium's emoji advance with a serif primary differs; sans/draw/mono match exactly                                                                                                                                                                                                |
| `rtlBold/*`                                                            | ≤18px         | the bold Arabic run is shaped in a different fallback face than Chromium's                                                                                                                                                                                                         |
| `code/*`, `longCode/*`, `codeOnly/*`                                   | ≤1px tall     | in node, skia reports fractional `fontBoundingBoxAscent/Descent` where Blink rounds them to whole pixels before flooring the half-leading; in a browser the canvas reports Blink's rounded metrics and mixed-font lines match exactly                                              |
| lists                                                                  | ≤0.9px wide   | `ch` (zero advance) differs by a fraction of a pixel between skia and Blink                                                                                                                                                                                                        |
| `hyphenated`, `url` in the draw font                                   | ≤0.03px       | residual kerning differences                                                                                                                                                                                                                                                       |

Everything else in the corpus is within 0.2px. The headline: for the Latin-script text tldraw's bundled fonts cover, the engine reproduces Chromium's geometry; for scripts that depend on font fallback it reproduces Chromium only when it is given the same fallback face.

## Limitations

- pretext must not have been used with another canvas before `installMeasureContext` runs in the same process; the installer throws if it cannot capture pretext's context.
- No `text-indent`, `text-transform`, `word-spacing`, vertical writing, or borders/padding other than `padding-left`; no replaced elements (an image node lays out as an empty block).
- Letter spacing is applied per chunk in the dominant run's value; mixed letter spacing within a paragraph is approximated.
- Line gap is ignored for `line-height: normal` (canvas metrics don't expose it); override `LayoutProfile.normalLineHeight` if your backend knows it.
- Font fallback is the backend's job: `createCanvasMeasureContext` and `createNodeMeasureContext` take `fallbackFamilies`, and any family list in a style can name fallback faces directly. Metrics always come from the primary family, as in browsers.
