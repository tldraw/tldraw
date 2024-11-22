import {
	Box,
	Editor,
	TLFrameShape,
	canonicalizeRotation,
	last,
	toDomPrecision,
} from '@tldraw/editor'
import { TLCreateTextJsxFromSpansOpts } from '../shared/createTextJsxFromSpans'
import { defaultEmptyAs } from './FrameShapeUtil'

export function getFrameHeadingSide(editor: Editor, shape: TLFrameShape): 0 | 1 | 2 | 3 {
	const pageRotation = canonicalizeRotation(editor.getShapePageTransform(shape.id)!.rotation())
	const offsetRotation = pageRotation + Math.PI / 4
	const scaledRotation = (offsetRotation * (2 / Math.PI) + 4) % 4
	return Math.floor(scaledRotation) as 0 | 1 | 2 | 3
}

/**
 * Get the frame heading info (size and text) for a frame shape.
 *
 * @param editor The editor instance.
 * @param shape The frame shape.
 * @param opts The text measurement options.
 *
 * @returns The frame heading's size (as a Box) and JSX text spans.
 */
export function getFrameHeadingInfo(
	editor: Editor,
	shape: TLFrameShape,
	opts: TLCreateTextJsxFromSpansOpts
) {
	if (process.env.NODE_ENV === 'test') {
		// can't really measure text in tests
		return {
			box: new Box(0, -opts.height, shape.props.w, opts.height),
			spans: [],
		}
	}

	const spans = editor.textMeasure.measureTextSpans(
		defaultEmptyAs(shape.props.name, 'Frame') + String.fromCharCode(8203),
		opts
	)

	const firstSpan = spans[0]
	const lastSpan = last(spans)!
	const labelTextWidth = lastSpan.box.w + lastSpan.box.x - firstSpan.box.x

	return {
		box: new Box(0, -opts.height, labelTextWidth, opts.height),
		spans,
	}
}

export function getFrameHeadingOpts(
	shape: TLFrameShape,
	color: string
): TLCreateTextJsxFromSpansOpts {
	return {
		fontSize: 12,
		fontFamily: 'Inter, sans-serif',
		textAlign: 'start' as const,
		width: shape.props.w,
		height: 32,
		padding: 0,
		lineHeight: 1,
		fontStyle: 'normal',
		fontWeight: 'normal',
		overflow: 'truncate-ellipsis' as const,
		verticalTextAlign: 'middle' as const,
		fill: color,
		offsetY: -(32 + 2),
		offsetX: 2,
	}
}

export function getFrameHeadingTranslation(
	shape: TLFrameShape,
	side: 0 | 1 | 2 | 3,
	isSvg: boolean
) {
	const u = isSvg ? '' : 'px'
	const r = isSvg ? '' : 'deg'
	let labelTranslate: string
	switch (side) {
		case 0: // top
			labelTranslate = ``
			break
		case 3: // right
			labelTranslate = `translate(${toDomPrecision(shape.props.w)}${u}, 0${u}) rotate(90${r})`
			break
		case 2: // bottom
			labelTranslate = `translate(${toDomPrecision(shape.props.w)}${u}, ${toDomPrecision(
				shape.props.h
			)}${u}) rotate(180${r})`
			break
		case 1: // left
			labelTranslate = `translate(0${u}, ${toDomPrecision(shape.props.h)}${u}) rotate(270${r})`
			break
		default:
			throw Error('labelSide out of bounds')
	}

	return labelTranslate
}
