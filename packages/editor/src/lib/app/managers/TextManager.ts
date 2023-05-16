import { Box2dModel, TLAlignType } from '@tldraw/tlschema'
import { uniqueId } from '../../utils/data'
import { App } from '../App'
import { TextHelpers } from '../shapeutils/TLTextUtil/TextHelpers'

// const wordSeparator = new RegExp(
// 	`${[0x0020, 0x00a0, 0x1361, 0x10100, 0x10101, 0x1039, 0x1091]
// 		.map((c) => String.fromCodePoint(c))
// 		.join('|')}`
// )

const textAlignmentsForLtr: Record<TLAlignType, string> = {
	start: 'left',
	middle: 'center',
	end: 'right',
}

type WrapMode = 'wrap' | 'truncate-ellipsis' | 'truncate-clip'
type GetTextSpanOpts = {
	text: string
	wrap: WrapMode
	width: number
	height: number
	padding: number
	fontSize: number
	fontWeight: string
	fontFamily: string
	fontStyle: string
	lineHeight: number
	textAlign: TLAlignType
}

const spaceCharacterRegex = /\s/

export class TextManager {
	constructor(public app: App) {}

	getTextElement() {
		const oldElm = document.querySelector('.tl-text-measure')
		oldElm?.remove()

		const elm = document.createElement('div')
		this.app.getContainer().appendChild(elm)

		elm.id = `__textMeasure_${uniqueId()}`
		elm.classList.add('tl-text')
		elm.classList.add('tl-text-measure')
		elm.tabIndex = -1

		return elm
	}

	measureText = (opts: {
		text: string
		fontStyle: string
		fontWeight: string
		fontFamily: string
		fontSize: number
		lineHeight: number
		width: string
		minWidth?: string
		maxWidth: string
		padding: string
	}): Box2dModel => {
		const elm = this.getTextElement()

		elm.setAttribute('dir', 'ltr')
		elm.style.setProperty('font-family', opts.fontFamily)
		elm.style.setProperty('font-style', opts.fontStyle)
		elm.style.setProperty('font-weight', opts.fontWeight)
		elm.style.setProperty('font-size', opts.fontSize + 'px')
		elm.style.setProperty('line-height', opts.lineHeight * opts.fontSize + 'px')
		elm.style.setProperty('width', opts.width)
		elm.style.setProperty('min-width', opts.minWidth ?? null)
		elm.style.setProperty('max-width', opts.maxWidth)
		elm.style.setProperty('padding', opts.padding)

		elm.textContent = TextHelpers.normalizeTextForDom(opts.text)

		const rect = elm.getBoundingClientRect()

		return {
			x: 0,
			y: 0,
			w: rect.width,
			h: rect.height,
		}
	}

	/**
	 * Measure text into individual spans. Spans are created by rendering the
	 * text, then dividing it up according to line breaks and word boundaries.
	 *
	 * It works by having the browser render the text, then measuring the
	 * position of each character. You can use this to replicate the text-layout
	 * algorithm of the current browser in e.g. an SVG export.
	 */
	getTextSpans(opts: GetTextSpanOpts): { text: string; box: Box2dModel }[] {
		const shouldTruncateToFirstLine =
			opts.wrap === 'truncate-ellipsis' || opts.wrap === 'truncate-clip'

		console.log('getTextSpans', opts.text, opts.width)

		// Create a measurement element:
		const elm = this.getTextElement()
		elm.style.setProperty('width', Math.ceil(opts.width - opts.padding * 2) + 'px')
		elm.style.setProperty('height', 'min-content')
		elm.style.setProperty('dir', 'ltr')
		elm.style.setProperty('font-size', opts.fontSize + 'px')
		elm.style.setProperty('font-family', opts.fontFamily)
		elm.style.setProperty('font-weight', opts.fontWeight)
		elm.style.setProperty('line-height', opts.lineHeight * opts.fontSize + 'px')
		elm.style.setProperty('text-align', textAlignmentsForLtr[opts.textAlign])

		if (shouldTruncateToFirstLine) {
			elm.style.setProperty('overflow-wrap', 'anywhere')
			elm.style.setProperty('word-break', 'break-all')
			elm.style.top = '400px'
			elm.style.left = '400px'
			elm.style.opacity = '1'
		}

		// Divide the text into individual characters. It's important to use a
		// for-of loop here because it splits the string on unicode characters
		// rather than individual bytes. That means that e.g. emoji characters
		// don't get split into multiple spans.
		const chars = []
		for (const char of opts.text) {
			const span = document.createElement('span')
			span.textContent = char
			elm.appendChild(span)
			chars.push({ char, span })
		}

		// Measurements of individual spans are relative to the containing element
		const elmBounds = elm.getBoundingClientRect()
		const offsetX = -elmBounds.left
		const offsetY = -elmBounds.top

		// Group the character into spans
		const spans = []
		let currentSpan = null
		let prevCharWasSpaceCharacter = null
		let prevCharTop = 0
		let didTruncate = false
		for (const { char, span } of chars) {
			const rect = span.getBoundingClientRect()
			const top = rect.top + offsetY
			const left = rect.left + offsetX
			const right = rect.right + offsetX

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

				// if we just finished a span
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
			} else {
				// otherwise we just need to extend the current span with the next character
				currentSpan.box.w = right - currentSpan.box.x
				currentSpan.text += char
			}

			prevCharWasSpaceCharacter = isSpaceCharacter
			prevCharTop = top
		}

		// Add the last span
		if (currentSpan) {
			spans.push(currentSpan)
		}

		elm.remove()

		if (opts.wrap === 'truncate-ellipsis' && didTruncate) {
			// debugger

			const ellipsisWidth = Math.ceil(
				this.getTextSpans({ ...opts, wrap: 'truncate-clip', text: '…' })[0].box.w
			)

			const truncatedSpans = this.getTextSpans({
				...opts,
				wrap: 'truncate-clip',
				width: opts.width - ellipsisWidth,
			})
			// if we're truncating with an ellipsis, at this point we should
			// have the truncated line in the spans array. Add in the ellipsis
			// at the end of the line.
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
	}
}
