import { Editor, isShapeId } from '@tldraw/editor'

export function selectOnPointerUp(editor: Editor) {
	const hitShape = editor.getShapeAtPoint(editor.inputs.currentPagePoint, {
		hitInside: true,
		margin: 0,
	})

	const { selectedIds } = editor
	const { shiftKey, altKey } = editor.inputs

	// Note at the start: if we select a shape that is inside of a group,
	// the editor will automatically adjust the selection to the outermost
	// selectable shape (the group)

	// If the shape's outermost selected id (e.g. the group that contains
	// the shape) is not the same as the editor's only selected shape, then
	// we want to select the outermost selected shape instead of the shape

	console.log('Here')
	if (hitShape) {
		if (shiftKey && !altKey) {
			if (!selectedIds.includes(hitShape.id)) {
				editor.mark('shift selecting shape')
				editor.setSelectedIds([...selectedIds, hitShape.id])
			}
		} else {
			editor.mark('selecting shape')
			editor.select(hitShape.id)
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
			if (!clickWasInsideFocusedGroup(editor)) {
				editor.setFocusLayerId(editor.currentPageId)
			}
		}
	}
}

function clickWasInsideFocusedGroup(editor: Editor) {
	const { focusLayerId, inputs } = editor

	if (!isShapeId(focusLayerId)) {
		return false
	}

	const groupShape = editor.getShape(focusLayerId)
	if (!groupShape) {
		return false
	}

	const clickPoint = editor.getPointInShapeSpace(groupShape, inputs.currentPagePoint)
	return editor.getGeometry(groupShape).hitTestPoint(clickPoint, 0, true)
}
