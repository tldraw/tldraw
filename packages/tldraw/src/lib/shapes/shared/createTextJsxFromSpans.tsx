import {
	Box,
	BoxModel,
	Editor,
	TLDefaultVerticalAlignStyle,
	TLMeasureTextSpanOpts,
} from '@tldraw/editor'

function correctSpacesToNbsp(input: string) {
	return input.replace(/\s/g, '\xa0')
}

export interface TLCreateTextJsxFromSpansOpts extends TLMeasureTextSpanOpts {
	verticalTextAlign: TLDefaultVerticalAlignStyle
	offsetX: number
	offsetY: number
	stroke?: string
	strokeWidth?: number
	fill?: string
}

/** Get an SVG element for a text shape. */
export function createTextJsxFromSpans(
	editor: Editor,
	spans: { text: string; box: BoxModel }[],
	opts: TLCreateTextJsxFromSpansOpts
) {
	const { padding = 0 } = opts
	if (spans.length === 0) return null

	const bounds = Box.From(spans[0].box)
	for (const { box } of spans) {
		bounds.union(box)
	}

	const offsetX = padding + (opts.offsetX ?? 0)
	const offsetY =
		(opts.offsetY ?? 0) +
		opts.fontSize / 2 +
		(opts.verticalTextAlign === 'start'
			? padding
			: opts.verticalTextAlign === 'end'
				? opts.height - padding - bounds.height
				: (Math.ceil(opts.height) - bounds.height) / 2)

	// Create text span elements for each word
	let currentLineTop = null
	const children = []
	for (const { text, box } of spans) {
		// if we broke a line, add a line break span. This helps tools like
		// figma import our exported svg correctly
		const didBreakLine = currentLineTop !== null && box.y > currentLineTop
		if (didBreakLine) {
			children.push(
				<tspan
					key={children.length}
					alignmentBaseline="mathematical"
					x={offsetX}
					y={box.y + offsetY}
				>
					{'\n'}
				</tspan>
			)
		}

		children.push(
			<tspan
				key={children.length}
				alignmentBaseline="mathematical"
				x={box.x + offsetX}
				y={box.y + offsetY}
				// N.B. This property, while discouraged ("intended for Document Type Definition (DTD) designers")
				// is necessary for ensuring correct mixed RTL/LTR behavior when exporting SVGs.
				unicodeBidi="plaintext"
			>
				{correctSpacesToNbsp(text)}
			</tspan>
		)

		currentLineTop = box.y
	}

	return (
		<text
			fontSize={opts.fontSize}
			fontFamily={opts.fontFamily}
			fontStyle={opts.fontStyle}
			fontWeight={opts.fontWeight}
			dominantBaseline="mathematical"
			alignmentBaseline="mathematical"
			stroke={opts.stroke}
			strokeWidth={opts.strokeWidth}
			fill={opts.fill}
		>
			{children}
		</text>
	)
}
