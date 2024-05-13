import { TLScribble, VecModel } from '@tldraw/tlschema'
import { Vec } from '../../primitives/Vec'
import { uniqueId } from '../../utils/uniqueId'

export class Scribble {
	id: string
	state = 'paused' as 'paused' | 'running' | 'stopped'
	current: TLScribble
	timeoutMs = 0
	delayRemaining: number
	prev = null as null | VecModel
	next = null as null | VecModel

	constructor(scribble: Partial<TLScribble>, id = uniqueId()) {
		this.id = id
		this.current = {
			id,
			size: 20,
			color: 'accent',
			opacity: 0.8,
			delay: 0,
			points: [],
			shrink: 0.1,
			taper: true,
			...scribble,
			state: 'starting',
		}
		this.timeoutMs = 0
		this.delayRemaining = this.current.delay
	}

	/**
	 * Start stopping the scribble. The scribble won't be removed until its last point is cleared.
	 *
	 * @public
	 */
	stop = () => {
		if (this.state === 'stopped') throw Error('Scribble is stopped')
		this.delayRemaining = Math.min(this.delayRemaining, 200)
		this.current.state = 'stopping'
	}

	/**
	 * Set the scribble's next point.
	 *
	 * @param point - The point to add.
	 * @public
	 */
	addPoint = (x: number, y: number) => {
		if (this.state === 'stopped') throw Error('Scribble is stopped')
		const { prev } = this
		const point = { x, y, z: 0.5 }
		if (!prev || Vec.Dist(prev, point) >= 1) {
			this.next = point
		}
	}

	/**
	 * Update on each animation frame.
	 *
	 * @param elapsed - The number of milliseconds since the last tick.
	 * @public
	 */
	tick = (elapsed: number) => {
		if (this.state === 'stopped') throw Error('Scribble is stopped')

		if (this.current.state === 'starting') {
			const { next, prev } = this
			if (next && next !== prev) {
				this.prev = next
				this.current.points.push(next)
			}

			if (this.current.points.length > 8) {
				this.current.state = 'active'
			}
			return
		}

		if (this.delayRemaining > 0) {
			this.delayRemaining = Math.max(0, this.delayRemaining - elapsed)
		}

		if (this.timeoutMs >= 16) {
			this.timeoutMs = 0
		}

		const { delayRemaining, timeoutMs, prev, next, current: scribble } = this

		switch (scribble.state) {
			case 'active': {
				if (next && next !== prev) {
					this.prev = next
					scribble.points.push(next)

					// If we've run out of delay, then shrink the scribble from the start
					if (delayRemaining === 0) {
						if (scribble.points.length > 8) {
							scribble.points.shift()
						}
					}
				} else {
					// While not moving, shrink the scribble from the start
					if (timeoutMs === 0) {
						if (scribble.points.length > 1) {
							scribble.points.shift()
						} else {
							// Reset the item's delay
							this.delayRemaining = scribble.delay
						}
					}
				}
				break
			}
			case 'stopping': {
				if (this.delayRemaining === 0) {
					if (timeoutMs === 0) {
						// If the scribble is down to one point, we're done!
						if (scribble.points.length === 1) {
							this.state = 'stopped'
							return
						}

						if (scribble.shrink) {
							// Drop the scribble's size as it shrinks
							scribble.size = Math.max(1, scribble.size * (1 - scribble.shrink))
						}

						// Drop the scribble's first point (its tail)
						scribble.points.shift()
					}
				}
				break
			}
			case 'paused': {
				// Nothing to do while paused.
				break
			}
		}
	}
}
