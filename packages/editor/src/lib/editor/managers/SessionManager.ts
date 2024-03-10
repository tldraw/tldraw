import { uniqueId } from '../../utils/uniqueId'
import { Editor } from '../Editor'

/** @public */
export class SessionManager {
	constructor(public editor: Editor) {}

	/**
	 * The set of active sessions.
	 */
	private sessions = new Set<Session>()

	/**
	 * Get an array of the current sessions.
	 */
	getSessions() {
		return Array.from(this.sessions.values())
	}

	/**
	 * Add a session to the session manager.
	 */
	addSession(session: Session) {
		this.sessions.add(session)
	}

	/**
	 * Remove a session from the session manager.
	 */
	removeSession(session: Session) {
		this.sessions.delete(session)
	}

	/**
	 * Cancel and clear all sessions.
	 */
	clearSessions() {
		this.sessions.forEach((session) => session.cancel())
		this.sessions.clear()
	}
}

/**
 * A session is an interaction or other event that occurs over time,
 * such as resizing, drawing, or transforming shapes.
 *
 * @public
 */
export abstract class Session<T extends object = object> {
	constructor(
		public editor: Editor,
		public options = {} as T
	) {
		editor.sessions.addSession(this)
	}

	readonly id = uniqueId()

	abstract readonly type: string

	abstract start(): void

	abstract update(): void

	abstract complete(): void

	abstract cancel(): void

	abstract interrupt(): void

	remove() {
		this.editor.sessions.removeSession(this)
	}
}
