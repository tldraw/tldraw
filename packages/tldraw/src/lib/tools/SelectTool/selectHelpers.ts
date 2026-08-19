import {
	Editor,
	ExtractShapeByProps,
	richTextValidator,
	TLEventInfo,
	TLRichText,
	TLShape,
	TLShapeId,
} from '@tldraw/editor'

/** @internal */
export function hasRichText(
	shape: TLShape
): shape is ExtractShapeByProps<{ richText: TLRichText }> {
	return 'richText' in shape.props && richTextValidator.isValid(shape.props.richText)
}
/**
 * Start editing a shape. Shapes with rich text, such as text, note, geo, or arrow shapes, can
 * optionally have all of their text selected; other editable shapes (such as frames) simply enter
 * the editing state.
 *
 * @param editor - The editor instance.
 * @param shapeOrId - The shape to start editing.
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

	// Finish this shape and start editing the next one
	editor.setEditingShape(shape)
	editor.setCurrentTool('select.editing_shape', {
		...options.info,
		target: 'shape',
		shape: shape,
	})
	if (options.selectAll && hasRichText(shape)) {
		editor.emit('select-all-text', { shapeId: shape.id })
	}
}
