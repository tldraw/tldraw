import { TLShape } from '@tldraw/tlschema'
import { Editor, HIT_TEST_MARGIN } from '../../editor'

export function getHitShapeOnCanvasPointerDown(editor: Editor): TLShape | undefined {
	const {
		zoomLevel,
		inputs: { currentPagePoint },
	} = editor

	return (
		// hovered shape at point
		editor.getShapeAtPoint(currentPagePoint, {
			hitInside: false,
			margin: HIT_TEST_MARGIN / zoomLevel,
		}) ??
		// selected shape at point
		editor.getSelectedShapeAtPoint(currentPagePoint)
	)
}
