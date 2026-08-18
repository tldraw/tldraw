import { Editor, TLClickEventInfo, TLPointerEventInfo, isShapeId } from '@tldraw/editor'

export function selectOnCanvasPointerUp(
	editor: Editor,
	info: TLPointerEventInfo | TLClickEventInfo
) {
	const selectedShapeIds = editor.getSelectedShapeIds()
	const currentPagePoint = editor.inputs.getCurrentPagePoint()
	const { shiftKey, altKey, accelKey } = info
	const additiveSelectionKey = shiftKey || accelKey

	const selectLockedShapes = editor.options.selectLockedShapes
	const hitShape = editor.getShapeAtPoint(currentPagePoint, {
		hitInside: false,
		margin: editor.getHitTestMargin(),
		hitLabels: true,
		hitLocked: selectLockedShapes,
		renderingOnly: true,
		filter: (shape) => selectLockedShapes || !shape.isLocked,
	})

	if (!hitShape) {
		// Holding shift with nothing under the pointer keeps the current selection
		if (additiveSelectionKey) return

		if (selectedShapeIds.length > 0) {
			editor.markHistoryStoppingPoint('selecting none')
			editor.selectNone()
		}

		// Clicking outside the focused group resets focus to the page
		const focusedGroupId = editor.getFocusedGroupId()
		if (isShapeId(focusedGroupId)) {
			const groupShape = editor.getShape(focusedGroupId)!
			if (!editor.isPointInShape(groupShape, currentPagePoint, { margin: 0, hitInside: true })) {
				editor.setFocusedGroup(null)
			}
		}
		return
	}

	const outermostSelectableShape = editor.getOutermostSelectableShape(hitShape)

	if (additiveSelectionKey && !altKey) {
		editor.cancelDoubleClick()

		if (selectedShapeIds.includes(outermostSelectableShape.id)) {
			editor.markHistoryStoppingPoint('deselecting shape')
			editor.deselect(outermostSelectableShape)
		} else {
			editor.markHistoryStoppingPoint('shift selecting shape')
			editor.setSelectedShapes([...selectedShapeIds, outermostSelectableShape.id])
		}
		return
	}

	// A shape inside a group is only selectable directly when its group is the
	// focused group or already selected; otherwise the click selects the group.
	const shapeToSelect =
		outermostSelectableShape === hitShape ||
		outermostSelectableShape.id === editor.getFocusedGroupId() ||
		selectedShapeIds.includes(outermostSelectableShape.id)
			? hitShape
			: outermostSelectableShape

	if (!selectedShapeIds.includes(shapeToSelect.id)) {
		editor.markHistoryStoppingPoint('selecting shape')
		editor.select(shapeToSelect.id)
	}
}
