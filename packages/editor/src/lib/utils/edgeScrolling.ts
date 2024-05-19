import { COARSE_POINTER_WIDTH, EDGE_SCROLL_DISTANCE, EDGE_SCROLL_SPEED } from '../constants'
import { Editor } from '../editor/Editor'
import { Vec } from '../primitives/Vec'

/**
 * Helper function to get the scroll proximity factor for a given position.
 * @param position - The mouse position on the axis.
 * @param dimension - The component dimension on the axis.
 * @internal
 */
function getEdgeProximityFactor(
	position: number,
	dimension: number,
	isCoarse: boolean,
	insetStart: boolean,
	insetEnd: boolean
) {
	const dist = EDGE_SCROLL_DISTANCE
	const pw = isCoarse ? COARSE_POINTER_WIDTH : 0 // pointer width
	const pMin = position - pw
	const pMax = position + pw
	const min = insetStart ? 0 : dist
	const max = insetEnd ? dimension : dimension - dist
	if (pMin < min) {
		return Math.min(1, (min - pMin) / dist)
	} else if (pMax > max) {
		return -Math.min(1, (pMax - max) / dist)
	}
	return 0
}

/**
 * Moves the camera when the mouse is close to the edge of the screen.
 * @public
 */
export function moveCameraWhenCloseToEdge(editor: Editor) {
	if (!editor.inputs.isDragging || editor.inputs.isPanning || editor.getCameraOptions().isLocked)
		return

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

	const {
		isCoarsePointer,
		insets: [t, r, b, l],
	} = editor.getInstanceState()
	const proximityFactorX = getEdgeProximityFactor(x, screenBounds.w, isCoarsePointer, l, r)
	const proximityFactorY = getEdgeProximityFactor(y, screenBounds.h, isCoarsePointer, t, b)

	if (proximityFactorX === 0 && proximityFactorY === 0) return

	// Determines the base speed of the scroll
	const pxSpeed = editor.user.getEdgeScrollSpeed() * EDGE_SCROLL_SPEED
	const scrollDeltaX = (pxSpeed * proximityFactorX * screenSizeFactorX) / zoomLevel
	const scrollDeltaY = (pxSpeed * proximityFactorY * screenSizeFactorY) / zoomLevel

	const camera = editor.getCamera()

	editor.setCamera(new Vec(camera.x + scrollDeltaX, camera.y + scrollDeltaY, camera.z))
}
