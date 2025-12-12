import { Editor, ExtractShapeByProps, richTextValidator, TLRichText, TLShape } from '@tldraw/editor'

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
 * @param shape - The shape to start editing. This shape must have a richText property with a TLRichText value.
 * @param selectAll - Whether to select all the text in the shape once editing begins.
 *
 *  @public
 */
export function startEditingShapeWithRichText(editor: Editor, shape: TLShape, selectAll = false) {
	if (!hasRichText(shape)) {
		throw new Error('Shape does not have rich text')
	}
	// Finish this shape and start editing the next one
	editor.setEditingShape(shape)
	editor.setCurrentTool('select.editing_shape', {
		target: 'shape',
		shape: shape,
	})
	if (selectAll) {
		editor.emit('select-all-text', { shapeId: shape.id })
	}
}
