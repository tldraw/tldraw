import { Editor, HIT_TEST_MARGIN, Vec2d, isShapeId } from '@tldraw/editor'

export function selectOnPointerUp(editor: Editor) {
	let hitShape = editor.getShapeAtPoint(editor.inputs.currentPagePoint, {
		hitInside: true,
		margin: HIT_TEST_MARGIN / editor.zoomLevel,
	})

	const { selectedIds } = editor
	const { shiftKey, altKey, currentPagePoint } = editor.inputs

	// Note at the start: if we select a shape that is inside of a group,
	// the editor will automatically adjust the selection to the outermost
	// selectable shape (the group)

	// If the shape's outermost selected id (e.g. the group that contains
	// the shape) is not the same as the editor's only selected shape, then
	// we want to select the outermost selected shape instead of the shape

	if (hitShape) {
		const outermostSelectableShape = editor.getOutermostSelectableShape(hitShape)

		// If the user is holding shift, they're either adding to or removing from
		// their selection. In order to select the outermost selectable shape, we
		// would need to
		if (shiftKey && !altKey) {
			editor.cancelDoubleClick() // fuckin eh

			if (!selectedIds.includes(outermostSelectableShape.id)) {
				editor.mark('shift selecting shape')
				editor.setSelectedIds([...selectedIds, outermostSelectableShape.id])
			} else {
				editor.deselect(outermostSelectableShape.id)
			}
		} else {
			if (outermostSelectableShape.id !== editor.focusLayerId) {
				if (!selectedIds.includes(outermostSelectableShape.id)) {
					hitShape = outermostSelectableShape
				}
			}

			editor.mark('selecting shape')
			editor.select(hitShape.id) // possibly the outermost selected shape
		}

		// const outermostSelectableShape = editor.getOutermostSelectableShape(hitShape)

		// if (hitShape.id !== editor.focusLayerId) {
		// 	if (util.onClick) {
		// 		util.onClick(hitShape)
		// 	} else {
		// 		const isWithinSelection =
		// 			editor.selectedIds.includes(hitShape.id) || editor.isAncestorSelected(hitShape.id)

		// 		const isBehindSelectionBounds =
		// 			editor.selectedIds.length > 1 && // only on 2+ selected shapes!
		// 			editor.selectionBounds?.containsPoint(editor.inputs.currentPagePoint)

		// 		if (isWithinSelection) {
		// 		}

		// 		if (!isWithinSelection && hitShape.id !== editor.focusLayerId && !isBehindSelectionBounds) {
		// 			const { inputs, selectedIds } = editor

		// 			const parent = editor.getParentShape(hitShape)

		// 			if (parent && editor.isShapeOfType<TLGroupShape>(parent, 'group')) {
		// 				editor.cancelDoubleClick()
		// 			}

		// 			if (inputs.shiftKey && !inputs.altKey) {
		// 				if (!selectedIds.includes(hitShape.id)) {
		// 					editor.mark('shift selecting shape')
		// 					editor.setSelectedIds([...selectedIds, hitShape.id])
		// 				}
		// 			} else {
		// 				editor.mark('selecting shape')
		// 				editor.select(hitShape.id)
		// 			}
		// 		}
		// 	}
		// }
	} else {
		// We didn't hit anything...
		if (shiftKey) {
			// If we were holding shift, then it's a noop. We keep the
			// current selection because we didn't add anything to it
			return
		} else {
			// Otherwise, we clear the selction because the user selected
			// nothing instead of their current selection.
			editor.selectNone()

			// If the click was inside of the current focused group, then
			// we keep that focused group; otherwise we clear the focused
			// group (reset it to the page)
			if (!clickWasInsideFocusedGroup(editor, currentPagePoint)) {
				editor.setFocusLayerId(editor.currentPageId)
			}
		}
	}
}

export function clickWasInsideFocusedGroup(editor: Editor, point: Vec2d) {
	const { focusLayerId } = editor

	if (!isShapeId(focusLayerId)) {
		return false
	}

	const groupShape = editor.getShape(focusLayerId)
	if (!groupShape) {
		return false
	}

	const clickPoint = editor.getPointInShapeSpace(groupShape, point)
	return editor.getGeometry(groupShape).hitTestPoint(clickPoint, 0, true)
}
