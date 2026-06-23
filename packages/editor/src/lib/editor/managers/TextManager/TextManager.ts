import { BoxModel, TLDefaultHorizontalAlignStyle } from '@tldraw/tlschema'
import { objectMapKeys } from '@tldraw/utils'
import type { Editor } from '../../Editor'

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

const initialDefaultStyles = Object.freeze({
	'overflow-wrap': 'break-word',
	'word-break': 'auto',
	width: null,
	height: null,
	'max-width': null,
	'min-width': null,
})

/** @public */
export class TextManager {
	private elm: HTMLDivElement
	private poolElms: PoolItem[] = []
	private inkCtx: CanvasRenderingContext2D | null | undefined

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
			'line-height': `${resolveLineHeightPx(opts.fontSize, opts.lineHeight)}px`,
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
	 * Measure the actual ink bounds of the text rendered inside an element, in element-local
	 * coordinates (relative to the element's bounding rect). Unlike the layout (advance) box, this
	 * includes the glyph side bearings, italic slant, and tall diacritics that paint outside the
	 * advance width — the overflow that otherwise clips cursive, RTL, and italic text at the edge
	 * of its shape (see https://github.com/tldraw/tldraw/issues/8803).
	 *
	 * The element must already be laid out (attached, with client rects). Wrapping, bidi,
	 * alignment, and per-run bold/italic are all read back from the browser's layout; only the ink
	 * delta is measured with canvas. Returns null when there's no measurable text (or no canvas,
	 * e.g. in a headless environment).
	 *
	 * @public
	 */
	measureTextInkBounds(element: HTMLElement): BoxModel | null {
		const ctx = this.getInkContext()
		if (!ctx) return null

		const doc = this.editor.getContainerDocument()
		const view = doc.defaultView ?? window
		const range = doc.createRange()
		// Some non-rendering environments (e.g. jsdom under test) provide a canvas context but
		// don't lay text out, so ranges have no client rects and there's nothing to measure.
		if (typeof range.getClientRects !== 'function') return null

		const ref = element.getBoundingClientRect()
		const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT)

		let minX = Infinity
		let minY = Infinity
		let maxX = -Infinity
		let maxY = -Infinity

		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const text = node.textContent
			const parent = node.parentElement
			if (!text || !text.trim() || !parent) continue

			// Computed style is already resolved — CSS vars are expanded, and a bold/italic run
			// reports its own weight/style because it lives in its own element.
			const cs = view.getComputedStyle(parent)
			ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
			ctx.direction = cs.direction as CanvasDirection
			ctx.textAlign = 'left'
			ctx.textBaseline = 'alphabetic'

			// Fast path: a single visual line (the common autosize case) needs no per-character
			// work — measure the whole run in one canvas call. Only wrapped runs fall back to the
			// per-character line split.
			range.selectNodeContents(node)
			const lineRects = range.getClientRects()
			const lines =
				lineRects.length <= 1
					? [
							(() => {
								const r = lineRects[0] ?? range.getBoundingClientRect()
								return { text, left: r.left, top: r.top, height: r.height }
							})(),
						]
					: this.splitNodeIntoLines(node, range, text)

			for (const line of lines) {
				const m = ctx.measureText(line.text)
				const fontAscent = m.fontBoundingBoxAscent || parseFloat(cs.fontSize) || 0
				const fontDescent = m.fontBoundingBoxDescent || 0
				// Anchor the pen at the line's physical left edge and place the baseline within the
				// line box the way CSS line-height does (half-leading above the font ascent).
				const penX = line.left - ref.left
				const baseline =
					line.top - ref.top + (line.height - (fontAscent + fontDescent)) / 2 + fontAscent
				const left = penX - (m.actualBoundingBoxLeft || 0)
				const right = penX + (m.actualBoundingBoxRight || 0)
				const top = baseline - (m.actualBoundingBoxAscent || 0)
				const bottom = baseline + (m.actualBoundingBoxDescent || 0)
				if (left < minX) minX = left
				if (right > maxX) maxX = right
				if (top < minY) minY = top
				if (bottom > maxY) maxY = bottom
			}
		}

		if (!Number.isFinite(minX)) return null
		return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
	}

	// Split a wrapped text node into per-line fragments using the browser's layout: a change in a
	// character's `top` means the text moved to a new line. `left` tracks the line's physical left
	// edge (the minimum, so RTL lines anchor correctly).
	private splitNodeIntoLines(node: Node, range: Range, text: string) {
		const lines: { text: string; left: number; top: number; height: number }[] = []
		let idx = 0
		for (const char of text) {
			range.setStart(node, idx)
			range.setEnd(node, idx + char.length)
			idx += char.length
			const rects = range.getClientRects()
			const rect = rects[rects.length - 1]
			if (!rect) continue
			const last = lines[lines.length - 1]
			if (!last || rect.top !== last.top) {
				lines.push({ text: char, left: rect.left, top: rect.top, height: rect.height })
			} else {
				last.text += char
				if (rect.left < last.left) last.left = rect.left
			}
		}
		return lines
	}

	/**
	 * Render html into the measurement element once and return both its layout (advance) size and
	 * the actual ink bounds (relative to the advance box's top-left). A single-pass convenience
	 * over {@link TextManager.measureHtml} + {@link TextManager.measureTextInkBounds} for callers
	 * that need both, e.g. a text shape sizing its geometry. `ink` is null when there's no
	 * measurable text or no canvas (headless).
	 *
	 * @internal
	 */
	measureHtmlBounds(
		html: string,
		opts: TLMeasureTextOpts
	): { advance: TLMeasuredTextSize; ink: BoxModel | null } {
		const { elm } = this
		const restoreStyles = this.setElementStyles(elm, this.getMeasureStyles(opts))
		try {
			elm.innerHTML = html
			const scrollWidth = opts.measureScrollWidth ? elm.scrollWidth : 0
			const rect = elm.getBoundingClientRect()
			const advance = { x: 0, y: 0, w: rect.width, h: rect.height, scrollWidth }
			const ink = this.measureTextInkBounds(elm)
			return { advance, ink }
		} finally {
			restoreStyles()
		}
	}
}
