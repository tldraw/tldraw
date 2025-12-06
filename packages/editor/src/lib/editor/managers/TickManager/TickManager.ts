import { throttleToNextFrame as _throttleToNextFrame, bind } from '@tldraw/utils'
import { Editor } from '../../Editor'

const throttleToNextFrame =
	typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
		? // At test time we should use actual raf and not throttle, because throttle was set up to evaluate immediately during tests, which causes stack overflow
			// for the tick manager since it sets up a raf loop.
			function mockThrottle(cb: any) {
				// eslint-disable-next-line no-restricted-globals
				const frame = requestAnimationFrame(cb)
				return () => cancelAnimationFrame(frame)
			}
		: _throttleToNextFrame

/** @internal */
export class TickManager {
	constructor(public editor: Editor) {
		this.editor.disposables.add(this.dispose)
		this.start()
	}

	cancelRaf?: null | (() => void)
	isPaused = true
	now = 0

	start() {
		this.isPaused = false
		this.cancelRaf?.()
		this.cancelRaf = throttleToNextFrame(this.tick)
		this.now = Date.now()
	}

	@bind
	tick() {
		if (this.isPaused) {
			return
		}

		const now = Date.now()
		const elapsed = now - this.now
		this.now = now

		this.editor.inputs.updatePointerVelocity(elapsed)
		this.editor.emit('frame', elapsed)
		this.editor.emit('tick', elapsed)
		this.cancelRaf = throttleToNextFrame(this.tick)
	}

	// Clear the listener
	@bind
	dispose() {
		this.isPaused = true

		this.cancelRaf?.()
	}
}
