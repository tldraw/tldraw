import { Editor, HIT_TEST_MARGIN, TLShape } from '@tldraw/editor'

export function getHitShapeOnCanvasPointerDown(editor: Editor): TLShape | undefined {
	const {
		zoomLevel,
		inputs: { currentPagePoint },
	} = editor

	let hitShape: TLShape | undefined

	if (!hitShape) {
		const hoveredShape = editor.getShapeAtPoint(currentPagePoint, {
			hitInside: false,
			margin: HIT_TEST_MARGIN / zoomLevel,
		})

		if (hoveredShape && !editor.isShapeOfType(hoveredShape, 'group')) {
			hitShape = hoveredShape
		}

		if (!hitShape) {
			const selectedShape = editor.getSelectedShapeAtPoint(currentPagePoint)
			if (selectedShape) {
				hitShape = selectedShape
			}
		}

		if (!hitShape) {
			const shapeAtPoint = editor.getShapeAtPoint(currentPagePoint, {
				hitInside: false,
				margin: 0,
			})

			if (shapeAtPoint) {
				hitShape = shapeAtPoint
			}
		}
	}

	return hitShape
}
