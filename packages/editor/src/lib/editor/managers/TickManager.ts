import { throttleToNextFrame as _throttleToNextFrame, bind } from '@tldraw/utils'
import { ReadonlyVec, Vec } from '../../primitives/Vec'
import { Editor } from '../Editor'

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

	private prevPoint: ReadonlyVec = { x: 0, y: 0 }

	updatePointerVelocity(elapsed: number) {
		const prevPoint = this.prevPoint
		const currentScreenPoint = this.editor.inputs.getCurrentScreenPoint()
		const pointerVelocity = this.editor.inputs.getPointerVelocity()

		if (elapsed === 0) return

		const delta = Vec.Sub(currentScreenPoint, prevPoint)
		this.prevPoint = currentScreenPoint

		const length = delta.len()
		const direction = length ? delta.div(length) : new Vec(0, 0)

		// consider adjusting this with an easing rather than a linear interpolation
		const next = Vec.Lrp(pointerVelocity, direction.mul(length / elapsed), 0.5)

		// if the velocity is very small, just set it to 0
		if (Math.abs(next.x) < 0.01) next.x = 0
		if (Math.abs(next.y) < 0.01) next.y = 0

		if (!Vec.Equals(pointerVelocity, next)) {
			this.editor.inputs.setPointerVelocity({ x: next.x, y: next.y })
		}
	}
}
