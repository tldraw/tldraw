import { EDGE_SCROLL_SPEED } from '../constants'
import { Editor } from '../editor/Editor'

/**
 * Helper function to get the scroll offset for a given position.
 * The closer the mouse is to the edge of the screen the faster we scroll.
 * We also adjust the speed and the start offset based on the screen size and zoom level.
 *
 * @param editor - The mouse position on the screen in pixels
 * @returns How much we should scroll in pixels
 * @internal
 */
export function getEdgeProximityFactor(position: number, scrollOffset: number, extreme: number) {
	if (position < 0) {
		return 1
	} else if (position > extreme) {
		return -1
	} else if (position < scrollOffset) {
		return (scrollOffset - position) / scrollOffset
	} else if (position > extreme - scrollOffset) {
		return -(scrollOffset - extreme + position) / scrollOffset
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

	// Determines how far from the edges we start the scroll behaviour
	const insetX = screenBounds.w < 1000 ? 40 : 32
	const insetY = screenBounds.h < 1000 ? 40 : 32

	// Determines how much the speed is affected by the screen size
	const screenSizeFactorX = screenBounds.w < 1000 ? 0.612 : 1
	const screenSizeFactorY = screenBounds.h < 1000 ? 0.612 : 1

	// Determines the base speed of the scroll
	const pxSpeed = editor.user.getEdgeScrollSpeed() * EDGE_SCROLL_SPEED

	const proximityFactorX = getEdgeProximityFactor(x, insetX, screenBounds.w)
	const proximityFactorY = getEdgeProximityFactor(y, insetY, screenBounds.h)

	if (proximityFactorX === 0 && proximityFactorY === 0) return

	const scrollDeltaX = (pxSpeed * proximityFactorX * screenSizeFactorX) / zoomLevel
	const scrollDeltaY = (pxSpeed * proximityFactorY * screenSizeFactorY) / zoomLevel

	const camera = editor.getCamera()

	editor.setCamera({
		x: camera.x + scrollDeltaX,
		y: camera.y + scrollDeltaY,
	})
}
