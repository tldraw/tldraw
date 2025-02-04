import { BoxModel, TLDefaultHorizontalAlignStyle } from '@tldraw/tlschema'
import { getOwnProperty, objectMapEntries } from '@tldraw/utils'
import { styleFromElement } from '../../exports/StyleEmbedder'
import { isPropertyInherited } from '../../exports/parseCss'
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
}

interface Span {
	box: BoxModel
	text: string
}

const spaceCharacterRegex = /\s/

/** @public */
export class TextManager {
	private baseElem: HTMLDivElement

	constructor(public editor: Editor) {
		this.baseElem = document.createElement('div')
		this.baseElem.classList.add('tl-text')
		this.baseElem.classList.add('tl-text-measure')
		this.baseElem.tabIndex = -1
	}

	measureText(
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
	): BoxModel & { scrollWidth: number } {
		const div = document.createElement('div')
		div.textContent = normalizeTextForDom(textToMeasure)
		return this.measureHtml(div.innerHTML, opts)
	}

	measureHtml(
		html: string,
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
	): BoxModel & { scrollWidth: number } {
		// Duplicate our base element; we don't need to clone deep
		const wrapperElm = this.baseElem.cloneNode() as HTMLDivElement
		this.editor.getContainer().appendChild(wrapperElm)
		wrapperElm.innerHTML = html
		this.baseElem.insertAdjacentElement('afterend', wrapperElm)

		wrapperElm.setAttribute('dir', 'auto')
		// N.B. This property, while discouraged ("intended for Document Type Definition (DTD) designers")
		// is necessary for ensuring correct mixed RTL/LTR behavior when exporting SVGs.
		wrapperElm.style.setProperty('unicode-bidi', 'plaintext')
		wrapperElm.style.setProperty('font-family', opts.fontFamily)
		wrapperElm.style.setProperty('font-style', opts.fontStyle)
		wrapperElm.style.setProperty('font-weight', opts.fontWeight)
		wrapperElm.style.setProperty('font-size', opts.fontSize + 'px')
		wrapperElm.style.setProperty('line-height', opts.lineHeight * opts.fontSize + 'px')
		wrapperElm.style.setProperty('max-width', opts.maxWidth === null ? null : opts.maxWidth + 'px')
		wrapperElm.style.setProperty('min-width', opts.minWidth === null ? null : opts.minWidth + 'px')
		wrapperElm.style.setProperty('padding', opts.padding)
		wrapperElm.style.setProperty(
			'overflow-wrap',
			opts.disableOverflowWrapBreaking ? 'normal' : 'break-word'
		)

		const scrollWidth = wrapperElm.scrollWidth
		const rect = wrapperElm.getBoundingClientRect()
		wrapperElm.remove()

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
	): { spans: Span[]; didTruncate: boolean } {
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

		const elm = this.baseElem.cloneNode() as HTMLDivElement
		this.editor.getContainer().appendChild(elm)

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
		elm.style.setProperty('font-style', opts.fontStyle)

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

	htmlToSvg(htmlToMeasure: string, opts: TLMeasureTextSpanOpts) {
		const elm = this.baseElem.cloneNode() as HTMLDivElement
		elm.classList.add('alex-text')
		Object.assign(elm.style, { opacity: '1', zIndex: '10000', top: '100px', pointerEvents: 'all' })
		this.editor.getContainer().querySelector('.alex-text')?.remove()
		this.editor.getContainer().appendChild(elm)

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
		elm.style.setProperty('font-style', opts.fontStyle)

		const shouldTruncateToFirstLine =
			opts.overflow === 'truncate-ellipsis' || opts.overflow === 'truncate-clip'

		if (shouldTruncateToFirstLine) {
			elm.style.setProperty('overflow-wrap', 'anywhere')
			elm.style.setProperty('word-break', 'break-all')
		}

		// Render the text into the measurement element:
		elm.innerHTML = htmlToMeasure

		// actually measure the text:
		const svg = svgify(elm)

		// elm.remove()

		console.log({ htmlToMeasure, svg: svg.outerHTML })

		return svg
	}
}

function svgify(root: Element) {
	const range = new Range()

	// Measurements of individual spans are relative to the containing element
	const elmBounds = root.getBoundingClientRect()
	const offsetX = -elmBounds.left
	const offsetY = -elmBounds.top

	function reifySpan(span: Span): SVGElement {
		const element = svgElement('text', {
			x: String(span.box.x),
			y: String(span.box.y),
			'unicode-bidi': 'plaintext',
			'alignment-baseline': 'text-before-edge',
		})
		element.textContent = span.text
		return element
	}

	function svgifyElement(element: Element, resultParent: SVGElement, parentStyler: Styler | null) {
		const group = svgElement('g')
		resultParent.appendChild(group)

		const styler = new Styler(element, group, offsetX, offsetY, parentStyler)

		for (const [key, applyFn] of objectMapEntries(cssProperties)) {
			const value = styler.get(key)
			if (value) {
				applyFn(styler, key, value)
			}
		}

		for (const child of element.childNodes) {
			if (isTextNode(child)) {
				svgifyTextNode(child, group)
			} else if (isElementNode(child)) {
				svgifyElement(child, group, styler)
			}
		}
	}

	function svgifyTextNode(textNode: Text, targetParent: SVGElement) {
		let idx = 0
		let currentSpan: Span | null = null
		let prevCharWasSpaceCharacter = null
		let prevCharTop = 0
		let prevCharLeftForRTLTest = 0
		for (const char of textNode.textContent ?? '') {
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
					// if (shouldTruncateToFirstLine && top !== prevCharTop) {
					// 	didTruncate = true
					// 	break
					// }
					// otherwise add the span to the list ready to start a new one
					targetParent.appendChild(reifySpan(currentSpan))
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

		// Add the last span
		if (currentSpan) {
			targetParent.appendChild(reifySpan(currentSpan))
		}
	}

	const rootSvg = svgElement('g')
	svgifyElement(root, rootSvg, null)
	return rootSvg
}

const cssProperties = {
	'font-family': copyDirectly,
	'font-size': copyDirectly,
	'font-weight': copyDirectly,
	'font-style': copyDirectly,
	color: copyDirectly,
	'text-decoration-line': copyDirectly,
	'text-decoration-style': copyWhen((s) => s.get('text-decoration-line') !== 'none'),
	'text-decoration-color': copyWhen((s) => s.get('text-decoration-line') !== 'none'),
	'text-decoration-thickness': copyWhen((s) => s.get('text-decoration-line') !== 'none'),

	'background-color': (styler, key, value) => {
		if (value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return

		const rects = styler.sourceElement.getClientRects()

		for (const rect of rects) {
			const svgRect = svgElement('rect', {
				x: String(rect.left + styler.offsetX),
				y: String(rect.top + styler.offsetY),
				width: String(rect.width),
				height: String(rect.height),
				fill: value,
			})
			styler.addDecorationBehind(svgRect)
		}
	},
} satisfies Record<string, (styler: Styler, key: string, value: string) => void>

function svgElement(name: string, attributes: Record<string, string> = {}) {
	const element = document.createElementNS('http://www.w3.org/2000/svg', name)
	for (const [key, value] of Object.entries(attributes)) {
		element.setAttribute(key, value)
	}
	return element
}

function copyDirectly(styler: Styler, cssPropertyName: string, cssPropertyValue: string) {
	styler.set(cssPropertyName, cssPropertyValue)
}

function copyWhen(condition: (styler: Styler) => boolean) {
	return (styler: Styler, cssPropertyName: string, cssPropertyValue: string) => {
		if (condition(styler)) {
			styler.set(cssPropertyName, cssPropertyValue)
		}
	}
}

function isTextNode(node: Node): node is Text {
	return node.nodeType === Node.TEXT_NODE
}

function isElementNode(node: Node): node is Element {
	return node.nodeType === Node.ELEMENT_NODE
}

class Styler {
	readonly sourceStyles: Record<string, string>
	readonly appliedStyles: Record<string, string> = {}

	constructor(
		readonly sourceElement: Element,
		readonly targetElement: SVGElement,
		readonly offsetX: number,
		readonly offsetY: number,
		readonly parent: Styler | null
	) {
		this.sourceStyles = styleFromElement(sourceElement)
	}

	get(property: string) {
		return getOwnProperty(this.sourceStyles, property)
	}

	getApplied(property: string): string | undefined {
		return (
			getOwnProperty(this.appliedStyles, property) ??
			(isPropertyInherited(property) ? this.parent?.getApplied(property) : undefined)
		)
	}

	set(property: string, value: string) {
		if (this.getApplied(property) === value) {
			return
		}

		this.appliedStyles[property] = value
		this.targetElement.style.setProperty(property, value)
	}

	addDecorationBehind(decoration: SVGElement) {
		this.targetElement.prepend(decoration)
	}

	addDecorationInFront(decoration: SVGElement) {
		this.targetElement.append(decoration)
	}
}
