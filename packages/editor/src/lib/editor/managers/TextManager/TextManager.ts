import { BoxModel, TLDefaultHorizontalAlignStyle } from '@tldraw/tlschema'
import { objectMapKeys } from '@tldraw/utils'
import { varPreLine } from 'uwrap'
import type { Editor } from '../../Editor'

const fixNewLines = /\r?\n|\r/g

function normalizeTextForDom(text: string) {
	return text
		.replace(fixNewLines, '\n')
		.split('\n')
		.map((x) => x || ' ')
		.join('\n')
}

/**
 * Parse a CSS padding string into top/right/bottom/left pixel values.
 * Handles 1-4 value padding shorthand (assumes px units).
 */
function parsePadding(padding: string): {
	top: number
	right: number
	bottom: number
	left: number
} {
	const parts = padding
		.trim()
		.split(/\s+/)
		.map((p) => parseFloat(p) || 0)
	switch (parts.length) {
		case 1:
			return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] }
		case 2:
			return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] }
		case 3:
			return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] }
		default:
			return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] }
	}
}

type UWrapInstance = ReturnType<typeof varPreLine>

const textAlignmentsForLtr = {
	start: 'left',
	'start-legacy': 'left',
	middle: 'center',
	'middle-legacy': 'center',
	end: 'right',
	'end-legacy': 'right',
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
	private canvas: HTMLCanvasElement
	private canvasCtx: CanvasRenderingContext2D
	private uwrapCache = new Map<string, UWrapInstance>()
	private resolvedFontCache = new Map<string, string>()

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

		// Create an off-screen canvas for uWrap text measurement
		this.canvas = document.createElement('canvas')
		this.canvasCtx = this.canvas.getContext('2d')!
	}

	/**
	 * Resolve a CSS font-family value (which may contain CSS variables like
	 * `var(--tl-font-draw)`) to the actual computed font-family string.
	 */
	private resolveFontFamily(fontFamily: string): string {
		const cached = this.resolvedFontCache.get(fontFamily)
		if (cached) return cached

		// Use the measurement element to resolve CSS variables
		const prev = this.elm.style.fontFamily
		this.elm.style.fontFamily = fontFamily
		const resolved = getComputedStyle(this.elm).fontFamily
		this.elm.style.fontFamily = prev

		this.resolvedFontCache.set(fontFamily, resolved)
		return resolved
	}

	/**
	 * Get or create a uWrap instance for the given font configuration.
	 * uWrap instances are cached by a key derived from the font properties.
	 */
	private getUWrap(opts: {
		fontFamily: string
		fontSize: number
		fontWeight: string
		fontStyle: string
		lineHeight: number
	}): UWrapInstance {
		const resolvedFamily = this.resolveFontFamily(opts.fontFamily)
		const key = `${opts.fontStyle} ${opts.fontWeight} ${opts.fontSize}px/${opts.lineHeight} ${resolvedFamily}`

		const cached = this.uwrapCache.get(key)
		if (cached) return cached

		// Configure the canvas context with the font
		const ctx = this.canvasCtx
		ctx.font = `${opts.fontStyle} ${opts.fontWeight} ${opts.fontSize}px ${resolvedFamily}`
		// Note: Canvas2D doesn't directly support lineHeight, but uWrap only needs
		// the font for character width measurement. Line height is handled separately.

		const wrapper = varPreLine(ctx)
		this.uwrapCache.set(key, wrapper)
		return wrapper
	}

	private setElementStyles(styles: Record<string, string | undefined>) {
		const stylesToReinstate = {} as any
		for (const key of objectMapKeys(styles)) {
			if (typeof styles[key] === 'string') {
				const oldValue = this.elm.style.getPropertyValue(key)
				if (oldValue === styles[key]) continue
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

	dispose() {
		return this.elm.remove()
	}

	/**
	 * Measure plain text dimensions using uWrap (canvas-based, no DOM layout).
	 * Falls back to DOM measurement if uWrap can't handle the case.
	 */
	measureTextCanvas(
		textToMeasure: string,
		opts: TLMeasureTextOpts
	): BoxModel & { scrollWidth: number } {
		const padding = parsePadding(opts.padding)
		const lineHeightPx = opts.fontSize * opts.lineHeight

		const text = textToMeasure.replace(fixNewLines, '\n')

		if (opts.maxWidth !== null) {
			// Wrapping mode: use uWrap to measure with a max width constraint
			const wrapper = this.getUWrap(opts)
			const availableWidth = opts.maxWidth - padding.left - padding.right
			let lineCount = 0
			let maxLineWidth = 0

			// uWrap's types only declare (idx0, idx1) but the runtime also passes lineWidth as a 3rd arg
			;(
				wrapper.each as (
					text: string,
					width: number,
					cb: (idx0: number, idx1: number, width: number) => void
				) => void
			)(text, availableWidth, (_idx0, _idx1, lineWidth) => {
				lineCount++
				if (lineWidth > maxLineWidth) maxLineWidth = lineWidth
			})

			if (lineCount === 0) lineCount = 1

			const w = opts.maxWidth
			const h = lineCount * lineHeightPx + padding.top + padding.bottom

			return { x: 0, y: 0, w, h, scrollWidth: 0 }
		} else {
			// No-wrap mode: measure each explicit line's width using canvas
			// Set the font on the canvas context to match the requested font
			const resolvedFamily = this.resolveFontFamily(opts.fontFamily)
			this.canvasCtx.font = `${opts.fontStyle} ${opts.fontWeight} ${opts.fontSize}px ${resolvedFamily}`

			const lines = text.split('\n')
			let maxLineWidth = 0

			for (const line of lines) {
				if (line.length === 0) continue
				const lineWidth = this.canvasCtx.measureText(line).width
				if (lineWidth > maxLineWidth) maxLineWidth = lineWidth
			}

			const lineCount = Math.max(1, lines.length)
			const w = maxLineWidth + padding.left + padding.right
			const h = lineCount * lineHeightPx + padding.top + padding.bottom

			return { x: 0, y: 0, w, h, scrollWidth: 0 }
		}
	}

	measureText(textToMeasure: string, opts: TLMeasureTextOpts): BoxModel & { scrollWidth: number } {
		// Use uWrap canvas measurement if there are no special options that need DOM
		if (!opts.disableOverflowWrapBreaking && !opts.otherStyles && !opts.measureScrollWidth) {
			return this.measureTextCanvas(textToMeasure, opts)
		}

		// Fall back to DOM measurement for complex cases
		const div = document.createElement('div')
		div.textContent = normalizeTextForDom(textToMeasure)
		return this.measureHtml(div.innerHTML, opts)
	}

	/**
	 * Extract plain text from HTML by parsing it in a temporary element.
	 * Returns null if the HTML contains elements that would affect text layout
	 * (e.g. mixed font styles) and can't be accurately measured with a single font.
	 */
	private extractPlainTextFromHtml(html: string): string | null {
		// Quick check: if there are no tags at all, it's plain text
		if (!html.includes('<')) return html

		// Parse the HTML and extract text content
		const temp = document.createElement('div')
		temp.innerHTML = html

		// Check if the HTML has any elements that would change font metrics
		// (bold, italic, different font sizes, etc.)
		const formattingTags = temp.querySelectorAll(
			'b, strong, i, em, u, s, sub, sup, code, span[style]'
		)
		if (formattingTags.length > 0) return null

		return temp.textContent ?? ''
	}

	measureHtml(html: string, opts: TLMeasureTextOpts): BoxModel & { scrollWidth: number } {
		// Try canvas-based measurement for simple HTML (plain text wrapped in tags)
		if (
			!opts.disableOverflowWrapBreaking &&
			!opts.otherStyles &&
			!opts.measureScrollWidth &&
			!opts.minWidth
		) {
			const plainText = this.extractPlainTextFromHtml(html)
			if (plainText !== null) {
				return this.measureTextCanvas(plainText, opts)
			}
		}

		// Fall back to DOM measurement
		return this.measureHtmlDom(html, opts)
	}

	/**
	 * Original DOM-based HTML measurement. Used as fallback when canvas
	 * measurement isn't possible (rich text, special styles, etc.)
	 */
	measureHtmlDom(html: string, opts: TLMeasureTextOpts): BoxModel & { scrollWidth: number } {
		const { elm } = this

		const newStyles = {
			'font-family': opts.fontFamily,
			'font-style': opts.fontStyle,
			'font-weight': opts.fontWeight,
			'font-size': opts.fontSize + 'px',
			'line-height': opts.lineHeight.toString(),
			padding: opts.padding,
			'max-width': opts.maxWidth ? opts.maxWidth + 'px' : undefined,
			'min-width': opts.minWidth ? opts.minWidth + 'px' : undefined,
			'overflow-wrap': opts.disableOverflowWrapBreaking ? 'normal' : undefined,
			...opts.otherStyles,
		}

		const restoreStyles = this.setElementStyles(newStyles)

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
			'line-height': opts.lineHeight.toString(),
			width: `${elementWidth}px`,
			height: 'min-content',
			'text-align': textAlignmentsForLtr[opts.textAlign],
			'overflow-wrap': shouldTruncateToFirstLine ? 'anywhere' : undefined,
			'word-break': shouldTruncateToFirstLine ? 'break-all' : undefined,
			...opts.otherStyles,
		}
		const restoreStyles = this.setElementStyles(newStyles)

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
}
