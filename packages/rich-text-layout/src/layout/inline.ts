import type { LayoutCursor, PreparedTextWithSegments } from '@chenglou/pretext'
import { DocInline } from '../document/types'
import { getPretext, pretextFontString } from '../measure/install'
import { FontSpec, MeasureContext, fontSpecToString } from '../measure/types'
import { ResolvedBlockStyle, ResolvedInlineStyle } from '../style/types'
import { detectDirection } from './bidi'
import { LayoutProfile } from './profile'
import { visualOrder } from './reorder'
import { Fragment, FragmentKind, LineBox, MarkerSymbol } from './types'

/** @internal */
export interface InlineRun {
	text: string
	style: ResolvedInlineStyle
	path: number[]
	/** Offset of `text[0]` within the source text node. */
	from: number
}

/** @internal */
export interface InlineContent {
	runs: InlineRun[]
	/** Number of forced breaks after each run index (-1 for breaks before the first run). */
	breaksAfter: Map<number, number>
}

/** @internal */
export interface InlineLayoutOptions {
	block: ResolvedBlockStyle
	maxWidth: number
	measure: MeasureContext
	profile: LayoutProfile
	/** Leading marker fragment for list items, placed before the first line. */
	marker?: {
		text: string
		style: ResolvedInlineStyle
		path: number[]
		symbol?: MarkerSymbol['shape']
	} | null
}

/** @internal */
export type InlineLine = Omit<LineBox, 'blockIndex' | 'x' | 'y'> & {
	/** Width of trailing preserved whitespace that hangs past `width`. */
	trailingWhitespaceWidth: number
	/** Whether the line ends its paragraph or at a forced break (justification leaves it ragged). */
	endsChunk: boolean
}

/** @internal */
export interface InlineLayoutResult {
	lines: InlineLine[]
	maxContentWidth: number
	direction: 'ltr' | 'rtl'
}

/**
 * Build runs from a block's inline content. Text nodes become runs carrying their resolved
 * style; hard breaks are recorded between runs.
 *
 * @internal
 */
export function buildInlineContent(
	inlines: DocInline[],
	resolveStyle: (item: Extract<DocInline, { kind: 'text' }>) => ResolvedInlineStyle
): InlineContent {
	const runs: InlineRun[] = []
	const breaksAfter = new Map<number, number>()
	for (const item of inlines) {
		if (item.kind === 'hardBreak') {
			const at = runs.length - 1
			breaksAfter.set(at, (breaksAfter.get(at) ?? 0) + 1)
			continue
		}
		runs.push({ text: item.text, style: resolveStyle(item), path: item.path, from: 0 })
	}
	return { runs, breaksAfter }
}

interface Chunk {
	text: string
	/** Run index per UTF-16 code unit. */
	runOf: number[]
	/** Offset within the run's source text node per code unit. */
	srcOff: number[]
	/** Whether synthetic zero-width breaks were injected (word-break: break-all). */
	synthetic?: boolean
}

const COLLAPSIBLE = /[ \t\n\r\f]/

function buildChunks(
	content: InlineContent,
	whiteSpace: ResolvedBlockStyle['whiteSpace'],
	wordBreak: ResolvedBlockStyle['wordBreak']
): Chunk[] {
	const chunks: Chunk[] = []
	let current: Chunk = { text: '', runOf: [], srcOff: [] }
	const push = (ch: string, run: number, off: number) => {
		current.text += ch
		for (let k = 0; k < ch.length; k++) {
			current.runOf.push(run)
			current.srcOff.push(off + k)
		}
	}
	const endChunk = () => {
		chunks.push(current)
		current = { text: '', runOf: [], srcOff: [] }
	}

	for (let r = 0; r < content.runs.length; r++) {
		const run = content.runs[r]
		const text = run.text
		for (let i = 0; i < text.length; i++) {
			const ch = text[i]
			if (whiteSpace === 'normal') {
				push(COLLAPSIBLE.test(ch) ? ' ' : ch, r, run.from + i)
			} else if (ch === '\n') {
				endChunk()
			} else if (ch === '\r') {
				// \r\n and lone \r both count as one break
				if (text[i + 1] !== '\n') endChunk()
			} else if (ch === '\f') {
				endChunk()
			} else {
				push(ch, r, run.from + i)
			}
		}
		for (let n = content.breaksAfter.get(r) ?? 0; n > 0; n--) endChunk()
	}
	chunks.push(current)
	// Breaks before the first run (hardBreak as first child) are recorded at index -1.
	for (let n = content.breaksAfter.get(-1) ?? 0; n > 0; n--) {
		chunks.unshift({ text: '', runOf: [], srcOff: [] })
	}

	const collapsed = whiteSpace === 'normal' ? chunks.map(collapseChunk) : chunks
	if (wordBreak === 'break-all') return collapsed.map(injectBreakOpportunities)
	return collapsed.map((chunk) =>
		PICTOGRAPH_BLOCK.test(chunk.text) ? injectPictographBreaks(chunk) : chunk
	)
}

const SYNTHETIC_BREAK = '\u200B'
const SPACE_GRAPHEME = /^[ \t\n]$/

/**
 * `word-break: break-all` allows a break between any two graphemes. pretext has no such mode,
 * but it treats zero-width spaces as free break opportunities, so one is slipped in between
 * graphemes. Synthetic characters carry the source offset of the character after them and are
 * stripped again when fragments are built.
 */
function injectBreakOpportunities(chunk: Chunk): Chunk {
	return injectBreaks(
		chunk,
		(prev, g) => !SPACE_GRAPHEME.test(g) && !SPACE_GRAPHEME.test(prev) && g !== SYNTHETIC_BREAK
	)
}

const PICTOGRAPH_BLOCK = /[\u{1F000}-\u{1FAFF}]/u
const PICTOGRAPH_GRAPHEME = /^[\u{1F000}-\u{1FAFF}]/u
const EMOJI_PRESENTATION = /\p{Emoji_Presentation}/u
// The assigned text-default pictographs in the block that Chromium 149 does not break around
// (Line_Break AL). Probed for every code point, bare and with U+FE0F, between two letters.
const UNBREAKABLE_PICTOGRAPH = /^[\u{1F170}\u{1F171}\u{1F17E}\u{1F17F}\u{1F549}]/u
const LETTER_OR_DIGIT_GRAPHEME = /^[\p{L}\p{N}]/u

/**
 * Pictographs in U+1F000\u2013U+1FAFF are almost all Line_Break=ID, so browsers break between them and
 * adjacent letters, digits or other pictographs. pretext only splits pictographs with
 * Emoji_Presentation and glues text-default ones (\uD83C\uDF27\uFE0F, \uD83C\uDFF7\uFE0F, \uD83D\uDD4A\uFE0F) into the neighbouring word like a
 * symbol, which made `rain\uD83C\uDF27\uFE0Fdrops` one unbreakable run. Punctuation neighbours are left to
 * pretext, which already keeps `(\uD83D\uDE00)` and `\uD83D\uDE00!` together as Blink does.
 */
function injectPictographBreaks(chunk: Chunk): Chunk {
	const glued = (g: string) =>
		PICTOGRAPH_GRAPHEME.test(g) && !EMOJI_PRESENTATION.test(g) && !UNBREAKABLE_PICTOGRAPH.test(g)
	const breakable = (g: string) => LETTER_OR_DIGIT_GRAPHEME.test(g) || PICTOGRAPH_GRAPHEME.test(g)
	const result = injectBreaks(
		chunk,
		(prev, g) => (glued(prev) && breakable(g)) || (glued(g) && breakable(prev))
	)
	return result.text.length === chunk.text.length ? chunk : result
}

function injectBreaks(chunk: Chunk, breakBefore: (prev: string, g: string) => boolean): Chunk {
	const text: string[] = []
	const runOf: number[] = []
	const srcOff: number[] = []
	let prev: string | null = null
	let i = 0
	for (const g of graphemes(chunk.text)) {
		if (prev !== null && breakBefore(prev, g)) {
			text.push(SYNTHETIC_BREAK)
			runOf.push(chunk.runOf[i])
			srcOff.push(chunk.srcOff[i])
		}
		for (let k = 0; k < g.length; k++) {
			text.push(g[k])
			runOf.push(chunk.runOf[i + k])
			srcOff.push(chunk.srcOff[i + k])
		}
		i += g.length
		prev = g
	}
	return { text: text.join(''), runOf, srcOff, synthetic: true }
}

/** CSS `white-space: normal` collapsing, kept identical to pretext's own normalization. */
function collapseChunk(chunk: Chunk): Chunk {
	const text: string[] = []
	const runOf: number[] = []
	const srcOff: number[] = []
	let prevSpace = true // trims leading spaces
	for (let i = 0; i < chunk.text.length; i++) {
		const ch = chunk.text[i]
		if (ch === ' ') {
			if (prevSpace) continue
			prevSpace = true
		} else {
			prevSpace = false
		}
		text.push(ch)
		runOf.push(chunk.runOf[i])
		srcOff.push(chunk.srcOff[i])
	}
	if (text.length > 0 && text[text.length - 1] === ' ') {
		text.pop()
		runOf.pop()
		srcOff.pop()
	}
	return { text: text.join(''), runOf, srcOff }
}

let graphemeSegmenter: Intl.Segmenter | null = null
function graphemes(text: string): string[] {
	graphemeSegmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' })
	const out: string[] = []
	for (const { segment } of graphemeSegmenter.segment(text)) out.push(segment)
	return out
}

const SPACE_KINDS = new Set(['space', 'preserved-space', 'zero-width-break'])
const PAINTLESS_KINDS = new Set(['space', 'zero-width-break'])

interface PreparedChunk {
	prepared: PreparedTextWithSegments
	segStart: number[]
	graphemeOffsets: (number[] | null)[]
	/** Segments whose per-grapheme break advances have been replaced by shaped-prefix advances. */
	shapedPrefixes: Set<number>
}

// Prepared widths depend on the backend that measured them, so each context gets its own cache.
const preparedCaches = new WeakMap<MeasureContext, Map<string, PreparedChunk>>()

function cacheFor(measure: MeasureContext) {
	let cache = preparedCaches.get(measure)
	if (!cache) {
		cache = new Map()
		preparedCaches.set(measure, cache)
	}
	return cache
}
const PREPARED_CACHE_LIMIT = 4000

function prepareChunk(
	chunk: Chunk,
	runs: InlineRun[],
	block: ResolvedBlockStyle,
	measure: MeasureContext
): PreparedChunk {
	const pretext = getPretext()

	// The run with the most characters lends its font to pretext; other runs' segments are
	// re-measured afterwards. Single-font paragraphs (the common case) need no patching.
	// Run indices never decrease within a chunk, so each run's characters are contiguous.
	const { runOf } = chunk
	let dominant = runOf.length > 0 ? runOf[0] : 0
	let best = -1
	for (let i = 0; i < runOf.length; ) {
		const r = runOf[i]
		let j = i + 1
		while (j < runOf.length && runOf[j] === r) j++
		if (j - i > best) {
			best = j - i
			dominant = r
		}
		i = j
	}
	const dominantRun = runs[dominant] ?? null
	const dominantFont: FontSpec = dominantRun ? dominantRun.style.font : block.font
	const letterSpacing = dominantRun ? dominantRun.style.letterSpacing : block.letterSpacing
	const fontString = pretextFontString(dominantFont, measure)

	const signature = runSignature(chunk, runs)
	const key = [
		chunk.text,
		fontString,
		block.whiteSpace,
		block.wordBreak,
		block.overflowWrap,
		letterSpacing,
		block.tabSize,
		signature,
	].join('\u0000')
	const preparedCache = cacheFor(measure)
	const cached = preparedCache.get(key)
	if (cached) return cached

	const prepared = pretext.prepareWithSegments(chunk.text, fontString, {
		whiteSpace: block.whiteSpace === 'normal' ? 'normal' : 'pre-wrap',
		wordBreak: block.wordBreak === 'keep-all' ? 'keep-all' : 'normal',
		letterSpacing: letterSpacing || undefined,
	})

	const segStart: number[] = []
	let offset = 0
	for (const seg of prepared.segments) {
		segStart.push(offset)
		offset += seg.length
	}
	segStart.push(offset)
	const consistent = offset === chunk.text.length
	const shapedPrefixes = new Set<number>()

	if (consistent && signature !== null) {
		patchMixedFonts(prepared, chunk, runs, dominant, segStart, measure, shapedPrefixes)
	}
	if (block.overflowWrap === 'normal' && block.wordBreak !== 'break-all') {
		// pretext always falls back to grapheme breaks for overlong words; CSS only does with
		// overflow-wrap: break-word/anywhere. Nulling the per-grapheme advances turns it off.
		for (let i = 0; i < prepared.breakableFitAdvances.length; i++) {
			prepared.breakableFitAdvances[i] = null
		}
	}
	// pretext hard-codes tab stops at eight spaces; CSS tab-size is a multiple of the block
	// font's space advance.
	prepared.tabStopAdvance = measure.measure(' ', block.font).width * block.tabSize

	const result: PreparedChunk = {
		prepared,
		segStart,
		graphemeOffsets: prepared.segments.map(() => null),
		shapedPrefixes,
	}
	if (preparedCache.size >= PREPARED_CACHE_LIMIT) {
		const oldest = preparedCache.keys().next().value
		if (oldest !== undefined) preparedCache.delete(oldest)
	}
	preparedCache.set(key, result)
	return result
}

/** Null when the chunk uses a single font (nothing to patch). */
function runSignature(chunk: Chunk, runs: InlineRun[]): string | null {
	let prev = -1
	let fontOf = ''
	let mixed = false
	const parts: string[] = []
	for (let i = 0; i < chunk.runOf.length; i++) {
		const r = chunk.runOf[i]
		if (r === prev) continue
		const f = fontSpecToString(runs[r].style.font) + '/' + runs[r].style.letterSpacing
		if (fontOf && f !== fontOf) mixed = true
		fontOf = f
		parts.push(`${i}:${f}`)
		prev = r
	}
	return mixed ? parts.join('|') : null
}

function patchMixedFonts(
	prepared: PreparedTextWithSegments,
	chunk: Chunk,
	runs: InlineRun[],
	dominant: number,
	segStart: number[],
	measure: MeasureContext,
	shapedPrefixes: Set<number>
) {
	const runFonts = runs.map((run) => fontSpecToString(run.style.font))
	const dominantFont = runFonts[dominant]
	const ls = prepared.letterSpacing
	for (let i = 0; i < prepared.segments.length; i++) {
		const s = segStart[i]
		const e = segStart[i + 1]
		const kind = prepared.kinds[i]
		if (kind === 'tab' || kind === 'soft-hyphen' || kind === 'hard-break') continue
		let needsPatch = false
		for (let c = s; c < e; c++) {
			if (runFonts[chunk.runOf[c]] !== dominantFont) {
				needsPatch = true
				break
			}
		}
		if (!needsPatch) continue

		const width = measureRange(chunk, runs, s, e, measure, ls)
		prepared.widths[i] = width
		prepared.lineEndFitAdvances[i] = SPACE_KINDS.has(kind) ? 0 : width
		prepared.lineEndPaintAdvances[i] = PAINTLESS_KINDS.has(kind) ? 0 : width
		if (prepared.breakableFitAdvances[i] !== null) {
			prepared.breakableFitAdvances[i] = shapedPrefixAdvances(chunk, runs, s, e, measure)
			shapedPrefixes.add(i)
		}
	}
}

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u

// Isolated grapheme widths lose kerning and move emergency breaks earlier than Blink.
function shapedPrefixAdvances(
	chunk: Chunk,
	runs: InlineRun[],
	s: number,
	e: number,
	measure: MeasureContext
): number[] {
	const advances: number[] = []
	let offset = s
	let prefixWidth = 0
	for (const g of graphemes(chunk.text.slice(s, e))) {
		offset += g.length
		const width = measureRange(chunk, runs, s, offset, measure, 0)
		advances.push(width - prefixWidth)
		prefixWidth = width
	}
	return advances
}

// Only overlong segments need the extra prefix measurements; cache them across widths.
function applyShapedPrefixAdvances(
	pc: PreparedChunk,
	chunk: Chunk,
	runs: InlineRun[],
	maxWidth: number,
	measure: MeasureContext
) {
	const { prepared } = pc
	// pretext already measures prefixes when letter spacing is on, and applies its own emoji
	// width correction, which a raw prefix measurement would lose.
	if (prepared.letterSpacing !== 0) return
	for (let i = 0; i < prepared.segments.length; i++) {
		if (prepared.breakableFitAdvances[i] === null || prepared.widths[i] <= maxWidth) continue
		if (pc.shapedPrefixes.has(i)) continue
		const text = prepared.segments[i]
		if (PICTOGRAPHIC.test(text)) continue
		pc.shapedPrefixes.add(i)
		prepared.breakableFitAdvances[i] = shapedPrefixAdvances(
			chunk,
			runs,
			pc.segStart[i],
			pc.segStart[i + 1],
			measure
		)
	}
}

/** Width of `chunk.text[s..e)`, measuring each run's part in its own font. */
function measureRange(
	chunk: Chunk,
	runs: InlineRun[],
	s: number,
	e: number,
	measure: MeasureContext,
	letterSpacing: number
): number {
	let width = 0
	let a = s
	while (a < e) {
		const r = chunk.runOf[a]
		let b = a + 1
		while (b < e && chunk.runOf[b] === r) b++
		width += measure.measure(chunk.text.slice(a, b), runs[r].style.font).width
		a = b
	}
	if (letterSpacing !== 0) {
		const n = graphemes(chunk.text.slice(s, e)).length
		if (n > 1) width += (n - 1) * letterSpacing
	}
	return width
}

function cursorOffset(pc: PreparedChunk, cursor: LayoutCursor): number {
	const { segmentIndex, graphemeIndex } = cursor
	if (segmentIndex >= pc.prepared.segments.length) return pc.segStart[pc.segStart.length - 1]
	if (graphemeIndex === 0) return pc.segStart[segmentIndex]
	let offsets = pc.graphemeOffsets[segmentIndex]
	if (!offsets) {
		offsets = [0]
		for (const g of graphemes(pc.prepared.segments[segmentIndex])) {
			offsets.push(offsets[offsets.length - 1] + g.length)
		}
		pc.graphemeOffsets[segmentIndex] = offsets
	}
	return pc.segStart[segmentIndex] + (offsets[graphemeIndex] ?? offsets[offsets.length - 1])
}

interface Piece {
	from: number
	to: number
	run: number
	kind: FragmentKind
	/** Bidi embedding level of the segment the piece came from. */
	level: number
}

function fragmentKind(kind: string): FragmentKind {
	if (kind === 'tab') return 'tab'
	if (kind === 'space' || kind === 'preserved-space') return 'space'
	return 'text'
}

// Blink skips to the following stop when the next one is under half a space away (verified in
// Chromium 149); without that, tabs after short words at `tab-size: 2` came out a stop too narrow.
function tabAdvance(x: number, tabStop: number, spaceWidth: number) {
	if (tabStop <= 0) return 0
	const remainder = x % tabStop
	if (Math.abs(remainder) <= 1e-6) return tabStop
	const advance = tabStop - remainder
	return advance < spaceWidth / 2 ? advance + tabStop : advance
}

interface VerticalMetrics {
	above: number
	below: number
}

function inlineBoxMetrics(
	font: FontSpec,
	lineHeight: number,
	measure: MeasureContext,
	profile: LayoutProfile
): VerticalMetrics {
	const m = measure.metrics(font)
	// CSS half-leading: the line-height is split evenly above the ascent and below the descent.
	const half = (lineHeight - (m.ascent + m.descent)) / 2
	if (profile.floorHalfLeading) {
		// Blink floors the top half and gives the remainder to the bottom, so a mixed-font line
		// whose fonts' ascent + descent differ in parity is a pixel shorter than the exact union.
		const above = m.ascent + Math.floor(half)
		return { above, below: lineHeight - above }
	}
	return { above: m.ascent + half, below: m.descent + half }
}

function baselineShiftFor(
	style: ResolvedInlineStyle,
	parentFontSize: number,
	profile: LayoutProfile
) {
	if (style.verticalAlign === 'sub') return parentFontSize * profile.subscriptShift
	if (style.verticalAlign === 'super') return -parentFontSize * profile.superscriptShift
	return 0
}

/**
 * Lay out one block's inline content into lines.
 *
 * @internal
 */
export function layoutInline(
	content: InlineContent,
	options: InlineLayoutOptions
): InlineLayoutResult {
	const { block, measure, profile } = options
	const maxWidth = block.whiteSpace === 'pre' ? Infinity : options.maxWidth
	const chunks = buildChunks(content, block.whiteSpace, block.wordBreak)
	const pretext = getPretext()

	// A trailing break (hardBreak or newline at the very end) does not open a new line.
	if (chunks.length > 1 && chunks[chunks.length - 1].text.length === 0) chunks.pop()

	const fullText = chunks.map((c) => c.text).join('\n')
	const direction: 'ltr' | 'rtl' =
		block.direction === 'auto' ? detectDirection(fullText) : block.direction

	const strut = inlineBoxMetrics(block.font, block.lineHeight, measure, profile)
	const lines: InlineLine[] = []
	let maxContentWidth = 0

	const makeLine = (
		fragments: Fragment[],
		width: number,
		trailing: number,
		endsChunk: boolean
	): InlineLine => {
		let above = strut.above
		let below = strut.below
		for (const f of fragments) {
			const m = inlineBoxMetrics(f.style.font, f.style.lineHeight, measure, profile)
			above = Math.max(above, m.above - f.baselineShift)
			below = Math.max(below, m.below + f.baselineShift)
		}
		const height = profile.roundLineBoxes ? Math.round(above + below) : above + below
		for (const f of fragments) {
			if (f.kind === 'marker' && f.symbol) f.symbol.y += above
		}
		return {
			width,
			height,
			baseline: above,
			direction,
			fragments,
			trailingWhitespaceWidth: trailing,
			endsChunk,
		}
	}

	let markerPending = options.marker ?? null
	const placeMarker = (fragments: Fragment[]) => {
		if (!markerPending) return
		const text = markerPending.text
		const m = measure.metrics(markerPending.style.font)
		const fragment: Fragment = {
			x: 0,
			width: 0,
			text,
			style: markerPending.style,
			kind: 'marker',
			source: { path: markerPending.path, from: 0, to: 0 },
			level: direction === 'rtl' ? 1 : 0,
			baselineShift: 0,
			ascent: m.ascent,
			descent: m.descent,
		}
		if (markerPending.symbol) {
			// Blink's symbol marker geometry (list_marker.cc), in whole pixels of the rounded
			// ascent: the bullet is (2A/3 + 1) / 2 wide, sits 2A/3 + 7 before the content edge and
			// 3(A - 2A/3) / 2 below the content-area top. Verified against Chromium at 16-44px.
			const ascent = Math.round(m.ascent)
			const offset = Math.floor((ascent * 2) / 3)
			const size = Math.floor((offset + 1) / 2)
			fragment.symbol = {
				shape: markerPending.symbol,
				x: -offset - 7,
				// y is completed once the line's baseline is known
				y: Math.floor((3 * (ascent - offset)) / 2) - m.ascent,
				size,
			}
			fragment.x = fragment.symbol.x
			fragment.width = size
		} else {
			// Text markers end with a space, and their box ends at the content edge.
			const width = measure.measure(text, markerPending.style.font).width
			const gap = measure.measure(' ', markerPending.style.font).width
			fragment.x = -(width + gap)
			fragment.width = width
		}
		fragments.unshift(fragment)
		markerPending = null
	}

	for (const chunk of chunks) {
		if (chunk.text.length === 0) {
			const fragments: Fragment[] = []
			placeMarker(fragments)
			lines.push(makeLine(fragments, 0, 0, true))
			continue
		}
		const pc = prepareChunk(chunk, content.runs, block, measure)
		if (maxWidth !== Infinity) {
			applyShapedPrefixAdvances(pc, chunk, content.runs, maxWidth, measure)
		}

		let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
		for (;;) {
			let prepared = pc.prepared
			if (cursor.graphemeIndex > 0 && pc.shapedPrefixes.has(cursor.segmentIndex)) {
				// Kerning cannot cross a line break. Reshape from this line's start without
				// changing cached advances, which other layouts still need from the segment start.
				const breakableFitAdvances = prepared.breakableFitAdvances.slice()
				breakableFitAdvances[cursor.segmentIndex] = [
					...breakableFitAdvances[cursor.segmentIndex]!.slice(0, cursor.graphemeIndex),
					...shapedPrefixAdvances(
						chunk,
						content.runs,
						cursorOffset(pc, cursor),
						pc.segStart[cursor.segmentIndex + 1],
						measure
					),
				]
				prepared = { ...prepared, breakableFitAdvances }
			}
			const range = pretext.layoutNextLineRange(prepared, cursor, maxWidth)
			if (!range) break
			const from = cursorOffset(pc, range.start)
			const to = cursorOffset(pc, range.end)
			if (to <= from) break

			const pieces = piecesForRange(
				pc,
				chunk,
				from,
				to,
				range.start.segmentIndex,
				direction === 'rtl' ? 1 : 0
			)
			const fragments: Fragment[] = []
			const fragmentLevels: number[] = []
			let x = 0
			for (const piece of pieces) {
				const run = content.runs[piece.run]
				let text = chunk.text.slice(piece.from, piece.to)
				if (chunk.synthetic) text = text.replaceAll(SYNTHETIC_BREAK, '')
				if (text.length === 0) continue
				let width: number
				if (piece.kind === 'tab') {
					width = tabAdvance(
						x,
						pc.prepared.tabStopAdvance,
						measure.measure(' ', run.style.font).width
					)
				} else {
					width = measure.measure(text, run.style.font).width
					if (run.style.letterSpacing !== 0)
						width += run.style.letterSpacing * graphemes(text).length
				}
				const metrics = measure.metrics(run.style.font)
				fragmentLevels.push(piece.level)
				fragments.push({
					x,
					width,
					text,
					style: run.style,
					kind: piece.kind,
					source: {
						path: run.path,
						from: chunk.srcOff[piece.from],
						to: chunk.srcOff[piece.to - 1] + 1,
					},
					level: piece.level,
					baselineShift: baselineShiftFor(run.style, block.fontSize, profile),
					ascent: metrics.ascent,
					descent: metrics.descent,
				})
				x += width
			}

			const endsChunk = to >= chunk.text.length

			// Trailing whitespace: in `normal` mode it collapses away entirely. In `pre-wrap` it is
			// preserved and hangs past the end edge at a soft wrap, taking no part in alignment or
			// the line's reported width, but before a forced break or at the end of the paragraph
			// Blink keeps it inside the line, which shifts a centred or end-aligned last line by
			// the width of its trailing spaces. It counts toward max-content width either way.
			let trailing = 0
			if (block.whiteSpace === 'normal') {
				while (fragments.length > 0 && fragments[fragments.length - 1].kind === 'space') {
					fragments.pop()
				}
			} else {
				let i = fragments.length - 1
				while (i >= 0 && fragments[i].kind === 'space') {
					trailing += fragments[i].width
					i--
				}
			}
			const hanging = endsChunk ? 0 : trailing
			const contentWidth = x - hanging

			// Mixed-direction lines: reorder fragments visually (UAX #9 L2) and re-run the x
			// positions in visual order. Hanging whitespace sits past the line's end edge, which
			// for RTL lines is the left, so it ends up at negative x.
			if (fragmentLevels.some((level) => level % 2 === 1)) {
				const order = visualOrder(fragmentLevels)
				const reordered = order.map((i) => fragments[i])
				let vx = 0
				for (const f of reordered) {
					f.x = vx
					vx += f.width
				}
				if (direction === 'rtl' && hanging > 0) {
					for (const f of reordered) f.x -= hanging
				}
				fragments.splice(0, fragments.length, ...reordered)
			}

			placeMarker(fragments)
			lines.push(makeLine(fragments, contentWidth, hanging, endsChunk))
			// Max-content comes from whole-fragment measurements rather than pretext's per-segment
			// sums: fonts with kerning or contextual alternates shape a word differently from the
			// sum of its parts, and browsers measure the shaped run.
			if (maxWidth === Infinity) {
				// pretext's range width is the sum of separately measured segments.
				const shaped = profile.shapeAcrossWordBoundaries ? x : range.width
				const lineMax = profile.trailingSpacesInMaxContent ? shaped : shaped - trailing
				maxContentWidth = Math.max(maxContentWidth, lineMax)
			}

			if (
				range.end.segmentIndex === cursor.segmentIndex &&
				range.end.graphemeIndex === cursor.graphemeIndex
			) {
				break
			}
			cursor = range.end
		}
	}

	if (lines.length === 0) {
		const fragments: Fragment[] = []
		placeMarker(fragments)
		lines.push(makeLine(fragments, 0, 0, true))
	}

	return { lines, maxContentWidth, direction }
}

function piecesForRange(
	pc: PreparedChunk,
	chunk: Chunk,
	from: number,
	to: number,
	startSegment: number,
	baseLevel: number
): Piece[] {
	const pieces: Piece[] = []
	const { segments, kinds } = pc.prepared
	// Starting at the line's first segment keeps long paragraphs linear rather than quadratic.
	for (let i = Math.min(startSegment, segments.length); i < segments.length; i++) {
		const s = Math.max(pc.segStart[i], from)
		const e = Math.min(pc.segStart[i + 1], to)
		if (e <= s) {
			if (pc.segStart[i] >= to) break
			continue
		}
		const kind = fragmentKind(kinds[i])
		const level = pc.prepared.segLevels ? pc.prepared.segLevels[i] : baseLevel
		let a = s
		while (a < e) {
			const r = chunk.runOf[a]
			let b = a + 1
			while (b < e && chunk.runOf[b] === r) b++
			const prev = pieces[pieces.length - 1]
			if (
				prev &&
				prev.run === r &&
				prev.kind === kind &&
				prev.level === level &&
				prev.to === a &&
				kind !== 'tab'
			) {
				prev.to = b
			} else {
				pieces.push({ from: a, to: b, run: r, kind, level })
			}
			a = b
		}
	}
	return pieces
}
