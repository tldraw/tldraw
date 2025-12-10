import { Editor, TLEventInfo, TLShape, TLShapeId } from '@tldraw/editor'

/**
 * Try to start editing a shape with its label. This is a safe wrapper that:
 * - Uses editor.canEditShape() to check editability
 * - Handles state transitions properly
 * - Optionally selects all text in the shape
 *
 * @param editor - The editor instance
 * @param shapeOrId - The shape (or shape id) to edit
 * @param selectAll - Whether to select all text after editing starts
 * @param info - Optional event info to pass to the tool state
 * @returns true if editing started successfully, false otherwise
 *
 * @public
 */
export function startEditingShape(
	editor: Editor,
	shapeOrId: TLShape | TLShapeId,
	options: { selectAll?: boolean; info?: TLEventInfo } = {}
): boolean {
	const shape = typeof shapeOrId === 'string' ? editor.getShape(shapeOrId) : shapeOrId
	if (!shape) return false

	if (!editor.canEditShape(shape)) {
		return false
	}

	editor.select(shape.id)
	editor.setEditingShape(shape)
	editor.setCurrentTool('select.editing_shape', {
		...options.info,
		target: 'shape',
		shape,
	})

	if (options.selectAll) {
		editor.emit('select-all-text', { shapeId: shape.id })
	}

	return true
}
