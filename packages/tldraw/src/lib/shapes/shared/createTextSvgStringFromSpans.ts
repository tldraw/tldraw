import {
	Box,
	BoxModel,
	TLDefaultHorizontalAlignStyle,
	TLDefaultVerticalAlignStyle,
} from '@tldraw/editor'
import { getLegacyOffsetX } from './legacyProps'

function correctSpacesToNbsp(input: string) {
	return input.replace(/\s/g, '\xa0')
}

/** Get an SVG element for a text shape. */
export function createTextSvgStringFromSpans(
	spans: { text: string; box: BoxModel }[],
	opts: {
		fontSize: number
		fontFamily: string
		textAlign: TLDefaultHorizontalAlignStyle
		verticalTextAlign: TLDefaultVerticalAlignStyle
		fontWeight: string
		fontStyle: string
		lineHeight: number
		width: number
		height: number
		stroke?: string
		strokeWidth?: number
		fill?: string
		padding?: number
		offsetX?: number
		offsetY?: number
	}
) {
	if (spans.length === 0) return null

	const { padding = 0, offsetX = 0, offsetY = 0 } = opts

	const bounds = Box.From(spans[0].box)
	for (const { box } of spans) {
		bounds.union(box)
	}

	const legacyOffsetX = getLegacyOffsetX(opts.textAlign, padding, spans, bounds.width)

	const ox = offsetX + padding + legacyOffsetX
	const oy =
		offsetY +
		opts.fontSize / 2 +
		(opts.verticalTextAlign === 'start'
			? padding
			: opts.verticalTextAlign === 'end'
				? opts.height - padding - bounds.height
				: (Math.ceil(opts.height) - bounds.height) / 2)

	const spansStrings: string[] = []

	// Create text span elements for each word
	let currentLineTop = null
	for (const { text, box } of spans) {
		// if we broke a line, add a line break span. This helps tools like
		// figma import our exported svg correctly
		const didBreakLine = currentLineTop !== null && box.y > currentLineTop
		if (didBreakLine) {
			spansStrings.push(`<tspan x="${ox + box.x}" y="${oy + box.y}">\n</tspan>`)
			// should we reset didBreakLine here?
		}
		spansStrings.push(
			`<tspan x="${ox + box.x}" y="${oy + box.y}">${correctSpacesToNbsp(text)}</tspan>`
		)
		currentLineTop = box.y
	}

	const result = `
	<text 
		font-size="${opts.fontSize}px" 
		font-family="${opts.fontFamily}" 
		font-style="${opts.fontStyle}" 
		font-weight="${opts.fontWeight}" 
		line-height="${opts.lineHeight * opts.fontSize}px" 
		dominant-baseline="mathematical" 
		alignment-baseline="mathematical" 
		${opts.fill ? `fill="${opts.fill}"` : ''}
		${opts.stroke && opts.strokeWidth ? `stroke="${opts.stroke}" stroke-width="${opts.strokeWidth}"` : ''}>
	${spansStrings.join('')}
	</text>
	`

	return result
}
