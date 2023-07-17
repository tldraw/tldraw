import { Box2d, Editor, TLGeoShape, TLNoteShape } from '@tldraw/editor'
import { createTextSvgElementFromSpans } from './createTextSvgElementFromSpans'
import { LABEL_FONT_SIZES, TEXT_PROPS } from './default-shape-constants'
import { getLegacyOffsetX } from './legacyProps'

export function getTextLabelSvgElement({
	bounds,
	editor,
	font,
	shape,
}: {
	bounds: Box2d
	editor: Editor
	font: string
	shape: TLGeoShape | TLNoteShape
}) {
	const padding = 16

	const opts = {
		fontSize: LABEL_FONT_SIZES[shape.props.size],
		fontFamily: font,
		textAlign: shape.props.align,
		verticalTextAlign: shape.props.verticalAlign,
		width: Math.ceil(bounds.width),
		height: Math.ceil(bounds.height),
		padding: 16,
		lineHeight: TEXT_PROPS.lineHeight,
		fontStyle: 'normal',
		fontWeight: 'normal',
		overflow: 'wrap' as const,
		offsetX: 0,
	}

	const spans = editor.textMeasure.measureTextSpans(shape.props.text, opts)
	const offsetX = getLegacyOffsetX(shape.props.align, padding, spans, bounds.width)
	if (offsetX) {
		opts.offsetX = offsetX
	}

	const textElm = createTextSvgElementFromSpans(editor, spans, opts)
	return textElm
}
