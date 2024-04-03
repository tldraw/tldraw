import {
	Box,
	DefaultFontFamilies,
	TLDefaultColorStyle,
	TLDefaultFontStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultVerticalAlignStyle,
	useEditor,
} from '@tldraw/editor'
import { useDefaultColorTheme } from './ShapeFill'
import { createTextJsxFromSpans } from './createTextJsxFromSpans'
import { TEXT_PROPS } from './default-shape-constants'
import { getLegacyOffsetX } from './legacyProps'

export function SvgTextLabel({
	fontSize,
	font,
	align,
	verticalAlign,
	text,
	labelColor,
	bounds,
	padding = 16,
	stroke = true,
}: {
	fontSize: number
	font: TLDefaultFontStyle
	// fill?: TLDefaultFillStyle
	align: TLDefaultHorizontalAlignStyle
	verticalAlign: TLDefaultVerticalAlignStyle
	wrap?: boolean
	text: string
	labelColor: TLDefaultColorStyle
	bounds: Box
	padding?: number
	stroke?: boolean
}) {
	const editor = useEditor()
	const theme = useDefaultColorTheme()

	const opts = {
		fontSize,
		fontFamily: DefaultFontFamilies[font],
		textAlign: align,
		verticalTextAlign: verticalAlign,
		width: Math.ceil(bounds.width),
		height: Math.ceil(bounds.height),
		padding,
		lineHeight: TEXT_PROPS.lineHeight,
		fontStyle: 'normal',
		fontWeight: 'normal',
		overflow: 'wrap' as const,
		offsetX: 0,
		offsetY: 0,
		fill: theme[labelColor].solid,
		stroke: undefined as string | undefined,
		strokeWidth: undefined as number | undefined,
	}

	const spans = editor.textMeasure.measureTextSpans(text, opts)
	const offsetX = getLegacyOffsetX(align, padding, spans, bounds.width)
	if (offsetX) {
		opts.offsetX = offsetX
	}

	opts.offsetX += bounds.x
	opts.offsetY += bounds.y

	const mainSpans = createTextJsxFromSpans(editor, spans, opts)

	let outlineSpans = null
	if (stroke) {
		opts.fill = theme.background
		opts.stroke = theme.background
		opts.strokeWidth = 2
		outlineSpans = createTextJsxFromSpans(editor, spans, opts)
	}

	return (
		<>
			{outlineSpans}
			{mainSpans}
		</>
	)
}
