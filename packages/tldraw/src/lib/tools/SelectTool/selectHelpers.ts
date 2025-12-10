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
 * @internal
 */
export function startEditingShape(
	editor: Editor,
	shapeOrId: TLShape | TLShapeId,
	options: { selectAll?: boolean; info?: TLEventInfo } = {}
): boolean {
	const shape = typeof shapeOrId === 'string' ? editor.getShape(shapeOrId) : shapeOrId
	if (!shape) return false

	// Use Steve's canEditShape predicate for comprehensive checking
	if (!editor.canEditShape(shape)) {
		return false
	}

	// Perform the editing operations
	editor.select(shape.id)
	// We intentionally call the low-level setter here to centralize the edit-start flow
	// in the tldraw layer, keeping Editor focused on document state only.
	;(editor as any).setEditingShape(shape)

	// Verify it worked (handles edge cases like race conditions)
	if (editor.getEditingShapeId() !== shape.id) {
		return false
	}

	// Transition to editing state with the full event info
	editor.setCurrentTool('select.editing_shape', {
		...(options.info ?? {}),
		target: 'shape',
		shape,
	})

	// Optionally select all text
	if (options.selectAll) {
		editor.emit('select-all-text', { shapeId: shape.id })
	}

	return true
}

/**
 * Legacy helper for backward compatibility. Prefer startEditingShape.
 *
 * @deprecated Use startEditingShape instead
 * @internal
 */
export function startEditingShapeWithLabel(
	editor: Editor,
	shape: TLShape,
	selectAll = false
): void {
	startEditingShape(editor, shape, { selectAll })
}
