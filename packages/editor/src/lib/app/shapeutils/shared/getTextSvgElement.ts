import { TLAlignType } from '@tldraw/tlschema'
import { TEXT_PROPS } from '../../../constants'
import { correctSpacesToNbsp } from '../../../utils/string'
import { App } from '../../App'

/** Get an SVG element for a text shape. */
export function getTextSvgElement(
	app: App,
	opts: {
		lines: string[]
		fontSize: number
		fontFamily: string
		textAlign: TLAlignType
		fontWeight: string
		fontStyle: string
		lineHeight: number
		width: number
		height: number
		stroke?: string
		strokeWidth?: number
		fill?: string
		padding?: number
	}
) {
	const { padding = 0 } = opts

	// Create the text element
	const textElm = document.createElementNS('http://www.w3.org/2000/svg', 'text')
	textElm.setAttribute('font-size', opts.fontSize + 'px')
	textElm.setAttribute('font-family', opts.fontFamily)
	textElm.setAttribute('font-style', opts.fontStyle)
	textElm.setAttribute('font-weight', opts.fontWeight)
	textElm.setAttribute('line-height', opts.lineHeight * opts.fontSize + 'px')
	textElm.setAttribute('dominant-baseline', 'mathematical')
	textElm.setAttribute('alignment-baseline', 'mathematical')

	const lines = opts.lines.map((line) => line)

	const tspans: SVGElement[] = []

	const innerHeight = lines.length * (opts.lineHeight * opts.fontSize)

	const offsetY = (Math.ceil(opts.height) - innerHeight) / 2
	const offsetX = padding

	// Create text span elements for each line
	for (let i = 0; i < lines.length; i++) {
		const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
		tspan.setAttribute('alignment-baseline', 'mathematical')

		const cleanText = correctSpacesToNbsp(lines[i])
		tspan.textContent = cleanText

		if (lines.length > 1 && i < lines.length - 1) {
			tspan.textContent += '\n'
		}

		tspan.setAttribute(
			'y',
			offsetY + opts.fontSize / 2 + opts.lineHeight * opts.fontSize * i + 'px'
		)
		textElm.appendChild(tspan)
		tspans.push(tspan)
	}

	if (opts.stroke && opts.strokeWidth) {
		textElm.setAttribute('stroke', opts.stroke)
		textElm.setAttribute('stroke-width', opts.strokeWidth + 'px')
	}

	if (opts.fill) {
		textElm.setAttribute('fill', opts.fill)
	}

	switch (opts.textAlign) {
		case 'middle': {
			textElm.setAttribute('text-align', 'center')
			textElm.setAttribute('text-anchor', 'start')
			tspans.forEach((tspan, i) => {
				const w = app.textMeasure.measureText({
					...TEXT_PROPS,
					text: lines[i],
					fontFamily: opts.fontFamily,
					fontSize: opts.fontSize,
					width: 'fit-content',
					padding: `${padding}px`,
				}).w

				tspan.setAttribute('x', offsetX + (opts.width - w) / 2 + '')
			})
			break
		}
		case 'end': {
			textElm.setAttribute('text-align', 'right')
			textElm.setAttribute('text-anchor', 'start')
			tspans.forEach((tspan, i) => {
				const w = app.textMeasure.measureText({
					...TEXT_PROPS,
					text: lines[i],
					fontFamily: opts.fontFamily,
					fontSize: opts.fontSize,
					width: 'fit-content',
					padding: `${padding}px`,
				}).w

				tspan.setAttribute('x', offsetX + opts.width - w + '')
			})
			break
		}
		default: {
			textElm.setAttribute('text-align', 'left')
			textElm.setAttribute('text-anchor', 'start')
			tspans.forEach((tspan) => tspan.setAttribute('x', offsetX + ''))
		}
	}

	return textElm
}
