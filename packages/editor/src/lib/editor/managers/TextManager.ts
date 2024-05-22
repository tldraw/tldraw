import { BoxModel, TLDefaultHorizontalAlignStyle } from '@tldraw/tlschema'
import { Editor } from '../Editor'

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

type TLOverflowMode = 'wrap' | 'truncate-ellipsis' | 'truncate-clip'
interface TLMeasureTextSpanOpts {
	overflow: TLOverflowMode
	width: number
	height: number
	padding: number
	fontSize: number
	fontWeight: string
	fontFamily: string
	fontStyle: string
	lineHeight: number
	textAlign: TLDefaultHorizontalAlignStyle
}

const spaceCharacterRegex = /\s/

export class TextManager {
	baseElm: HTMLDivElement

	constructor(public editor: Editor) {
		const container = this.editor.getContainer()

		// Remove any existing text measure element that
		// is a descendant of this editor's container
		container.querySelector('#tldraw_text_measure')?.remove()

		const elm = document.createElement('div')
		elm.id = `tldraw_text_measure`
		elm.classList.add('tl-text')
		elm.classList.add('tl-text-measure')
		elm.tabIndex = -1
		container.appendChild(elm)

		this.baseElm = elm
	}

	measureText = (
		textToMeasure: string,
		opts: {
			fontStyle: string
			fontWeight: string
			fontFamily: string
			fontSize: number
			lineHeight: number
			/**
			 * When maxWidth is a number, the text will be wrapped to that maxWidth. When maxWidth
			 * is null, the text will be measured without wrapping, but explicit line breaks and
			 * space are preserved.
			 */
			maxWidth: null | number
			minWidth?: null | number
			padding: string
			disableOverflowWrapBreaking?: boolean
		}
	): BoxModel & { scrollWidth: number } => {
		// Duplicate our base element; we don't need to clone deep
		const elm = this.baseElm?.cloneNode() as HTMLDivElement
		this.baseElm.insertAdjacentElement('afterend', elm)

		elm.setAttribute('dir', 'auto')
		// N.B. This property, while discouraged ("intended for Document Type Definition (DTD) designers")
		// is necessary for ensuring correct mixed RTL/LTR behavior when exporting SVGs.
		elm.style.setProperty('unicode-bidi', 'plaintext')
		elm.style.setProperty('font-family', opts.fontFamily)
		elm.style.setProperty('font-style', opts.fontStyle)
		elm.style.setProperty('font-weight', opts.fontWeight)
		elm.style.setProperty('font-size', opts.fontSize + 'px')
		elm.style.setProperty('line-height', opts.lineHeight * opts.fontSize + 'px')
		elm.style.setProperty('max-width', opts.maxWidth === null ? null : opts.maxWidth + 'px')
		elm.style.setProperty('min-width', opts.minWidth === null ? null : opts.minWidth + 'px')
		elm.style.setProperty('padding', opts.padding)
		elm.style.setProperty(
			'overflow-wrap',
			opts.disableOverflowWrapBreaking ? 'normal' : 'break-word'
		)

		elm.textContent = normalizeTextForDom(textToMeasure)
		const scrollWidth = elm.scrollWidth
		const rect = elm.getBoundingClientRect()
		elm.remove()

		return {
			x: 0,
			y: 0,
			w: rect.width,
			h: rect.height,
			scrollWidth,
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

		const elm = this.baseElm?.cloneNode() as HTMLDivElement
		this.baseElm.insertAdjacentElement('afterend', elm)

		const elementWidth = Math.ceil(opts.width - opts.padding * 2)
		elm.setAttribute('dir', 'auto')
		// N.B. This property, while discouraged ("intended for Document Type Definition (DTD) designers")
		// is necessary for ensuring correct mixed RTL/LTR behavior when exporting SVGs.
		elm.style.setProperty('unicode-bidi', 'plaintext')
		elm.style.setProperty('width', `${elementWidth}px`)
		elm.style.setProperty('height', 'min-content')
		elm.style.setProperty('font-size', `${opts.fontSize}px`)
		elm.style.setProperty('font-family', opts.fontFamily)
		elm.style.setProperty('font-weight', opts.fontWeight)
		elm.style.setProperty('line-height', `${opts.lineHeight * opts.fontSize}px`)
		elm.style.setProperty('text-align', textAlignmentsForLtr[opts.textAlign])

		const shouldTruncateToFirstLine =
			opts.overflow === 'truncate-ellipsis' || opts.overflow === 'truncate-clip'

		if (shouldTruncateToFirstLine) {
			elm.style.setProperty('overflow-wrap', 'anywhere')
			elm.style.setProperty('word-break', 'break-all')
		}

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

		elm.remove()

		return spans
	}
}
