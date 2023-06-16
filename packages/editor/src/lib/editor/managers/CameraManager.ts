import { atom } from 'signia'
import { Editor } from '../Editor'

const CAMERA_SETTLE_TIMEOUT = 12

export class CameraManager {
	constructor(public editor: Editor) {}

	state = atom('camera state', 'idle' as 'idle' | 'moving')

	private timeoutRemaining = 0

	private decay = (elapsed: number) => {
		this.timeoutRemaining -= elapsed
		if (this.timeoutRemaining <= 0) {
			this.state.set('idle')
			this.editor.off('tick', this.decay)
			this.editor.updateRenderingBounds()
		}
	}

	tick = () => {
		// always reset the timeout
		this.timeoutRemaining = CAMERA_SETTLE_TIMEOUT

		// If the state is idle, then start the tick
		if (this.state.__unsafe__getWithoutCapture() === 'idle') {
			this.state.set('moving')
			this.editor.on('tick', this.decay)
		}
	}
}
