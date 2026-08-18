import { Atom, atom, VecModel } from 'tldraw'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * Where on the page the current chat started. Requests are sent to the model
 * relative to this point to keep coordinates small.
 */
export class AgentChatOriginManager extends BaseAgentManager {
	private $chatOrigin: Atom<VecModel>

	constructor(agent: TldrawAgent) {
		super(agent)
		this.$chatOrigin = atom('chatOrigin', { x: 0, y: 0 })
	}

	setOrigin(origin: VecModel) {
		this.$chatOrigin.set(origin)
	}

	getOrigin() {
		return this.$chatOrigin.get()
	}

	/** Reset the origin to the current viewport position. */
	reset(): void {
		const viewport = this.agent.editor.getViewportPageBounds()
		this.$chatOrigin.set({ x: viewport.x, y: viewport.y })
	}
}
