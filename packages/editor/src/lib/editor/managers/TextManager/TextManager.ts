import { BoxModel, TLDefaultHorizontalAlignStyle } from '@tldraw/tlschema'
import { objectMapKeys } from '@tldraw/utils'
import type { Editor } from '../../Editor'
import {
	clearCache,
	layout,
	layoutWithLines,
	prepareWithSegments,
	walkLineRanges,
	type PreparedTextWithSegments,
} from './pretext/layout'

const fixNewLines = /\r?\n|\r/g

function normalizeTextForDom(text: string) {
	return text
		.replace(fixNewLines, '\n')
		.split('\n')
		.map((x) => x || ' ')
		.join('\n')
}

const textAlignmentsForLtr = {
	start: 'left',
	'start-legacy': 'left',
	middle: 'center',
	'middle-legacy': 'center',
	end: 'right',
	'end-legacy': 'right',
}

interface PoolItem {
	el: HTMLDivElement
	html: string
	appliedStyleKeys: string[]
}

/** @public */
export interface BatchMeasurementRequest {
	html: string
	opts: TLMeasureTextOpts
}

/** @public */
export type TLMeasuredTextSize = BoxModel & {
	scrollWidth: number
}

/** @public */
export interface TLMeasureTextOpts {
	fontStyle: string
	fontWeight: string
	fontFamily: string
	fontSize: number
	/** This must be a number, e.g. 1.35, not a pixel value. */
	lineHeight: number
	/**
	 * When maxWidth is a number, the text will be wrapped to that maxWidth. When maxWidth
	 * is null, the text will be measured without wrapping, but explicit line breaks and
	 * space are preserved.
	 */
	maxWidth: null | number
	minWidth?: null | number
	// todo: make this a number so that it is consistent with other TLMeasureTextSpanOpts
	padding: string
	otherStyles?: Record<string, string>
	disableOverflowWrapBreaking?: boolean
	measureScrollWidth?: boolean
}

/** @public */
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

const spaceCharacterRegex = /\s/

const initialDefaultStyles = Object.freeze({
	'overflow-wrap': 'break-word',
	'word-break': 'auto',
	width: null,
	height: null,
	'max-width': null,
	'min-width': null,
})

// --- Pretext helpers ---

function buildFontString(opts: {
	fontStyle: string
	fontWeight: string
	fontSize: number
	fontFamily: string
}): string {
	return `${opts.fontStyle} ${opts.fontWeight} ${opts.fontSize}px ${opts.fontFamily}`
}

function parsePadding(padding: string): number {
	// Padding is usually a simple "Xpx" string
	const match = padding.match(/^(\d+(?:\.\d+)?)px$/)
	return match ? parseFloat(match[1]) : 0
}

const htmlEntityMap: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'",
	'&apos;': "'",
	'&#x27;': "'",
	'&#x2F;': '/',
	'&nbsp;': ' ',
}

const htmlEntityRegex = /&(?:amp|lt|gt|quot|apos|nbsp|#39|#x27|#x2F);/g

function stripHtmlToText(html: string): string {
	// Convert paragraph breaks to newlines
	let text = html.replace(/<\/p>\s*<p[^>]*>/gi, '\n')
	// Convert <br> tags to newlines
	text = text.replace(/<br\s*\/?>/gi, '\n')
	// Strip all remaining HTML tags
	text = text.replace(/<[^>]+>/g, '')
	// Decode HTML entities
	text = text.replace(htmlEntityRegex, (entity) => htmlEntityMap[entity] ?? entity)
	return text
}

// --- PreparedText cache ---
// Caches PreparedTextWithSegments by (text, font) so that subsequent
// measurements of the same text at different widths only pay the cheap
// layout() cost (~0.0002ms) instead of re-preparing (~0.03ms).

const preparedCache = new Map<string, PreparedTextWithSegments>()
const PREPARED_CACHE_MAX = 2048

function getCachedPrepared(text: string, font: string): PreparedTextWithSegments {
	const key = text + '\0' + font
	let prepared = preparedCache.get(key)
	if (prepared) return prepared

	// Evict entire cache when it gets too large (simple strategy, avoids LRU overhead)
	if (preparedCache.size >= PREPARED_CACHE_MAX) {
		preparedCache.clear()
	}

	prepared = prepareWithSegments(text, font)
	preparedCache.set(key, prepared)
	return prepared
}

/**
 * Measure text using pretext by splitting into paragraphs (to handle newlines,
 * since pretext only supports white-space: normal).
 *
 * Uses a single walkLineRanges pass per paragraph for both width and height,
 * and reuses cached PreparedTextWithSegments handles across calls.
 */
function measureWithPretext(
	text: string,
	font: string,
	maxWidth: number,
	lineHeightPx: number
): { w: number; h: number } {
	if (text === '') return { w: 0, h: 0 }

	const paragraphs = text.split('\n')
	let totalHeight = 0
	let maxLineWidth = 0

	for (let i = 0; i < paragraphs.length; i++) {
		const para = paragraphs[i]
		if (para === '' || para === ' ') {
			// Empty paragraph = one line of height
			totalHeight += lineHeightPx
			continue
		}

		const prepared = getCachedPrepared(para, font)

		// Single pass: walkLineRanges gives us both line count and max width
		const lineCount = walkLineRanges(prepared, maxWidth, (line) => {
			if (line.width > maxLineWidth) maxLineWidth = line.width
		})
		totalHeight += lineCount * lineHeightPx
	}

	return { w: Math.ceil(maxLineWidth), h: Math.ceil(totalHeight) }
}

/** @public */
export class TextManager {
	private elm: HTMLDivElement
	private poolElms: PoolItem[] = []

	constructor(public editor: Editor) {
		this.elm = this.createMeasurementEl()
		this.editor.getContainer().appendChild(this.elm)
	}

	private createMeasurementEl(): HTMLDivElement {
		const elm = this.editor.getContainerDocument().createElement('div')
		elm.classList.add('tl-text')
		elm.classList.add('tl-text-measure')
		elm.setAttribute('dir', 'auto')
		elm.tabIndex = -1
		for (const key of objectMapKeys(initialDefaultStyles)) {
			elm.style.setProperty(key, initialDefaultStyles[key])
		}

		return elm
	}

	private resetElementStyles(el: HTMLElement, appliedStyleKeys: string[]) {
		for (const key of appliedStyleKeys) {
			if (key in initialDefaultStyles) {
				el.style.setProperty(key, initialDefaultStyles[key as keyof typeof initialDefaultStyles])
			} else {
				el.style.removeProperty(key)
			}
		}
	}

	private setElementStyles(el: HTMLElement, styles: Record<string, string | undefined | null>) {
		type StyleValue = string | null
		type RestoreEntry = [prop: string, value: StyleValue]

		const restore: RestoreEntry[] = []

		for (const [key, nextValue] of Object.entries(styles)) {
			const oldValue = el.style.getPropertyValue(key)

			if (typeof nextValue === 'string') {
				if (oldValue === nextValue) continue
				restore.push([key, oldValue || null])
				el.style.setProperty(key, nextValue)
			} else {
				if (!oldValue) continue
				restore.push([key, oldValue])
				el.style.removeProperty(key)
			}
		}

		return () => {
			for (const [key, value] of restore) {
				if (value === null || value === '') el.style.removeProperty(key)
				else el.style.setProperty(key, value)
			}
		}
	}

	private getMeasureStyles(opts: TLMeasureTextOpts): Record<string, string | undefined> {
		return {
			'font-family': opts.fontFamily,
			'font-style': opts.fontStyle,
			'font-weight': opts.fontWeight,
			'font-size': opts.fontSize + 'px',
			'line-height': opts.lineHeight.toString(),
			padding: opts.padding,
			'max-width': opts.maxWidth ? opts.maxWidth + 'px' : undefined,
			'min-width': opts.minWidth ? opts.minWidth + 'px' : undefined,
			'overflow-wrap': opts.disableOverflowWrapBreaking ? 'normal' : 'break-word',
			...opts.otherStyles,
		}
	}

	dispose() {
		this.elm.remove()
		for (const { el } of this.poolElms) {
			el.remove()
		}
		this.poolElms.length = 0
		preparedCache.clear()
		clearCache()
	}

	private ensurePoolSize(size: number) {
		if (this.poolElms.length >= size) return

		const fragment = this.editor.getContainerDocument().createDocumentFragment()
		while (this.poolElms.length < size) {
			const el = this.createMeasurementEl()
			this.poolElms.push({ el, html: '', appliedStyleKeys: [] })
			fragment.appendChild(el)
		}
		this.editor.getContainer().appendChild(fragment)
	}

	private getPoolItem(index: number): PoolItem {
		this.ensurePoolSize(index + 1)
		return this.poolElms[index]
	}

	measureHtmlBatch(requests: BatchMeasurementRequest[]): TLMeasuredTextSize[] {
		if (requests.length === 0) return []

		return requests.map(({ html, opts }) => this.measureHtml(html, opts))
	}

	measureText(textToMeasure: string, opts: TLMeasureTextOpts): TLMeasuredTextSize {
		const text = normalizeTextForDom(textToMeasure)
		const font = buildFontString(opts)
		const padding = parsePadding(opts.padding)
		const lineHeightPx = opts.lineHeight * opts.fontSize
		const maxWidth = opts.maxWidth ? opts.maxWidth - padding * 2 : 1e9

		const { w, h } = measureWithPretext(text, font, maxWidth, lineHeightPx)

		// For scrollWidth, reuse the same cached prepared handles — only the
		// layout pass (walkLineRanges with Infinity width) is repeated, which
		// is pure arithmetic over already-cached segment widths.
		let scrollWidth = 0
		if (opts.measureScrollWidth) {
			const { w: unwrappedW } = measureWithPretext(text, font, 1e9, lineHeightPx)
			scrollWidth = unwrappedW + padding * 2
		}

		const resultW = Math.max(w + padding * 2, opts.minWidth ?? 0)

		return {
			x: 0,
			y: 0,
			w: resultW,
			h: h + padding * 2,
			scrollWidth,
		}
	}

	measureHtml(html: string, opts: TLMeasureTextOpts): TLMeasuredTextSize {
		const text = stripHtmlToText(html)
		return this.measureText(text, opts)
	}

	/**
	 * Given an html element, measure the position of each span of unbroken
	 * word/white-space characters within any text nodes it contains.
	 */
	measureElementTextNodeSpans(
		element: HTMLElement,
		{ shouldTruncateToFirstLine = false }: { shouldTruncateToFirstLine?: boolean } = {}
	): { spans: { box: BoxModel; text: string }[]; didTruncate: boolean } {
		const spans = []

		// Measurements of individual spans are relative to the containing element
		const elmBounds = element.getBoundingClientRect()
		const offsetX = -elmBounds.left
		const offsetY = -elmBounds.top

		// we measure by creating a range that spans each character in the elements text node
		const range = new Range()
		const textNode = element.childNodes[0]
		let idx = 0

		let currentSpan = null
		let prevCharWasSpaceCharacter = null
		let prevCharTop = 0
		let prevCharLeftForRTLTest = 0
		let didTruncate = false
		for (const childNode of element.childNodes) {
			if (childNode.nodeType !== Node.TEXT_NODE) continue

			for (const char of childNode.textContent ?? '') {
				// place the range around the characters we're interested in
				range.setStart(textNode, idx)
				range.setEnd(textNode, idx + char.length)
				// measure the range. some browsers return multiple rects for the
				// first char in a new line - one for the line break, and one for
				// the character itself. we're only interested in the character.
				const rects = range.getClientRects()
				const rect = rects[rects.length - 1]!

				// calculate the position of the character relative to the element
				const top = rect.top + offsetY
				const left = rect.left + offsetX
				const right = rect.right + offsetX
				const isRTL = left < prevCharLeftForRTLTest

				const isSpaceCharacter = spaceCharacterRegex.test(char)
				if (
					// If we're at a word boundary...
					isSpaceCharacter !== prevCharWasSpaceCharacter ||
					// ...or we're on a different line...
					top !== prevCharTop ||
					// ...or we're at the start of the text and haven't created a span yet...
					!currentSpan
				) {
					// ...then we're at a span boundary!

					if (currentSpan) {
						// if we're truncating to a single line & we just finished the first line, stop there
						if (shouldTruncateToFirstLine && top !== prevCharTop) {
							didTruncate = true
							break
						}
						// otherwise add the span to the list ready to start a new one
						spans.push(currentSpan)
					}

					// start a new span
					currentSpan = {
						box: { x: left, y: top, w: rect.width, h: rect.height },
						text: char,
					}
					prevCharLeftForRTLTest = left
				} else {
					// Looks like we're in RTL mode, so we need to adjust the left position.
					if (isRTL) {
						currentSpan.box.x = left
					}

					// otherwise we just need to extend the current span with the next character
					currentSpan.box.w = isRTL ? currentSpan.box.w + rect.width : right - currentSpan.box.x
					currentSpan.text += char
				}

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
	}

	/**
	 * Measure text into individual spans. Spans are created using pretext's
	 * segment-level layout, then grouped by word/space boundaries.
	 *
	 * You can use this to replicate the text-layout algorithm in e.g. an SVG export.
	 */
	measureTextSpans(
		textToMeasure: string,
		opts: TLMeasureTextSpanOpts
	): { text: string; box: BoxModel }[] {
		if (textToMeasure === '') return []

		const font = buildFontString(opts)
		const lineHeightPx = opts.lineHeight * opts.fontSize
		const shouldTruncateToFirstLine =
			opts.overflow === 'truncate-ellipsis' || opts.overflow === 'truncate-clip'
		const elementWidth = Math.ceil(opts.width - opts.padding * 2)

		const normalizedText = normalizeTextForDom(textToMeasure)
		const paragraphs = normalizedText.split('\n')

		const allSpans: { text: string; box: BoxModel }[] = []
		let yOffset = 0

		for (const para of paragraphs) {
			if (para === '' || para === ' ') {
				yOffset += lineHeightPx
				if (shouldTruncateToFirstLine && allSpans.length > 0) break
				continue
			}

			const prepared = getCachedPrepared(para, font)
			const maxWidth = shouldTruncateToFirstLine ? 1e9 : elementWidth
			const { lines } = layoutWithLines(prepared, maxWidth, lineHeightPx)

			for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
				if (shouldTruncateToFirstLine && (lineIdx > 0 || allSpans.length > 0)) break

				const line = lines[lineIdx]
				const lineY = yOffset + lineIdx * lineHeightPx

				// Compute alignment offset
				let alignOffsetX = 0
				const align = textAlignmentsForLtr[opts.textAlign] ?? 'left'
				if (align === 'center') {
					alignOffsetX = (elementWidth - line.width) / 2
				} else if (align === 'right') {
					alignOffsetX = elementWidth - line.width
				}

				// Build spans from segments within this line
				const lineSpans = buildSpansFromLine(prepared, line, lineY, lineHeightPx, alignOffsetX)
				for (const span of lineSpans) {
					allSpans.push(span)
				}
			}

			yOffset += lines.length * lineHeightPx

			if (shouldTruncateToFirstLine && allSpans.length > 0) break
		}

		// Handle truncate-ellipsis
		if (opts.overflow === 'truncate-ellipsis' && allSpans.length > 0) {
			// Get ellipsis width from cached prepared handle
			const ellipsisPrepared = getCachedPrepared('…', font)
			let ellipsisWidth = 0
			walkLineRanges(ellipsisPrepared, 1e9, (l) => {
				ellipsisWidth = l.width
			})

			// Check if the text was actually truncated (more content than fits on one line)
			const fullText = normalizedText.replace(/\n/g, ' ')
			const fullPrepared = getCachedPrepared(fullText, font)
			const fullResult = layout(fullPrepared, 1e9, lineHeightPx)
			const wasTruncated = fullResult.lineCount > 1 || paragraphs.length > 1

			if (wasTruncated) {
				// Re-measure with reduced width for ellipsis
				const reducedWidth = elementWidth - Math.ceil(ellipsisWidth)
				const rePrepared = getCachedPrepared(paragraphs[0] === '' ? ' ' : paragraphs[0], font)
				const reLayout = layoutWithLines(rePrepared, reducedWidth, lineHeightPx)

				if (reLayout.lines.length > 0) {
					const firstLine = reLayout.lines[0]

					// Rebuild spans from the truncated first line
					allSpans.length = 0
					const truncatedSpans = buildSpansFromLine(
						rePrepared,
						firstLine,
						0,
						lineHeightPx,
						0 // no alignment for truncated text
					)
					for (const span of truncatedSpans) {
						allSpans.push(span)
					}

					// Add ellipsis span
					const lastSpan = allSpans[allSpans.length - 1]
					const ellipsisX = lastSpan
						? Math.min(lastSpan.box.x + lastSpan.box.w, opts.width - opts.padding - ellipsisWidth)
						: 0
					allSpans.push({
						text: '…',
						box: {
							x: ellipsisX,
							y: lastSpan?.box.y ?? 0,
							w: ellipsisWidth,
							h: lineHeightPx,
						},
					})
				}
			}
		}

		return allSpans
	}
}

/**
 * Build per-word/space spans from a pretext layout line using the segment data.
 */
function buildSpansFromLine(
	prepared: PreparedTextWithSegments,
	line: {
		text: string
		width: number
		start: { segmentIndex: number; graphemeIndex: number }
		end: { segmentIndex: number; graphemeIndex: number }
	},
	lineY: number,
	lineHeightPx: number,
	alignOffsetX: number
): { text: string; box: BoxModel }[] {
	const spans: { text: string; box: BoxModel }[] = []

	// Use the line text and compute approximate word/space spans
	// by walking through the text and grouping by space/non-space boundaries
	const lineText = line.text
	if (lineText.length === 0) return spans

	// We need segment widths to position spans accurately. Walk through the
	// segments that belong to this line and accumulate positions.
	const internalPrepared = prepared as unknown as {
		widths: number[]
		kinds: string[]
		segments: string[]
		breakableWidths: (number[] | null)[]
	}

	let xPos = alignOffsetX
	let currentText = ''
	let currentX = alignOffsetX
	let currentIsSpace: boolean | null = null

	// Walk segments within the line range
	const startSeg = line.start.segmentIndex
	const endSeg = line.end.segmentIndex
	const startGrapheme = line.start.graphemeIndex

	for (let si = startSeg; si <= endSeg && si < internalPrepared.segments.length; si++) {
		const segText = internalPrepared.segments[si]
		const segWidth = internalPrepared.widths[si]
		const segKind = internalPrepared.kinds[si]

		if (segKind === 'soft-hyphen') continue

		// Handle partial segments at start/end of line
		let text = segText
		let width = segWidth

		if (si === startSeg && startGrapheme > 0) {
			// Partial segment at start - approximate width proportionally
			const fullLen = segText.length
			text = segText.slice(startGrapheme)
			width = segWidth * (text.length / fullLen)
		}

		if (si === endSeg && line.end.graphemeIndex > 0) {
			// Partial segment at end
			const fullLen = segText.length
			if (si === startSeg && startGrapheme > 0) {
				text = segText.slice(startGrapheme, line.end.graphemeIndex)
			} else {
				text = segText.slice(0, line.end.graphemeIndex)
			}
			width = segWidth * (text.length / fullLen)
		} else if (si === endSeg && line.end.graphemeIndex === 0) {
			// End segment with graphemeIndex 0 means we don't include this segment
			break
		}

		const isSpace = segKind === 'space'

		if (currentIsSpace !== null && isSpace !== currentIsSpace) {
			// Boundary between space and non-space - emit current span
			if (currentText.length > 0) {
				spans.push({
					text: currentText,
					box: { x: currentX, y: lineY, w: xPos - currentX, h: lineHeightPx },
				})
			}
			currentText = text
			currentX = xPos
			currentIsSpace = isSpace
		} else {
			if (currentIsSpace === null) {
				currentIsSpace = isSpace
				currentX = xPos
			}
			currentText += text
		}

		xPos += width
	}

	// Emit final span
	if (currentText.length > 0) {
		spans.push({
			text: currentText,
			box: { x: currentX, y: lineY, w: xPos - currentX, h: lineHeightPx },
		})
	}

	return spans
}
