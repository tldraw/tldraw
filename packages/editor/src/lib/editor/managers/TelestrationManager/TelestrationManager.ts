import { TLScribble, VecModel } from '@tldraw/tlschema'
import { uniqueId } from '@tldraw/utils'
import { Vec } from '../../../primitives/Vec'
import { Editor } from '../../Editor'

/** @public */
export interface TelestrationItem {
	id: string
	scribble: TLScribble
	prev: null | VecModel
	next: null | VecModel
}

/** @public */
export interface TelestrationSession {
	id: string
	items: TelestrationItem[]
	state: 'active' | 'fading'
	idleTimeoutHandle?: number
	fadeStartTime?: number
	fadeElapsed: number
	totalPointsAtFadeStart: number
}

/** @public */
export class TelestrationManager {
	private activeSession: TelestrationSession | null = null
	private fadingSessions: TelestrationSession[] = []

	constructor(private editor: Editor) {}

	/**
	 * Add a scribble to the current telestration session. If no session exists, one will be created.
	 *
	 * @param scribble - Partial scribble properties to use
	 * @param id - Optional id for the scribble
	 * @returns The created TelestrationItem
	 * @public
	 */
	addScribble(scribble: Partial<TLScribble>, id = uniqueId()): TelestrationItem {
		const item: TelestrationItem = {
			id,
			scribble: {
				id,
				size: 20,
				color: 'laser',
				opacity: 0.7,
				delay: 0,
				points: [],
				shrink: 0,
				taper: false,
				...scribble,
				state: 'starting',
			},
			prev: null,
			next: null,
		}

		// Create or extend the active session
		if (!this.activeSession) {
			this.activeSession = {
				id: uniqueId(),
				items: [item],
				state: 'active',
				idleTimeoutHandle: this.editor.timers.setTimeout(() => {
					this.endSession()
				}, this.editor.options.telestrationIdleTimeoutMs),
				fadeElapsed: 0,
				totalPointsAtFadeStart: 0,
			}
		} else {
			this.activeSession.items.push(item)
			this.resetIdleTimeout()
		}

		return item
	}

	/**
	 * Set the scribble's next point.
	 *
	 * @param id - The id of the scribble to add a point to.
	 * @param x - The x coordinate of the point.
	 * @param y - The y coordinate of the point.
	 * @param z - The z coordinate of the point.
	 * @public
	 */
	addPoint(id: string, x: number, y: number, z = 0.5): TelestrationItem {
		const item = this.getItem(id)
		if (!item) throw Error(`Telestration scribble with id ${id} not found`)

		const { prev } = item
		const point = { x, y, z }
		if (!prev || Vec.Dist(prev, point) >= 1) {
			item.next = point
		}

		return item
	}

	/**
	 * Extend the current session, resetting the idle timeout.
	 * Call this to keep the session alive while actively drawing.
	 *
	 * @public
	 */
	extendSession(): void {
		this.resetIdleTimeout()
	}

	/**
	 * End the current active session, moving it to fading state.
	 *
	 * @public
	 */
	endSession(): void {
		if (!this.activeSession) return

		// Clear idle timeout
		if (this.activeSession.idleTimeoutHandle !== undefined) {
			clearTimeout(this.activeSession.idleTimeoutHandle)
			this.activeSession.idleTimeoutHandle = undefined
		}

		// Count total points across all scribbles
		let totalPoints = 0
		for (const item of this.activeSession.items) {
			totalPoints += item.scribble.points.length
		}

		// Mark session as fading
		this.activeSession.state = 'fading'
		this.activeSession.fadeStartTime = Date.now()
		this.activeSession.totalPointsAtFadeStart = totalPoints

		// Set all scribbles to stopping state
		for (const item of this.activeSession.items) {
			if (item.scribble.state !== 'stopping') {
				item.scribble.state = 'stopping'
			}
		}

		// Move to fading sessions
		this.fadingSessions.push(this.activeSession)
		this.activeSession = null
	}

	/**
	 * Reset all telestration state.
	 *
	 * @public
	 */
	reset(): void {
		if (this.activeSession?.idleTimeoutHandle !== undefined) {
			clearTimeout(this.activeSession.idleTimeoutHandle)
		}
		this.activeSession = null
		this.fadingSessions = []
	}

	/**
	 * Get scribbles for rendering. Returns copies suitable for instance state.
	 *
	 * @public
	 */
	getScribbles(): TLScribble[] {
		const scribbles: TLScribble[] = []

		// Add scribbles from fading sessions (skip empty ones)
		for (const session of this.fadingSessions) {
			for (const item of session.items) {
				if (item.scribble.points.length === 0) continue
				scribbles.push({
					...item.scribble,
					points: [...item.scribble.points],
				})
			}
		}

		// Add scribbles from active session (skip empty ones)
		if (this.activeSession) {
			for (const item of this.activeSession.items) {
				if (item.scribble.points.length === 0) continue
				scribbles.push({
					...item.scribble,
					points: [...item.scribble.points],
				})
			}
		}

		return scribbles
	}

	/**
	 * Check if there is an active session.
	 *
	 * @public
	 */
	hasActiveSession(): boolean {
		return this.activeSession !== null || this.fadingSessions.length > 0
	}

	/**
	 * Update on each animation frame.
	 *
	 * @param elapsed - The number of milliseconds since the last tick.
	 * @public
	 */
	tick(elapsed: number): void {
		const hasWork = this.activeSession || this.fadingSessions.length > 0
		if (!hasWork) return

		this.editor.run(() => {
			// Process active session
			if (this.activeSession) {
				for (const item of this.activeSession.items) {
					this.tickItem(item, elapsed)
				}
			}

			// Process fading sessions
			for (const session of this.fadingSessions) {
				this.tickFadingSession(session, elapsed)
			}

			// Remove completed fading sessions
			this.fadingSessions = this.fadingSessions.filter(
				(session) => !session.items.every((item) => item.scribble.points.length === 0)
			)
		})
	}

	private tickFadingSession(session: TelestrationSession, elapsed: number): void {
		const fadeoutMs = this.editor.options.telestrationFadeoutMs

		// Accumulate elapsed time during fade
		session.fadeElapsed += elapsed

		// Count current remaining points
		let remainingPoints = 0
		for (const item of session.items) {
			remainingPoints += item.scribble.points.length
		}

		if (remainingPoints === 0) {
			return
		}

		// Check if we've exceeded the fade duration - if so, clear everything
		if (session.fadeElapsed >= fadeoutMs) {
			for (const item of session.items) {
				item.scribble.points.length = 0
			}
			return
		}

		// Calculate progress (0 to 1) and apply ease-in curve (starts slow, accelerates)
		const progress = session.fadeElapsed / fadeoutMs
		const easedProgress = progress * progress // quadratic ease-in

		// Calculate how many points should be removed by now vs how many remain
		const totalPoints = session.totalPointsAtFadeStart
		const targetRemoved = Math.floor(easedProgress * totalPoints)
		const actuallyRemoved = totalPoints - remainingPoints
		// Always remove at least 1 point per tick so animation always progresses
		const pointsToRemove = Math.max(1, targetRemoved - actuallyRemoved)

		// Remove points from the beginning (first drawn) across all scribbles
		let removed = 0
		let itemIndex = 0
		while (removed < pointsToRemove && itemIndex < session.items.length) {
			const item = session.items[itemIndex]

			if (item.scribble.points.length > 0) {
				item.scribble.points.shift()
				removed++
			} else {
				// This item is empty, move to next
				itemIndex++
			}
		}
	}

	private tickItem(item: TelestrationItem, _elapsed: number): void {
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
			// No self-consumption in telestration - points persist until session ends
		}
	}

	private resetIdleTimeout(): void {
		if (!this.activeSession) return

		if (this.activeSession.idleTimeoutHandle !== undefined) {
			clearTimeout(this.activeSession.idleTimeoutHandle)
		}
		this.activeSession.idleTimeoutHandle = this.editor.timers.setTimeout(() => {
			this.endSession()
		}, this.editor.options.telestrationIdleTimeoutMs)
	}

	private getItem(id: string): TelestrationItem | undefined {
		// Check active session first
		if (this.activeSession) {
			const item = this.activeSession.items.find((item) => item.id === id)
			if (item) return item
		}
		// Don't search fading sessions - new points shouldn't be added to fading scribbles
		return undefined
	}
}
