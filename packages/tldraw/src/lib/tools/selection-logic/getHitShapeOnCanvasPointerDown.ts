import { Editor, TLShape } from '@tldraw/editor'
import { tldrawConstants } from '../../tldraw-constants'
const { HIT_TEST_MARGIN } = tldrawConstants

export function getHitShapeOnCanvasPointerDown(
	editor: Editor,
	hitLabels = false
): TLShape | undefined {
	const zoomLevel = editor.getZoomLevel()
	const {
		inputs: { currentPagePoint },
	} = editor

	return (
		// hovered shape at point
		editor.getShapeAtPoint(currentPagePoint, {
			hitInside: false,
			hitLabels,
			margin: HIT_TEST_MARGIN / zoomLevel,
			renderingOnly: true,
		}) ??
		// selected shape at point
		editor.getSelectedShapeAtPoint(currentPagePoint)
	)
}
