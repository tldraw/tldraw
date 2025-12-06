import { Editor, TLShape } from '@tldraw/editor'

/** @public */
export function getHitShapeOnCanvasPointerDown(
	editor: Editor,
	hitLabels = false
): TLShape | undefined {
	const zoomLevel = editor.getZoomLevel()
	const currentPagePoint = editor.inputs.getCurrentPagePoint()

	return (
		// hovered shape at point
		editor.getShapeAtPoint(currentPagePoint, {
			hitInside: false,
			hitLabels,
			margin: editor.options.hitTestMargin / zoomLevel,
			renderingOnly: true,
		}) ??
		// selected shape at point
		editor.getSelectedShapeAtPoint(currentPagePoint)
	)
}
