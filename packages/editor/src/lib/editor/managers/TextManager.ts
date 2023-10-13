import { Box2dModel, TLDefaultHorizontalAlignStyle } from '@tldraw/tlschema'
import { uniqueId } from '../../utils/uniqueId'
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
type TLMeasureTextSpanOpts = {
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
	constructor(public editor: Editor) {}

	private getTextElement() {
		const oldElm = document.querySelector('.tl-text-measure')
		oldElm?.remove()

		const elm = document.createElement('div')
		this.editor.getContainer().appendChild(elm)

		elm.id = `__textMeasure_${uniqueId()}`
		elm.classList.add('tl-text')
		elm.classList.add('tl-text-measure')
		elm.tabIndex = -1

		return elm
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
			minWidth?: string
			padding: string
		}
	): Box2dModel => {
		const elm = this.getTextElement()

		elm.setAttribute('dir', 'ltr')
		elm.style.setProperty('font-family', opts.fontFamily)
		elm.style.setProperty('font-style', opts.fontStyle)
		elm.style.setProperty('font-weight', opts.fontWeight)
		elm.style.setProperty('font-size', opts.fontSize + 'px')
		elm.style.setProperty('line-height', opts.lineHeight * opts.fontSize + 'px')
		elm.style.setProperty('max-width', opts.maxWidth === null ? null : opts.maxWidth + 'px')
		elm.style.setProperty('min-width', opts.minWidth ?? null)
		elm.style.setProperty('padding', opts.padding)

		elm.textContent = normalizeTextForDom(textToMeasure)
		const rect = elm.getBoundingClientRect()

		return {
			x: 0,
			y: 0,
			w: rect.width,
			h: rect.height,
		}
	}

	/**
	 * Given an html element, measure the position of each span of unbroken
	 * word/white-space characters within any text nodes it contains.
	 */
	measureElementTextNodeSpans(
		element: HTMLElement,
		{ shouldTruncateToFirstLine = false }: { shouldTruncateToFirstLine?: boolean } = {}
	): { spans: { box: Box2dModel; text: string }[]; didTruncate: boolean } {
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
				} else {
					// otherwise we just need to extend the current span with the next character
					currentSpan.box.w = right - currentSpan.box.x
					currentSpan.text += char
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
	): { text: string; box: Box2dModel }[] {
		if (textToMeasure === '') return []

		const shouldTruncateToFirstLine =
			opts.overflow === 'truncate-ellipsis' || opts.overflow === 'truncate-clip'

		// Create a measurement element:
		const element = this.getTextElement()
		const elementWidth = Math.ceil(opts.width - opts.padding * 2)
		element.style.setProperty('width', `${elementWidth}px`)
		element.style.setProperty('height', 'min-content')
		element.style.setProperty('dir', 'ltr')
		element.style.setProperty('font-size', `${opts.fontSize}px`)
		element.style.setProperty('font-family', opts.fontFamily)
		element.style.setProperty('font-weight', opts.fontWeight)
		element.style.setProperty('line-height', `${opts.lineHeight * opts.fontSize}px`)
		element.style.setProperty('text-align', textAlignmentsForLtr[opts.textAlign])

		if (shouldTruncateToFirstLine) {
			element.style.setProperty('overflow-wrap', 'anywhere')
			element.style.setProperty('word-break', 'break-all')
		}

		textToMeasure = normalizeTextForDom(textToMeasure)

		// Render the text into the measurement element:
		element.textContent = textToMeasure

		// actually measure the text:
		const { spans, didTruncate } = this.measureElementTextNodeSpans(element, {
			shouldTruncateToFirstLine,
		})

		if (opts.overflow === 'truncate-ellipsis' && didTruncate) {
			// we need to measure the ellipsis to know how much space it takes up
			element.textContent = '…'
			const ellipsisWidth = Math.ceil(this.measureElementTextNodeSpans(element).spans[0].box.w)

			// then, we need to subtract that space from the width we have and measure again:
			element.style.setProperty('width', `${elementWidth - ellipsisWidth}px`)
			element.textContent = textToMeasure
			const truncatedSpans = this.measureElementTextNodeSpans(element, {
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

		element.remove()

		return spans
	}
}
