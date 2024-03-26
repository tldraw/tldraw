import { atom, computed } from '@tldraw/state'
import { CameraRecordType, TLINSTANCE_ID, Vec3Model } from '@tldraw/tlschema'
import { warnOnce } from '@tldraw/utils'
import {
	CAMERA_MAX_RENDERING_INTERVAL,
	CAMERA_MOVING_TIMEOUT,
	INTERNAL_POINTER_IDS,
} from '../../constants'
import { Vec } from '../../primitives/Vec'
import { clamp } from '../../primitives/utils'
import { Editor } from '../Editor'

const DEFAULT_ZOOM_STOPS = [0.1, 0.25, 0.5, 1, 2, 4, 8]
const DEFAULT_MIN_ZOOM = 0.1
const DEFAULT_MAX_ZOOM = 8

/**
 * Configure the camera. (unreleased)
 * @internal
 */
export interface CameraOptions {
	/**
	 * Control how the camera zooms. Zoom levels are multipliers - 1 is 100% zoom, 2 is 2x bigger,
	 * 0.5 is 2x smaller, etc.
	 */
	zoom?: {
		/**
		 * The minimum zoom level - how far the user can zoom out. Default's to 0.1.
		 */
		min?: number
		/**
		 * The maximum zoom level - how far the user can zoom in. Default's to 8.
		 */
		max?: number
		/**
		 * The zoom levels we snap to when zooming in, or out. Default's to
		 * `[0.1, 0.25, 0.5, 1, 2, 4, 8]`.
		 */
		stops?: number[]
		/**
		 * When zooming with the wheel, we have to translate the wheel delta into a zoom delta. By
		 * default, we use 0.01 - so 100px of wheel movement translates into 1 unit of zoom (at
		 * 100%).
		 */
		wheelSensitivity?: number
	}
}

/** @internal */
export class CameraManager {
	constructor(private editor: Editor) {}

	// Camera record

	/** @internal */
	@computed private getId() {
		return CameraRecordType.createId(this.editor.getCurrentPageId())
	}

	/** @internal */
	@computed get() {
		return this.editor.store.get(this.getId())!
	}

	/** @internal */
	set(point: Vec3Model) {
		const currentCamera = this.get()
		point = this.constrain(point)

		if (currentCamera.x === point.x && currentCamera.y === point.y && currentCamera.z === point.z) {
			return
		}

		this.editor.batch(() => {
			this.editor.store.put([{ ...currentCamera, ...point }]) // include id and meta here

			// Dispatch a new pointer move because the pointer's page will have changed
			// (its screen position will compute to a new page position given the new camera position)
			const { currentScreenPoint } = this.editor.inputs
			const { screenBounds } = this.editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!

			this.editor.dispatch({
				type: 'pointer',
				target: 'canvas',
				name: 'pointer_move',
				// weird but true: we need to put the screen point back into client space
				point: Vec.AddXY(currentScreenPoint, screenBounds.x, screenBounds.y),
				pointerId: INTERNAL_POINTER_IDS.CAMERA_MOVE,
				ctrlKey: this.editor.inputs.ctrlKey,
				altKey: this.editor.inputs.altKey,
				shiftKey: this.editor.inputs.shiftKey,
				button: 0,
				isPen: this.editor.getInstanceState().isPenMode ?? false,
			})

			this.tickState()
		})

		return this
	}

	// Camera state

	private _state = atom('camera state', 'idle' as 'idle' | 'moving')

	/** @internal */
	getState() {
		return this._state.get()
	}

	// Camera state does two things: first, it allows us to subscribe to whether
	// the camera is moving or not; and second, it allows us to update the rendering
	// shapes on the canvas. Changing the rendering shapes may cause shapes to
	// unmount / remount in the DOM, which is expensive; and computing visibility is
	// also expensive in large projects. For this reason, we use a second bounding
	// box just for rendering, and we only update after the camera stops moving.

	private _cameraStateTimeoutRemaining = 0
	private _lastUpdateRenderingBoundsTimestamp = Date.now()

	private _decayCameraStateTimeout = (elapsed: number) => {
		this._cameraStateTimeoutRemaining -= elapsed

		if (this._cameraStateTimeoutRemaining <= 0) {
			this.editor.off('tick', this._decayCameraStateTimeout)
			this._state.set('idle')
			this.editor.updateRenderingBounds()
		}
	}

	/** @internal */
	tickState = () => {
		// always reset the timeout
		this._cameraStateTimeoutRemaining = CAMERA_MOVING_TIMEOUT

		const now = Date.now()

		// If the state is idle, then start the tick
		if (this._state.__unsafe__getWithoutCapture() === 'idle') {
			this._lastUpdateRenderingBoundsTimestamp = now // don't render right away
			this._state.set('moving')
			this.editor.on('tick', this._decayCameraStateTimeout)
		} else {
			if (now - this._lastUpdateRenderingBoundsTimestamp > CAMERA_MAX_RENDERING_INTERVAL) {
				this.editor.updateRenderingBounds()
			}
		}
	}

	// Camera options

	private _options = atom<CameraOptions>('camera options', {})

	/** @internal */
	setOptions(options: CameraOptions) {
		if (options.zoom) {
			const {
				min = DEFAULT_MIN_ZOOM,
				max = DEFAULT_MAX_ZOOM,
				stops = DEFAULT_ZOOM_STOPS,
			} = options.zoom

			if (min > max) {
				warnOnce('the minimum zoom level is greater than the maximum zoom level')
			}

			stops.sort()

			const lowestStop = stops[0]
			const highestStop = stops[stops.length - 1]
			if (lowestStop < min) {
				warnOnce('the lowest zoom stop is less than the minimum zoom level')
			}
			if (highestStop > max) {
				warnOnce('the highest zoom stop is greater than the maximum zoom level')
			}
		}

		this._options.set(options)

		// set the camera to its current value to apply any new constraints
		this.set(this.get())
	}

	/** What's the minimum zoom level? */
	@computed getZoomMin() {
		return this._options.get().zoom?.min ?? DEFAULT_MIN_ZOOM
	}

	/** What's the maximum zoom level? */
	@computed getZoomMax() {
		return this._options.get().zoom?.max ?? DEFAULT_MAX_ZOOM
	}

	/** Where do we stop when zooming in and out? */
	@computed getZoomStops(): readonly number[] {
		return this._options.get().zoom?.stops ?? DEFAULT_ZOOM_STOPS
	}

	/** How sensitive is the wheel when zooming? */
	@computed getWheelZoomSensitivity() {
		return this._options.get().zoom?.wheelSensitivity ?? 0.01
	}

	private constrain({ x: cx, y: cy, z: cz }: Vec3Model): Vec3Model {
		const center = this.editor.getViewportScreenCenter()
		const minZoom = this.getZoomMin()
		const maxZoom = this.getZoomMax()

		let x = cx
		let y = cy
		const z = clamp(cz, minZoom, maxZoom)

		// if the z has changed, adjust the x and y to keep the center in the same place
		if (z !== cz) {
			x = cx + (center.x / z - center.x) - (center.x / cz - center.x)
			y = cy + (center.y / z - center.y) - (center.y / cz - center.y)
		}

		return { x, y, z }
	}
}
