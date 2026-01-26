import { TLScribble, VecModel } from '@tldraw/tlschema'
import { uniqueId } from '@tldraw/utils'
import { Vec } from '../../../primitives/Vec'
import { Editor } from '../../Editor'

/** @public */
export interface ScribbleItem {
	id: string
	scribble: TLScribble
	timeoutMs: number
	delayRemaining: number
	prev: null | VecModel
	next: null | VecModel
}

/** @public */
export interface ScribbleSessionOptions {
	/** Session id. Auto-generated if not provided. */
	id?: string

	/**
	 * Whether scribbles self-consume (shrink from start) while drawing.
	 * - true: scribbles eat their own tail as you draw (default, used for eraser/select)
	 * - false: scribbles persist until session stops (used for laser/telestration)
	 */
	selfConsume?: boolean

	/**
	 * How long to wait after last activity before auto-stopping the session.
	 * Only applies when selfConsume is false.
	 * Set to 0 or omit to disable auto-stop.
	 */
	idleTimeoutMs?: number

	/**
	 * How scribbles fade when stopping.
	 * - 'individual': each scribble fades on its own (default)
	 * - 'grouped': all scribbles fade together as one sequence
	 */
	fadeMode?: 'individual' | 'grouped'

	/**
	 * Easing for grouped fade.
	 * - 'linear': constant fade rate
	 * - 'ease-in': starts slow, accelerates (default for grouped)
	 */
	fadeEasing?: 'linear' | 'ease-in'

	/**
	 * Duration of the fade in milliseconds.
	 */
	fadeDurationMs?: number
}

/** @public */
export class ScribbleSession {
	readonly id: string
	readonly items: ScribbleItem[] = []

	private state: 'active' | 'stopping' | 'complete' = 'active'
	private idleTimeoutHandle?: number
	private fadeElapsed = 0
	private totalPointsAtFadeStart = 0

	// Options with defaults
	private selfConsume: boolean
	private idleTimeoutMs: number
	private fadeMode: 'individual' | 'grouped'
	private fadeEasing: 'linear' | 'ease-in'
	private fadeDurationMs: number

	constructor(
		private editor: Editor,
		options: ScribbleSessionOptions = {}
	) {
		this.id = options.id ?? uniqueId()
		this.selfConsume = options.selfConsume ?? true
		this.idleTimeoutMs = options.idleTimeoutMs ?? 0
		this.fadeMode = options.fadeMode ?? 'individual'
		this.fadeEasing = options.fadeEasing ?? (this.fadeMode === 'grouped' ? 'ease-in' : 'linear')
		this.fadeDurationMs = options.fadeDurationMs ?? this.editor.options.telestrationFadeoutMs

		// Set up idle timeout if configured
		if (this.idleTimeoutMs > 0) {
			this.resetIdleTimeout()
		}
	}

	/**
	 * Add a new scribble to this session.
	 */
	addScribble(scribble: Partial<TLScribble>, id = uniqueId()): ScribbleItem {
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
		this.items.push(item)

		// Reset idle timeout on activity
		if (this.idleTimeoutMs > 0) {
			this.resetIdleTimeout()
		}

		return item
	}

	/**
	 * Set the next point for a scribble.
	 */
	addPoint(id: string, x: number, y: number, z = 0.5): ScribbleItem {
		const item = this.items.find((i) => i.id === id)
		if (!item) throw Error(`Scribble with id ${id} not found in session ${this.id}`)

		const point = { x, y, z }
		if (!item.prev || Vec.Dist(item.prev, point) >= 1) {
			item.next = point
		}

		// Reset idle timeout on activity
		if (this.idleTimeoutMs > 0) {
			this.resetIdleTimeout()
		}

		return item
	}

	/**
	 * Stop a specific scribble in the session.
	 */
	stopScribble(id: string): ScribbleItem {
		const item = this.items.find((i) => i.id === id)
		if (!item) throw Error(`Scribble with id ${id} not found in session ${this.id}`)

		item.delayRemaining = Math.min(item.delayRemaining, 200)
		item.scribble.state = 'stopping'
		return item
	}

	/**
	 * Stop the entire session, triggering fade-out of all scribbles.
	 */
	stop(): void {
		if (this.state !== 'active') return

		// Clear idle timeout
		if (this.idleTimeoutHandle !== undefined) {
			clearTimeout(this.idleTimeoutHandle)
			this.idleTimeoutHandle = undefined
		}

		this.state = 'stopping'

		if (this.fadeMode === 'grouped') {
			// Count total points for proportional grouped fade
			this.totalPointsAtFadeStart = this.items.reduce(
				(sum, item) => sum + item.scribble.points.length,
				0
			)
			this.fadeElapsed = 0

			// Mark all scribbles as stopping
			for (const item of this.items) {
				item.scribble.state = 'stopping'
			}
		} else {
			// Individual fade - just mark each as stopping
			for (const item of this.items) {
				item.delayRemaining = Math.min(item.delayRemaining, 200)
				item.scribble.state = 'stopping'
			}
		}
	}

	/**
	 * Extend the session, resetting idle timeout.
	 */
	extend(): void {
		if (this.idleTimeoutMs > 0) {
			this.resetIdleTimeout()
		}
	}

	/**
	 * Update on each animation frame.
	 */
	tick(elapsed: number): void {
		if (this.state === 'complete') return

		if (this.state === 'stopping' && this.fadeMode === 'grouped') {
			this.tickGroupedFade(elapsed)
		} else {
			this.tickItems(elapsed)
		}

		// Check if session is complete (no items left, or all items have no points)
		const hasContent = this.items.some((item) => item.scribble.points.length > 0)
		if (!hasContent && (this.state === 'stopping' || this.items.length === 0)) {
			this.state = 'complete'
		}
	}

	/**
	 * Get scribbles for rendering.
	 */
	getScribbles(): TLScribble[] {
		return this.items
			.filter((item) => item.scribble.points.length > 0)
			.map((item) => ({
				...item.scribble,
				points: [...item.scribble.points],
			}))
	}

	/**
	 * Check if session is complete (all scribbles faded).
	 */
	isComplete(): boolean {
		return this.state === 'complete'
	}

	/**
	 * Check if session is active (not stopping or complete).
	 */
	isActive(): boolean {
		return this.state === 'active'
	}

	/**
	 * Clean up resources.
	 */
	dispose(): void {
		if (this.idleTimeoutHandle !== undefined) {
			clearTimeout(this.idleTimeoutHandle)
			this.idleTimeoutHandle = undefined
		}
	}

	private resetIdleTimeout(): void {
		if (this.idleTimeoutHandle !== undefined) {
			clearTimeout(this.idleTimeoutHandle)
		}
		this.idleTimeoutHandle = this.editor.timers.setTimeout(() => {
			this.stop()
		}, this.idleTimeoutMs)
	}

	private tickItems(elapsed: number): void {
		for (const item of this.items) {
			if (this.selfConsume || this.state === 'stopping') {
				this.tickSelfConsumingItem(item, elapsed)
			} else {
				this.tickPersistentItem(item)
			}
		}

		// Remove completed items in individual fade mode
		if (this.fadeMode === 'individual') {
			for (let i = this.items.length - 1; i >= 0; i--) {
				if (this.items[i].scribble.points.length === 0) {
					this.items.splice(i, 1)
				}
			}
		}
	}

	/**
	 * Tick for persistent items (no self-consumption, just accumulate points).
	 */
	private tickPersistentItem(item: ScribbleItem): void {
		const { scribble } = item

		if (scribble.state === 'starting') {
			const { next, prev } = item
			if (next && next !== prev) {
				item.prev = next
				scribble.points.push(next)
			}
			if (scribble.points.length > 8) {
				scribble.state = 'active'
			}
			return
		}

		if (scribble.state === 'active') {
			const { next, prev } = item
			if (next && next !== prev) {
				item.prev = next
				scribble.points.push(next)
			}
		}
	}

	/**
	 * Tick for self-consuming items (original scribble behavior).
	 */
	private tickSelfConsumingItem(item: ScribbleItem, elapsed: number): void {
		const { scribble } = item

		if (scribble.state === 'starting') {
			const { next, prev } = item
			if (next && next !== prev) {
				item.prev = next
				scribble.points.push(next)
			}
			if (scribble.points.length > 8) {
				scribble.state = 'active'
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

		const { delayRemaining, timeoutMs, prev, next } = item

		switch (scribble.state) {
			case 'active': {
				if (next && next !== prev) {
					item.prev = next
					scribble.points.push(next)

					if (delayRemaining === 0 && scribble.points.length > 8) {
						scribble.points.shift()
					}
				} else {
					if (timeoutMs === 0) {
						if (scribble.points.length > 1) {
							scribble.points.shift()
						} else {
							item.delayRemaining = scribble.delay
						}
					}
				}
				break
			}
			case 'stopping': {
				if (delayRemaining === 0 && timeoutMs === 0) {
					if (scribble.points.length <= 1) {
						scribble.points.length = 0
						return
					}

					if (scribble.shrink) {
						scribble.size = Math.max(1, scribble.size * (1 - scribble.shrink))
					}

					scribble.points.shift()
				}
				break
			}
			case 'paused': {
				break
			}
		}
	}

	/**
	 * Tick for grouped fade (all scribbles fade together).
	 */
	private tickGroupedFade(elapsed: number): void {
		this.fadeElapsed += elapsed

		let remainingPoints = 0
		for (const item of this.items) {
			remainingPoints += item.scribble.points.length
		}

		if (remainingPoints === 0) return

		// Clear everything if we've exceeded fade duration
		if (this.fadeElapsed >= this.fadeDurationMs) {
			for (const item of this.items) {
				item.scribble.points.length = 0
			}
			return
		}

		// Calculate progress and apply easing
		const progress = this.fadeElapsed / this.fadeDurationMs
		const easedProgress = this.fadeEasing === 'ease-in' ? progress * progress : progress

		// Calculate points to remove
		const targetRemoved = Math.floor(easedProgress * this.totalPointsAtFadeStart)
		const actuallyRemoved = this.totalPointsAtFadeStart - remainingPoints
		const pointsToRemove = Math.max(1, targetRemoved - actuallyRemoved)

		// Remove from front across all items
		let removed = 0
		let itemIndex = 0
		while (removed < pointsToRemove && itemIndex < this.items.length) {
			const item = this.items[itemIndex]
			if (item.scribble.points.length > 0) {
				item.scribble.points.shift()
				removed++
			} else {
				itemIndex++
			}
		}
	}
}
