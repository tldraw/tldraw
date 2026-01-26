import { StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { Idle } from './childStates/Idle'
import { Lasering } from './childStates/Lasering'

/** @public */
export class LaserTool extends StateNode {
	static override id = 'laser'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Lasering]
	}
	static override isLockable = false

	private sessionId: string | null = null

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onExit() {
		this.sessionId = null
	}

	override onCancel() {
		if (this.sessionId && this.editor.scribbles.isSessionActive(this.sessionId)) {
			this.editor.scribbles.clearSession(this.sessionId)
			this.sessionId = null
			this.transition('idle')
		} else {
			this.editor.setCurrentTool('select')
		}
	}

	/**
	 * Get the current laser session ID, or create a new one if none exists or the current one is fading.
	 */
	getSessionId(): string {
		// Reuse existing session if it's still active
		if (this.sessionId && this.editor.scribbles.isSessionActive(this.sessionId)) {
			return this.sessionId
		}

		// Create a new session
		this.sessionId = this.editor.scribbles.startSession({
			selfConsume: false,
			idleTimeoutMs: this.editor.options.laserDelayMs,
			fadeMode: 'grouped',
			fadeEasing: 'ease-in',
		})

		return this.sessionId
	}
}
