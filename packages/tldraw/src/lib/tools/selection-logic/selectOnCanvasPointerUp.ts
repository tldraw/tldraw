import { Editor, HIT_TEST_MARGIN, TLShape, isShapeId } from '@tldraw/editor'

export function selectOnCanvasPointerUp(editor: Editor) {
	const selectedShapeIds = editor.getSelectedShapeIds()
	const { shiftKey, altKey, currentPagePoint } = editor.inputs

	const hitShape = editor.getShapeAtPoint(currentPagePoint, {
		hitInside: false,
		margin: HIT_TEST_MARGIN / editor.getZoomLevel(),
		hitLabels: true,
		renderingOnly: true,
		filter: (shape) => !shape.isLocked,
	})

	// Note at the start: if we select a shape that is inside of a group,
	// the editor will automatically adjust the selection to the outermost
	// selectable shape (the group)

	// If the shape's outermost selected id (e.g. the group that contains
	// the shape) is not the same as the editor's only selected shape, then
	// we want to select the outermost selected shape instead of the shape

	if (hitShape) {
		const outermostSelectableShape = editor.getOutermostSelectableShape(hitShape)
		// If the user is holding shift, they're either adding to or removing from
		// their selection.
		if (shiftKey && !altKey) {
			editor.cancelDoubleClick() // fuckin eh

			if (selectedShapeIds.includes(outermostSelectableShape.id)) {
				// Remove it from selected shapes
				editor.mark('deselecting shape')
				editor.deselect(outermostSelectableShape)
			} else {
				// Add it to selected shapes
				editor.mark('shift selecting shape')
				editor.setSelectedShapes([...selectedShapeIds, outermostSelectableShape.id])
			}
		} else {
			let shapeToSelect: TLShape | undefined = undefined

			if (outermostSelectableShape === hitShape) {
				// There's no group around the shape, so we can select it.
				shapeToSelect = hitShape
			} else {
				// There's a group around the hit shape.
				// If the group is the current focus layer, OR if the group is
				// already selected, then we can select the shape inside the group.
				// Otherwise, if the group isn't selected and isn't our current
				// focus layer, then we need to select the group instead.
				if (
					outermostSelectableShape.id === editor.getFocusedGroupId() ||
					selectedShapeIds.includes(outermostSelectableShape.id)
				) {
					shapeToSelect = hitShape
				} else {
					shapeToSelect = outermostSelectableShape
				}
			}

			if (shapeToSelect && !selectedShapeIds.includes(shapeToSelect.id)) {
				editor.mark('selecting shape')
				editor.select(shapeToSelect.id)
			}
		}
	} else {
		// We didn't hit anything...
		if (shiftKey) {
			// If we were holding shift, then it's a noop. We keep the
			// current selection because we didn't add anything to it
			return
		} else {
			// Otherwise, we clear the selction because the user selected
			// nothing instead of their current selection.

			if (selectedShapeIds.length > 0) {
				editor.mark('selecting none')
				editor.selectNone()
			}

			// If the click was inside of the current focused group, then
			// we keep that focused group; otherwise we clear the focused
			// group (reset it to the page)
			const focusedGroupId = editor.getFocusedGroupId()

			if (isShapeId(focusedGroupId)) {
				const groupShape = editor.getShape(focusedGroupId)!
				if (!editor.isPointInShape(groupShape, currentPagePoint, { margin: 0, hitInside: true })) {
					editor.setFocusedGroup(null)
				}
			}
		}
	}
}
