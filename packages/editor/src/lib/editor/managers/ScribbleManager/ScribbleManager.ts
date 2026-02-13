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
	 * - false: scribbles persist until session stops (used for laser)
	 */
	selfConsume?: boolean
	/**
	 * How long to wait after last activity before auto-stopping the session.
	 * Only applies when selfConsume is false.
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
	 */
	fadeEasing?: 'linear' | 'ease-in'
	/**
	 * Duration of the fade in milliseconds.
	 */
	fadeDurationMs?: number
}

// Internal session state (not exported)
interface Session {
	id: string
	items: ScribbleItem[]
	state: 'active' | 'stopping' | 'complete'
	options: Required<Omit<ScribbleSessionOptions, 'id'>>
	idleTimeoutHandle?: number
	fadeElapsed: number
	totalPointsAtFadeStart: number
}

/** @public */
export class ScribbleManager {
	private sessions = new Map<string, Session>()

	constructor(private editor: Editor) {}

	// ==================== SESSION API ====================

	/**
	 * Start a new session for grouping scribbles.
	 * Returns a session ID that can be used with other session methods.
	 *
	 * @param options - Session configuration
	 * @returns Session ID
	 * @public
	 */
	startSession(options: ScribbleSessionOptions = {}): string {
		const id = options.id ?? uniqueId()
		const session: Session = {
			id,
			items: [],
			state: 'active',
			options: {
				selfConsume: options.selfConsume ?? true,
				idleTimeoutMs: options.idleTimeoutMs ?? 0,
				fadeMode: options.fadeMode ?? 'individual',
				fadeEasing: options.fadeEasing ?? (options.fadeMode === 'grouped' ? 'ease-in' : 'linear'),
				fadeDurationMs: options.fadeDurationMs ?? this.editor.options.laserFadeoutMs,
			},
			fadeElapsed: 0,
			totalPointsAtFadeStart: 0,
		}

		this.sessions.set(id, session)

		// Set up idle timeout if configured
		if (session.options.idleTimeoutMs > 0) {
			this.resetIdleTimeout(session)
		}

		return id
	}

	/**
	 * Add a scribble to a session.
	 *
	 * @param sessionId - The session ID
	 * @param scribble - Partial scribble properties
	 * @param scribbleId - Optional scribble ID
	 * @public
	 */
	addScribbleToSession(
		sessionId: string,
		scribble: Partial<TLScribble>,
		scribbleId = uniqueId()
	): ScribbleItem {
		const session = this.sessions.get(sessionId)
		if (!session) throw Error(`Session ${sessionId} not found`)

		const item: ScribbleItem = {
			id: scribbleId,
			scribble: {
				id: scribbleId,
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

		session.items.push(item)

		// Reset idle timeout on activity
		if (session.options.idleTimeoutMs > 0) {
			this.resetIdleTimeout(session)
		}

		return item
	}

	/**
	 * Add a point to a scribble in a session.
	 *
	 * @param sessionId - The session ID
	 * @param scribbleId - The scribble ID
	 * @param x - X coordinate
	 * @param y - Y coordinate
	 * @param z - Z coordinate (pressure)
	 * @public
	 */
	addPointToSession(
		sessionId: string,
		scribbleId: string,
		x: number,
		y: number,
		z = 0.5
	): ScribbleItem {
		const session = this.sessions.get(sessionId)
		if (!session) throw Error(`Session ${sessionId} not found`)

		const item = session.items.find((i) => i.id === scribbleId)
		if (!item) throw Error(`Scribble ${scribbleId} not found in session ${sessionId}`)

		const point = { x, y, z }
		if (!item.prev || Vec.Dist(item.prev, point) >= 1) {
			item.next = point
		}

		// Reset idle timeout on activity
		if (session.options.idleTimeoutMs > 0) {
			this.resetIdleTimeout(session)
		}

		return item
	}

	/**
	 * Extend a session, resetting its idle timeout.
	 *
	 * @param sessionId - The session ID
	 * @public
	 */
	extendSession(sessionId: string): void {
		const session = this.sessions.get(sessionId)
		if (!session) return

		if (session.options.idleTimeoutMs > 0) {
			this.resetIdleTimeout(session)
		}
	}

	/**
	 * Stop a session, triggering fade-out.
	 *
	 * @param sessionId - The session ID
	 * @public
	 */
	stopSession(sessionId: string): void {
		const session = this.sessions.get(sessionId)
		if (!session || session.state !== 'active') return

		this.clearIdleTimeout(session)
		session.state = 'stopping'

		if (session.options.fadeMode === 'grouped') {
			session.totalPointsAtFadeStart = session.items.reduce(
				(sum, item) => sum + item.scribble.points.length,
				0
			)
			session.fadeElapsed = 0
			for (const item of session.items) {
				item.scribble.state = 'stopping'
			}
		} else {
			for (const item of session.items) {
				item.delayRemaining = Math.min(item.delayRemaining, 200)
				item.scribble.state = 'stopping'
			}
		}
	}

	/**
	 * Clear all scribbles in a session immediately.
	 *
	 * @param sessionId - The session ID
	 * @public
	 */
	clearSession(sessionId: string): void {
		const session = this.sessions.get(sessionId)
		if (!session) return

		this.clearIdleTimeout(session)
		for (const item of session.items) {
			item.scribble.points.length = 0
		}
		session.state = 'complete'
	}

	/**
	 * Check if a session is active.
	 *
	 * @param sessionId - The session ID
	 * @public
	 */
	isSessionActive(sessionId: string): boolean {
		const session = this.sessions.get(sessionId)
		return session?.state === 'active'
	}

	// ==================== SIMPLE API (for eraser, select, etc.) ====================

	/**
	 * Add a scribble using the default self-consuming behavior.
	 * Creates an implicit session for the scribble.
	 *
	 * @param scribble - Partial scribble properties
	 * @param id - Optional scribble id
	 * @returns The created scribble item
	 * @public
	 */
	addScribble(scribble: Partial<TLScribble>, id = uniqueId()): ScribbleItem {
		const sessionId = this.startSession()
		return this.addScribbleToSession(sessionId, scribble, id)
	}

	/**
	 * Add a point to a scribble. Searches all sessions.
	 *
	 * @param id - The scribble id
	 * @param x - X coordinate
	 * @param y - Y coordinate
	 * @param z - Z coordinate (pressure)
	 * @public
	 */
	addPoint(id: string, x: number, y: number, z = 0.5): ScribbleItem {
		for (const session of this.sessions.values()) {
			const item = session.items.find((i) => i.id === id)
			if (item) {
				const point = { x, y, z }
				if (!item.prev || Vec.Dist(item.prev, point) >= 1) {
					item.next = point
				}
				if (session.options.idleTimeoutMs > 0) {
					this.resetIdleTimeout(session)
				}
				return item
			}
		}
		throw Error(`Scribble with id ${id} not found`)
	}

	/**
	 * Mark a scribble as complete (done being drawn but not yet fading).
	 * Searches all sessions.
	 *
	 * @param id - The scribble id
	 * @public
	 */
	complete(id: string): ScribbleItem {
		for (const session of this.sessions.values()) {
			const item = session.items.find((i) => i.id === id)
			if (item) {
				if (item.scribble.state === 'starting' || item.scribble.state === 'active') {
					item.scribble.state = 'complete'
				}
				return item
			}
		}
		throw Error(`Scribble with id ${id} not found`)
	}

	/**
	 * Stop a scribble. Searches all sessions.
	 *
	 * @param id - The scribble id
	 * @public
	 */
	stop(id: string): ScribbleItem {
		for (const session of this.sessions.values()) {
			const item = session.items.find((i) => i.id === id)
			if (item) {
				item.delayRemaining = Math.min(item.delayRemaining, 200)
				item.scribble.state = 'stopping'
				return item
			}
		}
		throw Error(`Scribble with id ${id} not found`)
	}

	/**
	 * Stop and remove all sessions.
	 *
	 * @public
	 */
	reset(): void {
		for (const session of this.sessions.values()) {
			this.clearIdleTimeout(session)
		}
		this.sessions.clear()
		this.editor.updateInstanceState({ scribbles: [] })
	}

	/**
	 * Update on each animation frame.
	 *
	 * @param elapsed - The number of milliseconds since the last tick.
	 * @public
	 */
	tick(elapsed: number): void {
		const currentScribbles = this.editor.getInstanceState().scribbles
		if (this.sessions.size === 0 && currentScribbles.length === 0) return

		this.editor.run(() => {
			// Tick all sessions
			for (const session of this.sessions.values()) {
				this.tickSession(session, elapsed)
			}

			// Remove completed sessions
			for (const [id, session] of this.sessions) {
				if (session.state === 'complete') {
					this.clearIdleTimeout(session)
					this.sessions.delete(id)
				}
			}

			// Collect scribbles from all sessions
			const scribbles: TLScribble[] = []
			for (const session of this.sessions.values()) {
				for (const item of session.items) {
					if (item.scribble.points.length > 0) {
						scribbles.push({
							...item.scribble,
							points: [...item.scribble.points],
						})
					}
				}
			}

			this.editor.updateInstanceState({ scribbles })
		})
	}

	// ==================== PRIVATE HELPERS ====================

	private resetIdleTimeout(session: Session): void {
		this.clearIdleTimeout(session)
		session.idleTimeoutHandle = this.editor.timers.setTimeout(() => {
			this.stopSession(session.id)
		}, session.options.idleTimeoutMs)
	}

	private clearIdleTimeout(session: Session): void {
		if (session.idleTimeoutHandle !== undefined) {
			clearTimeout(session.idleTimeoutHandle)
			session.idleTimeoutHandle = undefined
		}
	}

	private tickSession(session: Session, elapsed: number): void {
		if (session.state === 'complete') return

		if (session.state === 'stopping' && session.options.fadeMode === 'grouped') {
			this.tickGroupedFade(session, elapsed)
		} else {
			this.tickSessionItems(session, elapsed)
		}

		// Check if session is complete
		const hasContent = session.items.some((item) => item.scribble.points.length > 0)
		if (!hasContent && (session.state === 'stopping' || session.items.length === 0)) {
			session.state = 'complete'
		}
	}

	private tickSessionItems(session: Session, elapsed: number): void {
		for (const item of session.items) {
			const shouldSelfConsume =
				session.options.selfConsume ||
				session.state === 'stopping' ||
				item.scribble.state === 'stopping'

			if (shouldSelfConsume) {
				this.tickSelfConsumingItem(item, elapsed)
			} else {
				this.tickPersistentItem(item)
			}
		}

		// Remove completed items in individual fade mode
		if (session.options.fadeMode === 'individual') {
			for (let i = session.items.length - 1; i >= 0; i--) {
				if (session.items[i].scribble.points.length === 0) {
					session.items.splice(i, 1)
				}
			}
		}
	}

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

	private tickGroupedFade(session: Session, elapsed: number): void {
		session.fadeElapsed += elapsed

		let remainingPoints = 0
		for (const item of session.items) {
			remainingPoints += item.scribble.points.length
		}

		if (remainingPoints === 0) return

		if (session.fadeElapsed >= session.options.fadeDurationMs) {
			for (const item of session.items) {
				item.scribble.points.length = 0
			}
			return
		}

		const progress = session.fadeElapsed / session.options.fadeDurationMs
		const easedProgress = session.options.fadeEasing === 'ease-in' ? progress * progress : progress

		const targetRemoved = Math.floor(easedProgress * session.totalPointsAtFadeStart)
		const actuallyRemoved = session.totalPointsAtFadeStart - remainingPoints
		const pointsToRemove = Math.max(1, targetRemoved - actuallyRemoved)

		let removed = 0
		let itemIndex = 0
		while (removed < pointsToRemove && itemIndex < session.items.length) {
			const item = session.items[itemIndex]
			if (item.scribble.points.length > 0) {
				item.scribble.points.shift()
				removed++
			} else {
				itemIndex++
			}
		}
	}
}
