import { TLGroupShape } from '@tldraw/tlschema'
import { Editor, HIT_TEST_MARGIN } from '../../editor'
import { selectOnCanvasPointerUp } from './selectOnCanvasPointerUp'

export function selectOnDoubleClick(editor: Editor) {
	const { hoveredShape } = editor
	const hitShape =
		hoveredShape && !editor.isShapeOfType<TLGroupShape>(hoveredShape, 'group')
			? hoveredShape
			: editor.getSelectedShapeAtPoint(editor.inputs.currentPagePoint) ??
			  editor.getShapeAtPoint(editor.inputs.currentPagePoint, {
					margin: HIT_TEST_MARGIN / editor.zoomLevel,
					hitInside: true,
			  })

	const { focusedGroupId } = editor

	if (hitShape) {
		if (editor.isShapeOfType<TLGroupShape>(hitShape, 'group')) {
			// Probably select the shape
			selectOnCanvasPointerUp(editor)
			return
		} else {
			const parent = editor.getShape(hitShape.parentId)
			if (parent && editor.isShapeOfType<TLGroupShape>(parent, 'group')) {
				// The shape is the direct child of a group. If the group is
				// selected, then we can select the shape. If the group is the
				// focus layer id, then we can double click into it as usual.
				if (focusedGroupId && parent.id === focusedGroupId) {
					// noop, double click on the shape as normal below
				} else {
					// The shape is the child of some group other than our current
					// focus layer. We should probably select the group instead.
					selectOnCanvasPointerUp(editor)
					return
				}
			}
		}
	}
}
