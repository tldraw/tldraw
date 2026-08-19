import { Editor, TLClickEventInfo, TLPointerEventInfo, TLShape, isShapeId } from '@tldraw/editor'

/**
 * A shape inside a group is only selectable (and hoverable) directly when its group is the
 * focused group or already selected; otherwise the interaction targets the group.
 */
export function getShapeToSelectForHit(editor: Editor, hitShape: TLShape): TLShape {
	const outermostSelectableShape = editor.getOutermostSelectableShape(hitShape)
	if (
		outermostSelectableShape === hitShape ||
		outermostSelectableShape.id === editor.getFocusedGroupId() ||
		editor.getSelectedShapeIds().includes(outermostSelectableShape.id)
	) {
		return hitShape
	}
	return outermostSelectableShape
}

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

	const shapeToSelect = getShapeToSelectForHit(editor, hitShape)

	if (!selectedShapeIds.includes(shapeToSelect.id)) {
		editor.markHistoryStoppingPoint('selecting shape')
		editor.select(shapeToSelect.id)
	}
}
