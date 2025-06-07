import { throttleToNextFrame as _throttleToNextFrame, bind } from '@tldraw/utils'
import { Vec } from '../../../primitives/Vec'
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

		this.updatePointerVelocity(elapsed)
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

	private prevPoint = new Vec()

	updatePointerVelocity(elapsed: number) {
		const {
			prevPoint,
			editor: {
				inputs: { currentScreenPoint, pointerVelocity },
			},
		} = this

		if (elapsed === 0) return

		const delta = Vec.Sub(currentScreenPoint, prevPoint)
		this.prevPoint = currentScreenPoint.clone()

		const length = delta.len()
		const direction = length ? delta.div(length) : new Vec(0, 0)

		// consider adjusting this with an easing rather than a linear interpolation
		const next = pointerVelocity.clone().lrp(direction.mul(length / elapsed), 0.5)

		// if the velocity is very small, just set it to 0
		if (Math.abs(next.x) < 0.01) next.x = 0
		if (Math.abs(next.y) < 0.01) next.y = 0

		if (!pointerVelocity.equals(next)) {
			this.editor.inputs.pointerVelocity = next
		}
	}
}
