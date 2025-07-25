import { Vec } from '../../../primitives/Vec'
import { EASINGS } from '../../../primitives/easings'
import { Editor } from '../../Editor'

/** @public */
export class EdgeScrollManager {
	constructor(public editor: Editor) {}

	private _isEdgeScrolling = false
	private _edgeScrollDuration = -1

	/**
	 * Update the camera position when the mouse is close to the edge of the screen.
	 * Run this on every tick when in a state where edge scrolling is enabled.
	 *
	 * @public
	 */
	updateEdgeScrolling(elapsed: number) {
		const { editor } = this
		const edgeScrollProximityFactor = this.getEdgeScroll()
		if (edgeScrollProximityFactor.x === 0 && edgeScrollProximityFactor.y === 0) {
			if (this._isEdgeScrolling) {
				this._isEdgeScrolling = false
				this._edgeScrollDuration = 0
			}
		} else {
			if (!this._isEdgeScrolling) {
				this._isEdgeScrolling = true
				this._edgeScrollDuration = 0
			}
			this._edgeScrollDuration += elapsed
			if (this._edgeScrollDuration > editor.options.edgeScrollDelay) {
				const eased =
					editor.options.edgeScrollEaseDuration > 0
						? EASINGS.easeInCubic(
								Math.min(
									1,
									this._edgeScrollDuration /
										(editor.options.edgeScrollDelay + editor.options.edgeScrollEaseDuration)
								)
							)
						: 1
				this.moveCameraWhenCloseToEdge({
					x: edgeScrollProximityFactor.x * eased,
					y: edgeScrollProximityFactor.y * eased,
				})
			}
		}
	}

	/**
	 * Helper function to get the scroll proximity factor for a given position.
	 * @param position - The mouse position on the axis.
	 * @param dimension - The component dimension on the axis.
	 * @param isCoarse - Whether the pointer is coarse.
	 * @param insetStart - Whether the pointer is inset at the start of the axis.
	 * @param insetEnd - Whether the pointer is inset at the end of the axis.
	 * @internal
	 */
	private getEdgeProximityFactors(
		position: number,
		dimension: number,
		isCoarse: boolean,
		insetStart: boolean,
		insetEnd: boolean
	) {
		const { editor } = this
		const dist = editor.options.edgeScrollDistance
		const pw = isCoarse ? editor.options.coarsePointerWidth : 0 // pointer width
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

	private getEdgeScroll() {
		const { editor } = this
		const {
			inputs: {
				currentScreenPoint: { x, y },
			},
		} = editor
		const screenBounds = editor.getViewportScreenBounds()

		const {
			isCoarsePointer,
			insets: [t, r, b, l],
		} = editor.getInstanceState()
		const proximityFactorX = this.getEdgeProximityFactors(x, screenBounds.w, isCoarsePointer, l, r)
		const proximityFactorY = this.getEdgeProximityFactors(y, screenBounds.h, isCoarsePointer, t, b)

		return {
			x: proximityFactorX,
			y: proximityFactorY,
		}
	}

	/**
	 * Moves the camera when the mouse is close to the edge of the screen.
	 * @public
	 */
	private moveCameraWhenCloseToEdge(proximityFactor: { x: number; y: number }) {
		const { editor } = this
		if (!editor.inputs.isDragging || editor.inputs.isPanning || editor.getCameraOptions().isLocked)
			return

		if (proximityFactor.x === 0 && proximityFactor.y === 0) return

		const screenBounds = editor.getViewportScreenBounds()

		// Determines how much the speed is affected by the screen size
		const screenSizeFactorX = screenBounds.w < 1000 ? 0.612 : 1
		const screenSizeFactorY = screenBounds.h < 1000 ? 0.612 : 1

		// Determines the base speed of the scroll
		const zoomLevel = editor.getZoomLevel()
		const pxSpeed = editor.user.getEdgeScrollSpeed() * editor.options.edgeScrollSpeed
		const scrollDeltaX = (pxSpeed * proximityFactor.x * screenSizeFactorX) / zoomLevel
		const scrollDeltaY = (pxSpeed * proximityFactor.y * screenSizeFactorY) / zoomLevel

		// update the camera
		const { x, y, z } = editor.getCamera()
		editor.setCamera(new Vec(x + scrollDeltaX, y + scrollDeltaY, z))
	}
}
