import { Editor, TLGroupShape, isShapeId } from '@tldraw/editor'

export function selectOnPointerUp(editor: Editor) {
	let hitShape = editor.getShapeAtPoint(editor.inputs.currentPagePoint, {
		hitInside: true,
		margin: 0,
	})

	const { shiftKey } = editor.inputs

	if (hitShape) {
		hitShape = editor.getOutermostSelectableShape(hitShape)

		const util = editor.getShapeUtil(hitShape)

		if (hitShape.id !== editor.focusLayerId) {
			if (util.onClick) {
				util.onClick(hitShape)
			} else {
				const isWithinSelection =
					editor.selectedIds.includes(hitShape.id) || editor.isAncestorSelected(hitShape.id)

				const isBehindSelectionBounds =
					editor.selectedIds.length > 1 && // only on 2+ selected shapes!
					editor.selectionBounds?.containsPoint(editor.inputs.currentPagePoint)

				if (!isWithinSelection && hitShape.id !== editor.focusLayerId && !isBehindSelectionBounds) {
					const { inputs, selectedIds } = editor

					const parent = editor.getParentShape(hitShape)

					if (parent && editor.isShapeOfType<TLGroupShape>(parent, 'group')) {
						editor.cancelDoubleClick()
					}

					if (inputs.shiftKey && !inputs.altKey) {
						if (!selectedIds.includes(hitShape.id)) {
							editor.mark('shift selecting shape')
							editor.setSelectedIds([...selectedIds, hitShape.id])
						}
					} else {
						editor.mark('selecting shape')
						editor.select(hitShape.id)
					}
				}
			}
		}
	} else {
		if (!shiftKey) {
			editor.selectNone()
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
