import {
	Box,
	Editor,
	TLFrameShape,
	canonicalizeRotation,
	last,
	toDomPrecision,
} from '@tldraw/editor'
import { TLCreateTextJsxFromSpansOpts } from '../shared/createTextJsxFromSpans'

export function defaultEmptyAs(str: string, dflt: string) {
	return /^\s*$/.test(str) ? dflt : str
}

export function getFrameTitle(name: string) {
	return defaultEmptyAs(name, 'Frame') + String.fromCharCode(8203)
}

export function getFrameHeadingSide(editor: Editor, shape: TLFrameShape): 0 | 1 | 2 | 3 {
	const pageRotation = canonicalizeRotation(editor.getShapePageTransform(shape.id)!.rotation())
	const offsetRotation = pageRotation + Math.PI / 4
	const scaledRotation = (offsetRotation * (2 / Math.PI) + 4) % 4
	return Math.floor(scaledRotation) as 0 | 1 | 2 | 3
}

/**
 * We use a weak map here to prevent re-measuring the text width of frames that haven't changed their names.
 * It's only really important for performance reasons while zooming in and out. The measured text size is
 * independent of the zoom level, so we can cache the expensive part (measurement) and apply those changes
 * using the zoom level.
 */
const measurementWeakmap = new WeakMap()

/**
 * Get the frame heading info (size and text) for a frame shape.
 *
 * @param editor The editor instance.
 * @param shape The frame shape.
 * @param opts The text measurement options.
 *
 * @returns The frame heading's size (as a Box) and JSX text spans.
 */
export function getFrameHeadingSize(
	editor: Editor,
	shape: TLFrameShape,
	opts: TLCreateTextJsxFromSpansOpts
) {
	if (process.env.NODE_ENV === 'test') {
		// can't really measure text in tests
		return new Box(0, -opts.height, shape.props.w, opts.height)
	}

	let width = measurementWeakmap.get(shape.props)
	if (!width) {
		const spans = editor.textMeasure.measureTextSpans(getFrameTitle(shape.props.name), opts)
		const firstSpan = spans[0]
		const lastSpan = last(spans)

		if (!firstSpan || !lastSpan) {
			// measureTextSpans can return no spans when the text can't be laid
			// out yet — e.g. the measurement element isn't attached/visible
			// during the initial editor mount, or every grapheme lacks a layout
			// rect. Fall back to a zero-width heading and don't cache it, so the
			// heading is remeasured once measurement is possible.
			return new Box(0, -opts.height, 0, opts.height)
		}

		width = lastSpan.box.w + lastSpan.box.x - firstSpan.box.x
		measurementWeakmap.set(shape.props, width)
	}

	return new Box(0, -opts.height, width, opts.height)
}

export function getFrameHeadingOpts(width: number, isSvg: boolean): TLCreateTextJsxFromSpansOpts {
	return {
		fontSize: 12,
		fontFamily: isSvg ? 'Arial' : 'Inter, sans-serif',
		textAlign: 'start' as const,
		width: width,
		height: 24, // --frame-height
		padding: 0,
		lineHeight: 1,
		fontStyle: 'normal',
		fontWeight: 'normal',
		overflow: 'truncate-ellipsis' as const,
		verticalTextAlign: 'middle' as const,
		offsetY: -(32 + 2), // --frame-minimum-height + (border width * 2)
		offsetX: 0,
	}
}

export function getFrameHeadingTranslation(
	shape: TLFrameShape,
	side: 0 | 1 | 2 | 3,
	isSvg: boolean
) {
	const u = isSvg ? '' : 'px'
	const r = isSvg ? '' : 'deg'
	const w = toDomPrecision(shape.props.w)
	const h = toDomPrecision(shape.props.h)
	switch (side) {
		case 0: // top
			return ``
		case 3: // right
			return `translate(${w}${u}, 0${u}) rotate(90${r})`
		case 2: // bottom
			return `translate(${w}${u}, ${h}${u}) rotate(180${r})`
		case 1: // left
			return `translate(0${u}, ${h}${u}) rotate(270${r})`
		default:
			throw Error('labelSide out of bounds')
	}
}
