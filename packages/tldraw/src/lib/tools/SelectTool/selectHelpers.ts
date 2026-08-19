import {
	Editor,
	ExtractShapeByProps,
	HALF_PI,
	richTextValidator,
	TLEventInfo,
	TLRichText,
	TLShape,
	TLShapeId,
	approximately,
} from '@tldraw/editor'

/** @internal */
export function hasRichText(
	shape: TLShape
): shape is ExtractShapeByProps<{ richText: TLRichText }> {
	return 'richText' in shape.props && richTextValidator.isValid(shape.props.richText)
}
/**
 * Start editing a shape that has rich text, such as text, note, geo, or arrow shapes.
 * This will enter the editing state for the shape and optionally select all the text.
 *
 * @param editor - The editor instance.
 * @param shapeOrId - The shape to start editing. This shape must have a richText property with a TLRichText value.
 * @param options - Options: selectAll or info (TLEventInfo)
 *
 * @public
 */
export function startEditingShapeWithRichText(
	editor: Editor,
	shapeOrId: TLShape | TLShapeId,
	options: { selectAll?: boolean; info?: TLEventInfo } = {}
) {
	const shape = typeof shapeOrId === 'string' ? editor.getShape(shapeOrId) : shapeOrId
	if (!shape) return

	if (!editor.canEditShape(shape)) return

	if (!hasRichText(shape)) {
		throw new Error('Shape does not have rich text')
	}
	// Finish this shape and start editing the next one
	editor.setEditingShape(shape)
	editor.setCurrentTool('select.editing_shape', {
		...options.info,
		target: 'shape',
		shape: shape,
	})
	if (options.selectAll) {
		editor.emit('select-all-text', { shapeId: shape.id })
	}
}

/**
 * Whether a rotation is a multiple of 90 degrees. An exact `rotation % HALF_PI === 0` misses
 * page rotations accumulated through rotated parents, which land a few ulps off and silently
 * disable right-angle-only behavior such as bounds snapping.
 *
 * @internal
 */
export function isRightAngleRotation(rotation: number) {
	const turns = rotation / HALF_PI
	return approximately(turns, Math.round(turns))
}
