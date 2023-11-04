import { react } from '@tldraw/state'
import { Vec2d } from '../../primitives/Vec2d'
import { debugFlags } from '../../utils/debug-flags'
import { Editor } from '../Editor'

const FPS = 60

export class TickManager {
	constructor(public editor: Editor) {
		const unsub = react('debug flag change', this.reactToDebugFlag)
		this.editor.disposables.add(() => {
			unsub()
			this.dispose()
		})
		this.start()
	}

	reactToDebugFlag = () => {
		if (debugFlags.throttleTick.value) {
			this.tickLength = 1000 / 30
		} else {
			this.tickLength = 1000 / FPS
		}
	}

	tickLength = 1000 / FPS
	raf: any
	isPaused = true
	last = 0
	t = 0

	start = () => {
		this.isPaused = false
		cancelAnimationFrame(this.raf)
		this.raf = requestAnimationFrame(this.tick)
		this.last = Date.now()
	}

	tick = () => {
		if (this.isPaused) {
			return
		}

		const now = Date.now()
		const elapsed = now - this.last
		this.last = now
		this.t += elapsed

		this.editor.emit('frame', elapsed)

		if (this.t < this.tickLength) {
			this.raf = requestAnimationFrame(this.tick)
			return
		}

		this.t -= this.tickLength
		this.updatePointerVelocity(elapsed)
		this.editor.emit('tick', elapsed)
		this.raf = requestAnimationFrame(this.tick)
	}

	// Clear the listener
	dispose = () => {
		this.isPaused = true
		cancelAnimationFrame(this.raf)
	}

	private prevPoint = new Vec2d()

	private updatePointerVelocity = (elapsed: number) => {
		const {
			prevPoint,
			editor: {
				inputs: { currentScreenPoint, pointerVelocity },
			},
		} = this

		if (elapsed === 0) return

		const delta = Vec2d.Sub(currentScreenPoint, prevPoint)
		this.prevPoint = currentScreenPoint.clone()

		const length = delta.len()
		const direction = length ? delta.div(length) : new Vec2d(0, 0)

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
