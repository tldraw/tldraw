import { TLScribble, VecModel } from '@tldraw/tlschema'
import { Vec } from '../../primitives/Vec'
import { uniqueId } from '../../utils/uniqueId'
import { Editor } from '../Editor'

interface ScribbleItem {
	id: string
	scribble: TLScribble
	timeoutMs: number
	delayRemaining: number
	prev: null | VecModel
	next: null | VecModel
}

/** @public */
export class ScribbleManager {
	scribbleItems = new Map<string, ScribbleItem>()
	state = 'paused' as 'paused' | 'running'

	constructor(private editor: Editor) {}

	addScribble = (scribble: Partial<TLScribble>, id = uniqueId()) => {
		const item: ScribbleItem = {
			id,
			scribble: {
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
			},
			timeoutMs: 0,
			delayRemaining: scribble.delay ?? 0,
			prev: null,
			next: null,
		}
		this.scribbleItems.set(id, item)
		return item
	}

	reset() {
		this.editor.updateInstanceState({ scribbles: [] })
		this.scribbleItems.clear()
	}

	/**
	 * Start stopping the scribble. The scribble won't be removed until its last point is cleared.
	 *
	 * @public
	 */
	stop = (id: ScribbleItem['id']) => {
		const item = this.scribbleItems.get(id)
		if (!item) throw Error(`Scribble with id ${id} not found`)
		item.delayRemaining = Math.min(item.delayRemaining, 200)
		item.scribble.state = 'stopping'
		return item
	}

	/**
	 * Set the scribble's next point.
	 *
	 * @param point - The point to add.
	 * @public
	 */
	addPoint = (id: ScribbleItem['id'], x: number, y: number) => {
		const item = this.scribbleItems.get(id)
		if (!item) throw Error(`Scribble with id ${id} not found`)
		const { prev } = item
		const point = { x, y, z: 0.5 }
		if (!prev || Vec.Dist(prev, point) >= 1) {
			item.next = point
		}
		return item
	}

	/**
	 * Update on each animation frame.
	 *
	 * @param elapsed - The number of milliseconds since the last tick.
	 * @public
	 */
	tick = (elapsed: number) => {
		if (this.scribbleItems.size === 0) return
		this.editor.batch(() => {
			this.scribbleItems.forEach((item) => {
				// let the item get at least eight points before
				//  switching from starting to active
				if (item.scribble.state === 'starting') {
					const { next, prev } = item
					if (next && next !== prev) {
						item.prev = next
						item.scribble.points.push(next)
					}

					if (item.scribble.points.length > 8) {
						item.scribble.state = 'active'
					}
					return
				}

				if (item.delayRemaining > 0) {
					item.delayRemaining = Math.max(0, item.delayRemaining - elapsed)
				}

				item.timeoutMs += elapsed
				if (item.timeoutMs >= 16) {
					item.timeoutMs = 0
				}

				const { delayRemaining, timeoutMs, prev, next, scribble } = item

				switch (scribble.state) {
					case 'active': {
						if (next && next !== prev) {
							item.prev = next
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
									item.delayRemaining = scribble.delay
								}
							}
						}
						break
					}
					case 'stopping': {
						if (item.delayRemaining === 0) {
							if (timeoutMs === 0) {
								// If the scribble is down to one point, we're done!
								if (scribble.points.length === 1) {
									this.scribbleItems.delete(item.id) // Remove the scribble
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
			})

			// The object here will get frozen into the record, so we need to
			// create a copies of the parts that what we'll be mutating later.
			this.editor.updateInstanceState({
				scribbles: Array.from(this.scribbleItems.values())
					.map(({ scribble }) => ({
						...scribble,
						points: [...scribble.points],
					}))
					.slice(-5), // limit to three as a minor sanity check
			})
		})
	}
}
