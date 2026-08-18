import {
	createShapeId,
	Editor,
	getDisplayValues,
	IndexKey,
	TLDefaultSizeStyle,
	TLTextShape,
	TextShapeUtil,
	TextShapeUtilDisplayValues,
} from 'tldraw'
import { z } from 'zod'

const TEXT_SIZE_STYLES = ['s', 'm', 'l', 'xl'] as const satisfies readonly TLDefaultSizeStyle[]

export const FocusedFontSize = z.number()

/**
 * Find the predefined text size closest to targetFontSize (in px) and the scale needed to reach it.
 */
export function convertFocusedFontSizeToTldrawFontSizeAndScale(
	editor: Editor,
	targetFontSize: number,
	textProps?: Partial<TLTextShape['props']>
) {
	let closest = { textSize: TEXT_SIZE_STYLES[0] as TLDefaultSizeStyle, pixelSize: Infinity }
	for (const size of TEXT_SIZE_STYLES) {
		const pixelSize = getTextShapeDisplayFontSize(editor, { ...textProps, size })
		if (Math.abs(targetFontSize - pixelSize) < Math.abs(targetFontSize - closest.pixelSize)) {
			closest = { textSize: size, pixelSize }
		}
	}

	return { textSize: closest.textSize, scale: targetFontSize / closest.pixelSize }
}

export function convertTldrawFontSizeAndScaleToFocusedFontSize(editor: Editor, shape: TLTextShape) {
	const util = editor.getShapeUtil<TextShapeUtil>('text')
	const displayValues = getDisplayValues<TLTextShape, TextShapeUtilDisplayValues>(util, shape)
	return Math.round(displayValues.fontSize * shape.props.scale)
}

function getTextShapeDisplayFontSize(
	editor: Editor,
	textProps?: Partial<TLTextShape['props']>
): number {
	const util = editor.getShapeUtil<TextShapeUtil>('text')
	const shape: TLTextShape = {
		id: createShapeId('agent-font-size'),
		typeName: 'shape',
		type: 'text',
		x: 0,
		y: 0,
		rotation: 0,
		index: 'a1' as IndexKey,
		parentId: editor.getCurrentPageId(),
		isLocked: false,
		opacity: 1,
		props: {
			...util.getDefaultProps(),
			...textProps,
		},
		meta: {},
	}
	return getDisplayValues<TLTextShape, TextShapeUtilDisplayValues>(util, shape).fontSize
}
