import { Editor, TLShape } from '@tldraw/editor'

/** @public */
export function getHitShapeOnCanvasPointerDown(
	editor: Editor,
	hitLabels = false
): TLShape | undefined {
	const zoomLevel = editor.getZoomLevel()
	const currentPagePoint = editor.inputs.getCurrentPagePoint()

	const hitShape = editor.getShapeAtPoint(currentPagePoint, {
		hitInside: false,
		hitLabels,
		hitLocked: editor.options.selectLockedShapes,
		margin: editor.options.hitTestMargin / zoomLevel,
		renderingOnly: true,
	})

	if (editor.inputs.getAccelKey()) return hitShape

	return (
		hitShape ??
		// selected shape at point
		editor.getSelectedShapeAtPoint(currentPagePoint)
	)
}
