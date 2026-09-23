import { Editor, TLShape } from '@tldraw/editor'

/** @public */
export function getHitShapeOnCanvasPointerDown(
	editor: Editor,
	hitLabels = false
): TLShape | undefined {
	const currentPagePoint = editor.inputs.getCurrentPagePoint()

	return (
		// hovered shape at point
		editor.getShapeAtPoint(currentPagePoint, {
			hitInside: false,
			hitLabels,
			hitLocked: editor.options.selectLockedShapes,
			margin: editor.getHitTestMargin(),
			renderingOnly: true,
		}) ??
		// selected shape at point
		editor.getSelectedShapeAtPoint(currentPagePoint)
	)
}
