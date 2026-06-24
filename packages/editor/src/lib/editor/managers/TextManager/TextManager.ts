import { BoxModel, TLDefaultHorizontalAlignStyle } from '@tldraw/tlschema'
import { objectMapKeys } from '@tldraw/utils'
import type { Editor } from '../../Editor'
import { EditorManager } from '../EditorManager'

/**
 * The whole-pixel line-height for a given font size and tldraw's unitless line-height
 * multiplier. tldraw's theme stores line-height as a multiplier (e.g. 1.35); resolving it
 * to a whole pixel keeps line spacing identical across rendering engines, which otherwise
 * disagree on fractional line boxes (WebKit snaps them to whole pixels, Blink keeps the
 * fraction) and let multi-line text drift apart. Apply it everywhere line-height is used —
 * measurement, on-canvas render, and export — so geometry and rendering agree.
 * See https://github.com/tldraw/tldraw/issues/8970.
 *
 * @public
 */
export function resolveLineHeightPx(fontSize: number, lineHeight: number): number {
	return Math.round(fontSize * lineHeight)
}

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

// Iterate by grapheme cluster (e.g. emoji sequences, flags, accented letters)
// rather than by code point, so a single glyph is measured as one unit.
const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

// Strong-RTL scripts, so each word's ink is measured in the direction the browser lays it out. The
// character ranges, in order: Hebrew (U+0590-05FF), Arabic (U+0600-06FF), Arabic Supplement
// (U+0750-077F), Arabic Extended-A (U+08A0-08FF), Hebrew + Arabic Presentation Forms-A
// (U+FB1D-FDFF), and Arabic Presentation Forms-B (U+FE70-FEFF).
const rtlCharacterRegex =
	/[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/

/** How far a run of glyphs' ink spills past its own advance box, on each side, in unscaled px. */
interface TextInkBleed {
	left: number
	right: number
	top: number
	bottom: number
}
const ZERO_INK_BLEED: TextInkBleed = { left: 0, right: 0, top: 0, bottom: 0 }

const initialDefaultStyles = Object.freeze({
	'overflow-wrap': 'break-word',
	'word-break': 'auto',
	width: null,
	height: null,
	'max-width': null,
	'min-width': null,
})

/** @public */
export class TextManager extends EditorManager {
	private elm: HTMLDivElement
	private poolElms: PoolItem[] = []
	private inkCtx: CanvasRenderingContext2D | null | undefined
	// Per-word ink bleed, nested font -> word -> bleed so the per-word lookup needs no string key.
	// A word shapes independently of its neighbours (whitespace breaks cursive joining), so its bleed
	// is the same wherever it wraps — measure once, reuse across every shape and width.
	private wordBleedCache = new Map<string, Map<string, TextInkBleed>>()

	constructor(editor: Editor) {
		super(editor)
		this.elm = this.createMeasurementEl()
		this.editor.getContainer().appendChild(this.elm)
		this.register(() => {
			this.elm.remove()
			for (const { el } of this.poolElms) {
				el.remove()
			}
			this.poolElms.length = 0
		})
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
			'line-height': `${resolveLineHeightPx(opts.fontSize, opts.lineHeight)}px`,
			padding: opts.padding,
			'max-width': opts.maxWidth ? opts.maxWidth + 'px' : undefined,
			'min-width': opts.minWidth ? opts.minWidth + 'px' : undefined,
			'overflow-wrap': opts.disableOverflowWrapBreaking ? 'normal' : 'break-word',
			...opts.otherStyles,
		}
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

		while (this.poolElms.length > requests.length) {
			const { el } = this.poolElms.pop()!
			el.remove()
		}

		for (let i = 0; i < requests.length; i++) {
			const { html, opts } = requests[i]
			const poolItem = this.getPoolItem(i)

			const { el } = poolItem
			this.resetElementStyles(el, poolItem.appliedStyleKeys)
			const styles = this.getMeasureStyles(opts)
			this.setElementStyles(el, styles)
			poolItem.appliedStyleKeys = Object.keys(styles)
			// Skip innerHTML parsing if the content hasn't changed
			if (poolItem.html !== html) {
				el.innerHTML = html
				poolItem.html = html
			}
		}

		const results: TLMeasuredTextSize[] = []
		for (let i = 0; i < requests.length; i++) {
			const el = this.getPoolItem(i).el
			const scrollWidth = requests[i].opts.measureScrollWidth ? el.scrollWidth : 0
			const rect = el.getBoundingClientRect()
			results.push({
				x: 0,
				y: 0,
				w: rect.width,
				h: rect.height,
				scrollWidth,
			})
		}

		return results
	}

	measureText(textToMeasure: string, opts: TLMeasureTextOpts): TLMeasuredTextSize {
		const div = this.editor.getContainerDocument().createElement('div')
		div.textContent = normalizeTextForDom(textToMeasure)
		return this.measureHtml(div.innerHTML, opts)
	}

	measureHtml(html: string, opts: TLMeasureTextOpts): TLMeasuredTextSize {
		const { elm } = this

		const restoreStyles = this.setElementStyles(elm, this.getMeasureStyles(opts))

		try {
			elm.innerHTML = html

			const scrollWidth = opts.measureScrollWidth ? elm.scrollWidth : 0
			const rect = elm.getBoundingClientRect()

			return {
				x: 0,
				y: 0,
				w: rect.width,
				h: rect.height,
				scrollWidth,
			}
		} finally {
			restoreStyles()
		}
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

			for (const { segment } of graphemeSegmenter.segment(childNode.textContent ?? '')) {
				// place the range around the grapheme we're interested in
				range.setStart(textNode, idx)
				range.setEnd(textNode, idx + segment.length)
				// measure the range. some browsers return multiple rects for the
				// first char in a new line - one for the line break, and one for
				// the character itself. we're only interested in the character.
				const rects = range.getClientRects()
				const rect = rects[rects.length - 1]

				// some graphemes produce no layout rectangle (e.g. zero-width
				// spaces or newlines). skip them rather than crashing, but keep
				// advancing the index so later graphemes stay aligned.
				// See https://github.com/tldraw/tldraw/issues/9112.
				if (!rect) {
					idx += segment.length
					continue
				}

				// calculate the position of the character relative to the element
				const top = rect.top + offsetY
				const left = rect.left + offsetX
				const right = rect.right + offsetX
				const isRTL = left < prevCharLeftForRTLTest

				const isSpaceCharacter = spaceCharacterRegex.test(segment)
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
						text: segment,
					}
					prevCharLeftForRTLTest = left
				} else {
					// Looks like we're in RTL mode, so we need to adjust the left position.
					if (isRTL) {
						currentSpan.box.x = left
					}

					// otherwise we just need to extend the current span with the next character
					currentSpan.box.w = isRTL ? currentSpan.box.w + rect.width : right - currentSpan.box.x
					currentSpan.text += segment
				}

				if (segment === '\n') {
					prevCharLeftForRTLTest = 0
				}

				prevCharWasSpaceCharacter = isSpaceCharacter
				prevCharTop = top
				idx += segment.length
			}
		}

		// Add the last span
		if (currentSpan) {
			spans.push(currentSpan)
		}

		return { spans, didTruncate }
	}

	/**
	 * Measure text into individual spans. Spans are created by rendering the
	 * text, then dividing it up according to line breaks and word boundaries.
	 *
	 * It works by having the browser render the text, then measuring the
	 * position of each character. You can use this to replicate the text-layout
	 * algorithm of the current browser in e.g. an SVG export.
	 */
	measureTextSpans(
		textToMeasure: string,
		opts: TLMeasureTextSpanOpts
	): { text: string; box: BoxModel }[] {
		if (textToMeasure === '') return []

		const { elm } = this

		const shouldTruncateToFirstLine =
			opts.overflow === 'truncate-ellipsis' || opts.overflow === 'truncate-clip'
		const elementWidth = Math.ceil(opts.width - opts.padding * 2)
		const newStyles = {
			'font-family': opts.fontFamily,
			'font-style': opts.fontStyle,
			'font-weight': opts.fontWeight,
			'font-size': opts.fontSize + 'px',
			'line-height': `${resolveLineHeightPx(opts.fontSize, opts.lineHeight)}px`,
			width: `${elementWidth}px`,
			height: 'min-content',
			'text-align': textAlignmentsForLtr[opts.textAlign],
			'overflow-wrap': shouldTruncateToFirstLine ? 'anywhere' : 'break-word',
			'word-break': shouldTruncateToFirstLine ? 'break-all' : 'normal',
			...opts.otherStyles,
		}
		const restoreStyles = this.setElementStyles(elm, newStyles)

		try {
			const normalizedText = normalizeTextForDom(textToMeasure)

			// Render the text into the measurement element:
			elm.textContent = normalizedText

			// actually measure the text:
			const { spans, didTruncate } = this.measureElementTextNodeSpans(elm, {
				shouldTruncateToFirstLine,
			})

			if (opts.overflow === 'truncate-ellipsis' && didTruncate) {
				// we need to measure the ellipsis to know how much space it takes up
				elm.textContent = '…'
				const ellipsisWidth = Math.ceil(this.measureElementTextNodeSpans(elm).spans[0].box.w)

				// then, we need to subtract that space from the width we have and measure again:
				elm.style.setProperty('width', `${elementWidth - ellipsisWidth}px`)
				elm.textContent = normalizedText
				const truncatedSpans = this.measureElementTextNodeSpans(elm, {
					shouldTruncateToFirstLine: true,
				}).spans

				// Finally, we add in our ellipsis at the end of the last span. We
				// have to do this after measuring, not before, because adding the
				// ellipsis changes how whitespace might be getting collapsed by the
				// browser.
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

			return spans
		} finally {
			restoreStyles()
		}
	}

	private getInkContext(): CanvasRenderingContext2D | null {
		if (this.inkCtx !== undefined) return this.inkCtx
		const canvas = this.editor.getContainerDocument().createElement('canvas')
		this.inkCtx = canvas.getContext('2d')
		return this.inkCtx
	}

	/**
	 * Measure how far one word's glyph ink spills past its own advance box, on each side, using canvas
	 * metrics only (no layout/reflow). The caller passes the already-built font shorthand and owns the
	 * cache; this only runs on a miss.
	 */
	private measureWordInkBleed(word: string, font: string, opts: TLMeasureTextOpts): TextInkBleed {
		const ctx = this.getInkContext()
		if (!ctx) return ZERO_INK_BLEED
		ctx.font = font
		ctx.textAlign = 'left'
		ctx.textBaseline = 'alphabetic'
		ctx.direction = rtlCharacterRegex.test(word) ? 'rtl' : 'ltr'
		const m = ctx.measureText(word)
		const lineBoxH = resolveLineHeightPx(opts.fontSize, opts.lineHeight)
		const fontAscent = m.fontBoundingBoxAscent || opts.fontSize
		const fontDescent = m.fontBoundingBoxDescent || 0
		// Where CSS line-height puts the baseline inside the line box (half-leading above the ascent).
		const baseline = (lineBoxH - (fontAscent + fontDescent)) / 2 + fontAscent
		return {
			left: Math.max(0, m.actualBoundingBoxLeft),
			right: Math.max(0, m.actualBoundingBoxRight - m.width),
			top: Math.max(0, m.actualBoundingBoxAscent - baseline),
			bottom: Math.max(0, baseline + m.actualBoundingBoxDescent - lineBoxH),
		}
	}

	/**
	 * The ink overflow of wrapped text, derived from its words' cached bleeds rather than the current
	 * layout. Lines only break at word boundaries, so any line edge is a word edge; taking the max
	 * bleed over the words bounds the spill past the advance box on every side, independent of how the
	 * text happens to wrap. The result is whole-pixel-padded so the box always contains the ink. Each
	 * word is measured once and cached (font then word), shared across every shape.
	 *
	 * @public
	 */
	measureWordsInkOverflow(
		words: string[],
		opts: TLMeasureTextOpts
	): { left: number; right: number; top: number; bottom: number } {
		// The font shorthand is identical for every word in the run, so build it and resolve its cache
		// bucket once; the per-word lookup is then a plain Map.get with no string key to build.
		const font = `${opts.fontStyle} ${opts.fontWeight} ${opts.fontSize}px ${opts.fontFamily}`
		let byWord = this.wordBleedCache.get(font)
		if (!byWord) {
			byWord = new Map()
			this.wordBleedCache.set(font, byWord)
		}
		let left = 0
		let right = 0
		let top = 0
		let bottom = 0
		for (const word of words) {
			if (!word) continue
			let b = byWord.get(word)
			if (b === undefined) {
				b = this.measureWordInkBleed(word, font, opts)
				byWord.set(word, b)
			}
			if (b.left > left) left = b.left
			if (b.right > right) right = b.right
			if (b.top > top) top = b.top
			if (b.bottom > bottom) bottom = b.bottom
		}
		return {
			left: Math.ceil(left),
			right: Math.ceil(right),
			top: Math.ceil(top),
			bottom: Math.ceil(bottom),
		}
	}
}
