import { Editor } from '../../Editor'
import type { ScribbleItem, ScribbleSessionOptions } from './ScribbleSession'
import { ScribbleSession } from './ScribbleSession'

export { ScribbleSession }
export type { ScribbleItem, ScribbleSessionOptions }

/** @public */
export class ScribbleManager {
	private sessions = new Map<string, ScribbleSession>()

	constructor(private editor: Editor) {}

	/**
	 * Start a new session.
	 *
	 * @param options - Session configuration
	 * @returns The created session
	 * @public
	 */
	startSession(options?: ScribbleSessionOptions): ScribbleSession {
		const session = new ScribbleSession(this.editor, options)
		this.sessions.set(session.id, session)
		return session
	}

	/**
	 * Get a session by id.
	 *
	 * @param id - The session id
	 * @public
	 */
	getSession(id: string): ScribbleSession | undefined {
		return this.sessions.get(id)
	}

	/**
	 * Stop and remove all sessions.
	 *
	 * @public
	 */
	reset(): void {
		for (const session of this.sessions.values()) {
			session.dispose()
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
				session.tick(elapsed)
			}

			// Remove completed sessions
			for (const [id, session] of this.sessions) {
				if (session.isComplete()) {
					session.dispose()
					this.sessions.delete(id)
				}
			}

			// Collect scribbles from all sessions
			const scribbles = []
			for (const session of this.sessions.values()) {
				scribbles.push(...session.getScribbles())
			}

			this.editor.updateInstanceState({ scribbles })
		})
	}

	// ---- Convenience methods for simple single-scribble usage ----

	/**
	 * Add a scribble using the default self-consuming behavior.
	 * Creates an implicit session for the scribble.
	 *
	 * @param scribble - Partial scribble properties
	 * @param id - Optional scribble id
	 * @returns The created scribble item
	 * @public
	 */
	addScribble(
		scribble: Parameters<ScribbleSession['addScribble']>[0],
		id?: string
	): ScribbleItem & { session: ScribbleSession } {
		const session = this.startSession()
		const item = session.addScribble(scribble, id)
		return Object.assign(item, { session })
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
				return session.addPoint(id, x, y, z)
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
				return session.stopScribble(id)
			}
		}
		throw Error(`Scribble with id ${id} not found`)
	}
}
