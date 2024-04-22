import { atom } from '@tldraw/state'
import { CAMERA_MOVING_TIMEOUT } from '../../constants'
import { Editor } from '../Editor'

export class CameraStateManager {
	constructor(public editor: Editor) {}

	// Camera state
	// Camera state does two things: first, it allows us to subscribe to whether
	// the camera is moving or not; and second, it allows us to update the rendering
	// shapes on the canvas. Changing the rendering shapes may cause shapes to
	// unmount / remount in the DOM, which is expensive; and computing visibility is
	// also expensive in large projects. For this reason, we use a second bounding
	// box just for rendering, and we only update after the camera stops moving.
	private _cameraState = atom('camera state', 'idle' as 'idle' | 'moving')

	/**
	 * Whether the camera is moving or idle.
	 *
	 * @example
	 * ```ts
	 * editor.getCameraState()
	 * ```
	 *
	 * @public
	 */
	getCameraState() {
		return this._cameraState.get()
	}

	private _cameraStateTimeoutRemaining = 0

	private _decayCameraStateTimeout = (elapsed: number) => {
		this._cameraStateTimeoutRemaining -= elapsed

		if (this._cameraStateTimeoutRemaining <= 0) {
			this.editor.off('tick', this._decayCameraStateTimeout)
			this._cameraState.set('idle')
			this.editor.updateRenderingBounds()
		}
	}

	public tick = () => {
		// always reset the timeout
		this._cameraStateTimeoutRemaining = CAMERA_MOVING_TIMEOUT

		// If the state is idle, then start the tick
		if (this._cameraState.__unsafe__getWithoutCapture() === 'idle') {
			this._cameraState.set('moving')
			this.editor.on('tick', this._decayCameraStateTimeout)
		}
	}
}
