import { ChatHistoryItem } from '@tldraw/fairy-shared'
import { atom, Atom, VecModel } from 'tldraw'
import { FairyAgent } from '../FairyAgent'
import { BaseFairyAgentManager } from './BaseFairyAgentManager'

/**
 * Manages chat history and chat-related state for a fairy agent.
 * The chat history stores all interactions between the user and the agent,
 * including prompts, actions, and continuations.
 */
export class FairyAgentChatManager extends BaseFairyAgentManager {
	/**
	 * An atom containing the agent's chat history.
	 * Stores all chat interactions including prompts, actions, and continuations.
	 * @private
	 */
	private $chatHistory: Atom<ChatHistoryItem[]>

	/**
	 * An atom containing the position on the page where the current chat started.
	 * Used to track the origin point of the conversation on the canvas.
	 * @private
	 */
	private $chatOrigin: Atom<VecModel>

	/**
	 * Creates a new FairyAgentChatManager instance.
	 * Initializes chat history and origin atoms with default values.
	 */
	constructor(public agent: FairyAgent) {
		super(agent)
		this.$chatHistory = atom('chatHistory', [])
		this.$chatOrigin = atom('chatOrigin', { x: 0, y: 0 })
	}

	/**
	 * Get the current chat history.
	 * @returns The array of chat history items.
	 */
	getHistory() {
		return this.$chatHistory.get()
	}

	/**
	 * Reset the chat manager to its initial state.
	 * Clears all chat history and resets the origin to (0, 0).
	 */
	reset(): void {
		this.$chatHistory.set([])
		this.$chatOrigin.set({ x: 0, y: 0 })
	}

	/**
	 * Push one or more items to the chat history.
	 * Items are appended to the end of the history array.
	 * If no items are provided, this method does nothing.
	 * @param items - The chat history item(s) to add.
	 * @example
	 * ```ts
	 * chatManager.push(promptItem)
	 * chatManager.push(actionItem1, actionItem2)
	 * ```
	 */
	push(...items: ChatHistoryItem[]) {
		if (items.length === 0) return
		this.$chatHistory.update((prev) => [...prev, ...items])
	}

	/**
	 * Clear all chat history.
	 * Removes all items from the chat history but does not affect the chat origin.
	 */
	clear() {
		this.$chatHistory.set([])
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
	 * Update chat history items in place using an updater function.
	 * This is used for operations like marking actions as accepted/rejected,
	 * modifying existing items, or filtering the history.
	 * @param updater - A function that receives the current history and returns the updated history.
	 * @example
	 * ```ts
	 * // Mark all actions as accepted
	 * chatManager.update((history) =>
	 *   history.map((item) =>
	 *     item.type === 'action' ? { ...item, acceptance: 'accepted' } : item
	 *   )
	 * )
	 * ```
	 */
	update(updater: (history: ChatHistoryItem[]) => ChatHistoryItem[]) {
		this.$chatHistory.update(updater)
	}

	/**
	 * Serialize the chat state to a plain object for persistence.
	 * Useful for saving the chat state to local storage or sending to a server.
	 * @returns An object containing the chat history and origin.
	 */
	serializeState() {
		return {
			chatHistory: this.$chatHistory.get(),
			chatOrigin: this.$chatOrigin.get(),
		}
	}

	/**
	 * Load previously persisted chat state into the manager.
	 * Restores both chat history and origin from a serialized state object.
	 * If either property is missing, it will not be updated.
	 * @param state - An object containing optional chatHistory and chatOrigin properties.
	 */
	loadState(state: { chatHistory?: ChatHistoryItem[]; chatOrigin?: VecModel }) {
		if (state.chatHistory) {
			this.$chatHistory.set(state.chatHistory)
		}
		if (state.chatOrigin) {
			this.$chatOrigin.set(state.chatOrigin)
		}
	}
}
