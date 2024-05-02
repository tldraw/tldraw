import { Editor, HIT_TEST_MARGIN, TLShape } from '@tldraw/editor'

export function getHitShapeOnCanvasPointerDown(editor: Editor): TLShape | undefined {
	const zoomLevel = editor.getZoomLevel()
	const {
		inputs: { currentPagePoint },
	} = editor

	return (
		// hovered shape at point
		editor.getShapeAtPoint(currentPagePoint, {
			hitInside: false,
			hitLabels: false,
			margin: HIT_TEST_MARGIN / zoomLevel,
			renderingOnly: true,
		}) ??
		// selected shape at point
		editor.getSelectedShapeAtPoint(currentPagePoint)
	)
}
