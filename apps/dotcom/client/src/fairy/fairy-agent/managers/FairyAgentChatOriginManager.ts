import { atom, Atom, VecModel } from 'tldraw'
import { FairyAgent } from '../FairyAgent'
import { BaseFairyAgentManager } from './BaseFairyAgentManager'

/**
 * Manages the chat origin position for a fairy agent.
 * The chat origin represents where on the canvas a conversation started,
 * and is used to track the spatial context of the chat session.
 */
export class FairyAgentChatOriginManager extends BaseFairyAgentManager {
	/**
	 * An atom containing the position on the page where the current chat started.
	 * Used to track the origin point of the conversation on the canvas.
	 * @private
	 */
	private $chatOrigin: Atom<VecModel>

	/**
	 * Creates a new chat origin manager for the given fairy agent.
	 * Initializes the origin to (0, 0).
	 */
	constructor(public agent: FairyAgent) {
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
	 * Sets the origin back to (0, 0).
	 */
	reset(): void {
		this.$chatOrigin.set({ x: 0, y: 0 })
	}

	/**
	 * Serialize the chat origin state to a plain object for persistence.
	 * @returns The chat origin position.
	 */
	serializeState() {
		return this.$chatOrigin.get()
	}

	/**
	 * Load previously persisted chat origin into the manager.
	 * @param chatOrigin - The chat origin position to restore.
	 */
	loadState(chatOrigin: VecModel) {
		this.$chatOrigin.set(chatOrigin)
	}
}
