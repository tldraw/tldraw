import { atom } from 'signia'
import { App } from '../Editor'

const CAMERA_SETTLE_TIMEOUT = 12

export class CameraManager {
	constructor(public app: App) {}

	state = atom('camera state', 'idle' as 'idle' | 'moving')

	private timeoutRemaining = 0

	private decay = (elapsed: number) => {
		this.timeoutRemaining -= elapsed
		if (this.timeoutRemaining <= 0) {
			this.state.set('idle')
			this.app.off('tick', this.decay)
			this.app.updateCullingBounds()
		}
	}

	tick = () => {
		// always reset the timeout
		this.timeoutRemaining = CAMERA_SETTLE_TIMEOUT

		// If the state is idle, then start the tick
		if (this.state.__unsafe__getWithoutCapture() === 'idle') {
			this.state.set('moving')
			this.app.on('tick', this.decay)
		}
	}
}
