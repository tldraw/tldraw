import { Editor, TLShape } from '@tldraw/editor'

/** @public */
export function getHitShapeOnCanvasPointerDown(
	editor: Editor,
	hitLabels = false
): TLShape | undefined {
	const currentPagePoint = editor.inputs.getCurrentPagePoint()

	return (
		editor.getShapeAtPoint(currentPagePoint, {
			hitInside: false,
			hitLabels,
			hitLocked: editor.options.selectLockedShapes,
			margin: editor.getHitTestMargin(),
			renderingOnly: true,
		}) ?? editor.getSelectedShapeAtPoint(currentPagePoint)
	)
}
