import { Atom, atom, VecModel } from 'tldraw'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * Manages the chat origin position for an agent.
 * The chat origin represents where on the canvas a conversation started,
 * and is used to track the spatial context of the chat session.
 */
export class AgentChatOriginManager extends BaseAgentManager {
	/**
	 * An atom containing the position on the page where the current chat started.
	 * Used to track the origin point of the conversation on the canvas.
	 */
	private $chatOrigin: Atom<VecModel>

	/**
	 * Creates a new chat origin manager for the given agent.
	 * Initializes the origin to (0, 0).
	 */
	constructor(agent: TldrawAgent) {
		super(agent)
		this.$chatOrigin = atom('chatOrigin', { x: 0, y: 0 })
	}

	/**
	 * Set the chat origin position on the canvas.
	 * The origin represents where the conversation started spatially.
	 * @param origin - The position where the chat started, with x and y coordinates.
	 */
	setOrigin(origin: VecModel) {
		this.$chatOrigin.set(origin)
	}

	/**
	 * Get the current chat origin position.
	 * @returns The position where the chat started on the canvas.
	 */
	getOrigin() {
		return this.$chatOrigin.get()
	}

	/**
	 * Reset the chat origin manager to its initial state.
	 * Sets the origin to the current viewport position.
	 */
	reset(): void {
		const viewport = this.agent.editor.getViewportPageBounds()
		this.$chatOrigin.set({ x: viewport.x, y: viewport.y })
	}
}
