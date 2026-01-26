import { ScribbleSession, StateNode, TLStateNodeConstructor } from '@tldraw/editor'
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

	private session: ScribbleSession | null = null

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onExit() {
		this.session = null
	}

	override onCancel() {
		if (this.session) {
			this.session.clear()
			this.session = null
			this.transition('idle')
		} else {
			this.editor.setCurrentTool('select')
		}
	}

	/**
	 * Get the current laser session, or create a new one if none exists or the current one is fading.
	 */
	getSession(): ScribbleSession {
		// Reuse existing session if it's still active
		if (this.session?.isActive()) {
			return this.session
		}

		// Create a new session
		this.session = this.editor.scribbles.startSession({
			selfConsume: false,
			idleTimeoutMs: this.editor.options.laserDelayMs,
			fadeMode: 'grouped',
			fadeEasing: 'ease-in',
		})

		return this.session
	}
}
