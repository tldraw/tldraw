import { Editor, TLShape } from '@tldraw/editor'

/** @public */
export function getHitShapeOnCanvasPointerDown(
	editor: Editor,
	hitLabels = false
): TLShape | undefined {
	const zoomLevel = editor.getZoomLevel()
	const currentPagePoint = editor.inputs.getCurrentPagePoint()

	// The shape whose geometry is under the pointer. For hollow shapes this skips
	// the interior, so a point inside a hollow shape can resolve to a filled shape
	// sitting behind it.
	const hitShape = editor.getShapeAtPoint(currentPagePoint, {
		hitInside: false,
		hitLabels,
		hitLocked: editor.options.selectLockedShapes,
		margin: editor.options.hitTestMargin / zoomLevel,
		renderingOnly: true,
	})

	// A selected shape under the pointer (tested with hitInside, so a hollow
	// selected shape's interior counts) should win over a shape behind it. This
	// keeps a selected hollow shape grabbable even when a filled shape sits behind
	// it. We only prefer it when it's in front of (or there is no) other hit shape,
	// so clicking a shape stacked on top of the selection still selects that shape.
	const selectedShapeAtPoint = editor.getSelectedShapeAtPoint(currentPagePoint)
	if (selectedShapeAtPoint) {
		if (!hitShape) return selectedShapeAtPoint
		const sorted = editor.getCurrentPageShapesSorted()
		if (sorted.indexOf(selectedShapeAtPoint) >= sorted.indexOf(hitShape)) {
			return selectedShapeAtPoint
		}
	}

	return hitShape
}
