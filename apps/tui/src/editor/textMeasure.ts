import type {
	BatchMeasurementRequest,
	Editor,
	TLMeasuredTextSize,
	TLMeasureTextOpts,
	TLMeasureTextSpanOpts,
} from '@tldraw/editor'
import { eastAsianWidth } from 'get-east-asian-width'
import { CELL_H, CELL_W } from './constants'

/**
 * Monospace text measurement for the headless editor. jsdom has no layout, so tldraw's
 * TextManager would report every label as 0×0; these overrides lay text out on the terminal grid
 * instead, which also makes measurement identical to how the renderer draws it.
 */

export interface TextLayout {
	lines: string[]
	widthCells: number
	heightCells: number
}

export interface LayoutTextOptions {
	/** null = never wrap (explicit newlines still break). */
	maxWidthCells: number | null
	/**
	 * `wrap` (default) keeps every line; the truncate modes cap the output at `maxLines` (default
	 * 1) and `truncate-ellipsis` ends the last kept line with `…` when anything was dropped.
	 */
	overflow?: 'wrap' | 'truncate-ellipsis' | 'truncate-clip'
	maxLines?: number
	ambiguousWide?: boolean
}

const ELLIPSIS = '…'

// Local grapheme/width helpers. terminal/width.ts is the canonical implementation for rendering;
// wave 3 may point these at it. Rules: control and format characters (ZWSP, soft hyphen) are 0,
// combining marks are 0, VS16/ZWJ/regional-indicator sequences are 2, else East Asian Width.
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
const ZERO_WIDTH_LEAD = /^[\p{Mn}\p{Me}\p{Cf}]/u

function graphemes(s: string): string[] {
	const out: string[] = []
	for (const seg of segmenter.segment(s)) out.push(seg.segment)
	return out
}

function cellWidth(grapheme: string, ambiguousWide = false): 0 | 1 | 2 {
	const cp = grapheme.codePointAt(0)
	if (cp === undefined) return 0
	if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) return 0
	if (grapheme.length > 2 || (grapheme.length === 2 && cp < 0x10000)) {
		// Multi-code-point cluster: emoji presentation and ZWJ sequences render double width.
		if (grapheme.includes('️') || grapheme.includes('‍')) return 2
		const second = grapheme.codePointAt(cp > 0xffff ? 2 : 1)
		if (
			cp >= 0x1f1e6 &&
			cp <= 0x1f1ff &&
			second !== undefined &&
			second >= 0x1f1e6 &&
			second <= 0x1f1ff
		) {
			return 2
		}
	}
	if (ZERO_WIDTH_LEAD.test(grapheme)) return 0
	return eastAsianWidth(cp, { ambiguousAsWide: ambiguousWide })
}

function stringWidth(s: string, ambiguousWide = false): number {
	let w = 0
	for (const g of graphemes(s)) w += cellWidth(g, ambiguousWide)
	return w
}

function hardBreak(word: string, limit: number, ambiguousWide: boolean, out: string[]) {
	let line = ''
	let lineW = 0
	for (const g of graphemes(word)) {
		const gw = cellWidth(g, ambiguousWide)
		if (lineW + gw > limit && line !== '') {
			out.push(line)
			line = ''
			lineW = 0
		}
		line += g
		lineW += gw
	}
	out.push(line)
}

/**
 * Greedy word wrap like `overflow-wrap: break-word`: a word that does not fit moves to the next
 * line and is only broken by grapheme when it is longer than the whole line. Whitespace at a wrap
 * point hangs (dropped from the line) as in browsers.
 */
function wrapParagraph(paragraph: string, limit: number, ambiguousWide: boolean, out: string[]) {
	const tokens = paragraph.match(/\s+|\S+/g)
	if (!tokens) {
		out.push('')
		return
	}
	let line = ''
	let lineW = 0
	let pendingSpace = ''
	let pendingSpaceW = 0
	const flush = () => {
		out.push(line)
		line = ''
		lineW = 0
		pendingSpace = ''
		pendingSpaceW = 0
	}
	for (const token of tokens) {
		if (/^\s/.test(token)) {
			pendingSpace += token
			pendingSpaceW += stringWidth(token, ambiguousWide)
			continue
		}
		const wordW = stringWidth(token, ambiguousWide)
		if (lineW + pendingSpaceW + wordW <= limit) {
			line += pendingSpace + token
			lineW += pendingSpaceW + wordW
			pendingSpace = ''
			pendingSpaceW = 0
			continue
		}
		if (line !== '') flush()
		if (wordW <= limit) {
			line = token
			lineW = wordW
			continue
		}
		const pieces: string[] = []
		hardBreak(token, limit, ambiguousWide, pieces)
		const tail = pieces.pop()!
		for (const piece of pieces) out.push(piece)
		line = tail
		lineW = stringWidth(tail, ambiguousWide)
	}
	// Trailing whitespace on the paragraph's own last line is kept (it only hangs at wrap points).
	line += pendingSpace
	out.push(line)
}

function truncateLine(line: string, limit: number, ambiguousWide: boolean, ellipsis: boolean) {
	const target = ellipsis ? limit - 1 : limit
	let kept = ''
	let keptW = 0
	for (const g of graphemes(line)) {
		const gw = cellWidth(g, ambiguousWide)
		if (keptW + gw > target) break
		kept += g
		keptW += gw
	}
	if (ellipsis) return limit >= 1 ? kept.trimEnd() + ELLIPSIS : ''
	return kept
}

export function layoutText(text: string, opts: LayoutTextOptions): TextLayout {
	const overflow = opts.overflow ?? 'wrap'
	const ambiguousWide = opts.ambiguousWide ?? false
	const limit = opts.maxWidthCells === null ? Infinity : Math.max(1, Math.floor(opts.maxWidthCells))
	const paragraphs = text.replace(/\r\n?/g, '\n').split('\n')

	let lines: string[] = []
	for (const paragraph of paragraphs) {
		if (limit === Infinity) lines.push(paragraph)
		else wrapParagraph(paragraph, limit, ambiguousWide, lines)
	}

	const truncating = overflow !== 'wrap'
	const maxLines = opts.maxLines ?? (truncating ? 1 : Infinity)
	let truncated = false
	if (lines.length > Math.max(1, maxLines)) {
		lines = lines.slice(0, Math.max(1, maxLines))
		truncated = true
	}
	if (truncating) {
		// Unwrapped overflow (no limit) can still exceed a finite maxLines; with a limit every line
		// already fits, so only the ellipsis for dropped lines remains.
		const last = lines.length - 1
		if (limit !== Infinity) {
			const lastW = stringWidth(lines[last], ambiguousWide)
			if (truncated && overflow === 'truncate-ellipsis') {
				lines[last] =
					lastW + 1 <= limit
						? lines[last] + ELLIPSIS
						: truncateLine(lines[last], limit, ambiguousWide, true)
			}
		} else if (truncated && overflow === 'truncate-ellipsis') {
			lines[last] += ELLIPSIS
		}
	}

	let widthCells = 0
	for (const line of lines) widthCells = Math.max(widthCells, stringWidth(line, ambiguousWide))
	return { lines, widthCells, heightCells: Math.max(1, lines.length) }
}

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
}

function decodeEntities(s: string): string {
	return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
		if (body[0] === '#') {
			const code =
				body[1] === 'x' || body[1] === 'X'
					? parseInt(body.slice(2), 16)
					: parseInt(body.slice(1), 10)
			return Number.isFinite(code) ? String.fromCodePoint(code) : match
		}
		return NAMED_ENTITIES[body.toLowerCase()] ?? match
	})
}

/**
 * Converts the HTML tldraw hands to `measureHtml` (renderHtmlFromRichTextForMeasurement: `<div
 * class="tl-rich-text"><p dir="auto">…</p>…</div>`, empty paragraphs as `<p><br /></p>`) to the
 * plaintext `renderPlaintextFromRichText` produces, so measured and rendered text agree.
 */
export function htmlToText(html: string): string {
	let text = html
		// A <br> that ends a block is the placeholder for an empty block, not an extra line.
		.replace(/<br\s*\/?>\s*(?=<\/(?:p|li|h[1-6])>)/gi, '')
		.replace(/<br\s*\/?>/gi, '\n')
		// A paragraph inside a list item: the item supplies the line break.
		.replace(/<\/p>\s*(?=<\/li>)/gi, '')
		.replace(/<\/(?:p|li|h[1-6])>/gi, '\n')
		.replace(/<[^>]*>/g, '')
	text = decodeEntities(text)
	// The final block's closing tag adds a newline that is not part of the text.
	if (text.endsWith('\n')) text = text.slice(0, -1)
	return text
}

function parsePadding(padding: string | number | undefined): number {
	if (typeof padding === 'number') return padding
	if (!padding) return 0
	const n = parseFloat(padding)
	return Number.isFinite(n) ? n : 0
}

function measureBox(text: string, opts: TLMeasureTextOpts): TLMeasuredTextSize {
	const pad = parsePadding(opts.padding)
	const maxWidthCells =
		opts.maxWidth === null || opts.maxWidth === undefined
			? null
			: Math.max(1, Math.floor((opts.maxWidth - pad * 2) / CELL_W))
	const layout = layoutText(text, { maxWidthCells })
	let contentW = layout.widthCells * CELL_W
	if (opts.minWidth) contentW = Math.max(contentW, opts.minWidth)
	const w = contentW + pad * 2
	const h = layout.heightCells * CELL_H + pad * 2
	return { x: 0, y: 0, w, h, scrollWidth: opts.measureScrollWidth ? w : 0 }
}

/**
 * Replaces all four TextManager measurers (TextManager.ts:210-262, 398-401). Install right after
 * constructing the Editor and before any geometry is read: text/geo/note/arrow labels call
 * `measureHtml` with TipTap HTML, geo batch resizing calls `measureHtmlBatch`, frame headings call
 * `measureTextSpans`, and `measureText` is only a convenience wrapper.
 */
export function installMonospaceTextMeasure(editor: Editor): void {
	const textMeasure = editor.textMeasure

	textMeasure.measureHtml = (html: string, opts: TLMeasureTextOpts) =>
		measureBox(htmlToText(html), opts)

	textMeasure.measureText = (text: string, opts: TLMeasureTextOpts) => measureBox(text, opts)

	textMeasure.measureHtmlBatch = (requests: BatchMeasurementRequest[]) =>
		requests.map(({ html, opts }) => measureBox(htmlToText(html), opts))

	textMeasure.measureTextSpans = (text: string, opts: TLMeasureTextSpanOpts) => {
		if (text === '') return []
		const pad = opts.padding ?? 0
		const innerW = opts.width - pad * 2
		const maxWidthCells = Math.max(1, Math.floor(innerW / CELL_W))
		const layout = layoutText(text, {
			maxWidthCells,
			overflow: opts.overflow,
			maxLines: opts.overflow === 'wrap' ? undefined : 1,
		})
		return layout.lines.map((line, i) => {
			const lineW = stringWidth(line) * CELL_W
			let x = pad
			if (opts.textAlign === 'middle' || opts.textAlign === 'middle-legacy') {
				x = pad + Math.max(0, (innerW - lineW) / 2)
			} else if (opts.textAlign === 'end' || opts.textAlign === 'end-legacy') {
				x = pad + Math.max(0, innerW - lineW)
			}
			return { text: line, box: { x, y: pad + i * CELL_H, w: lineW, h: CELL_H } }
		})
	}
}
