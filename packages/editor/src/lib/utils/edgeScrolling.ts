import { EDGE_SCROLL_DISTANCE, EDGE_SCROLL_SPEED } from '../constants'
import { Editor } from '../editor/Editor'

/**
 * Helper function to get the scroll proximity factor for a given position.
 * @param position - The mouse position on the axis.
 * @param dimension - The component dimension on the axis.
 * @internal
 */
function getEdgeProximityFactor(position: number, dimension: number) {
	if (position < 0) {
		return 1
	} else if (position > dimension) {
		return -1
	} else if (position < EDGE_SCROLL_DISTANCE) {
		return (EDGE_SCROLL_DISTANCE - position) / EDGE_SCROLL_DISTANCE
	} else if (position > dimension - EDGE_SCROLL_DISTANCE) {
		return -(EDGE_SCROLL_DISTANCE - dimension + position) / EDGE_SCROLL_DISTANCE
	}
	return 0
}

/**
 * Moves the camera when the mouse is close to the edge of the screen.
 * @public
 */
export function moveCameraWhenCloseToEdge(editor: Editor) {
	if (!editor.inputs.isDragging || editor.inputs.isPanning) return

	const {
		inputs: {
			currentScreenPoint: { x, y },
		},
	} = editor
	const zoomLevel = editor.getZoomLevel()
	const screenBounds = editor.getViewportScreenBounds()

	// Determines how much the speed is affected by the screen size
	const screenSizeFactorX = screenBounds.w < 1000 ? 0.612 : 1
	const screenSizeFactorY = screenBounds.h < 1000 ? 0.612 : 1

	const proximityFactorX = getEdgeProximityFactor(x - screenBounds.x, screenBounds.w)
	const proximityFactorY = getEdgeProximityFactor(y - screenBounds.y, screenBounds.h)

	if (proximityFactorX === 0 && proximityFactorY === 0) return

	// Determines the base speed of the scroll
	const pxSpeed = editor.user.getEdgeScrollSpeed() * EDGE_SCROLL_SPEED
	const scrollDeltaX = (pxSpeed * proximityFactorX * screenSizeFactorX) / zoomLevel
	const scrollDeltaY = (pxSpeed * proximityFactorY * screenSizeFactorY) / zoomLevel

	const camera = editor.getCamera()

	editor.setCamera({
		x: camera.x + scrollDeltaX,
		y: camera.y + scrollDeltaY,
	})
}
