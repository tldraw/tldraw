import { ChatHistoryItem } from '@tldraw/fairy-shared'
import { atom, Atom } from 'tldraw'
import { FairyAgent } from '../FairyAgent'
import { BaseFairyAgentManager } from './BaseFairyAgentManager'

/**
 * Manages chat history for a fairy agent.
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
	 * Creates a new FairyAgentChatManager instance.
	 * Initializes chat history atom with an empty array.
	 */
	constructor(public agent: FairyAgent) {
		super(agent)
		this.$chatHistory = atom('chatHistory', [])
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
	 * Clears all chat history.
	 */
	reset(): void {
		this.$chatHistory.set([])
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
	 * Serialize the chat history to a plain object for persistence.
	 * Useful for saving the chat state to local storage or sending to a server.
	 * @returns An array of chat history items.
	 */
	serializeState() {
		return this.$chatHistory.get()
	}

	/**
	 * Load previously persisted chat history into the manager.
	 * Restores the chat history from a serialized state.
	 * @param chatHistory - An array of chat history items to restore.
	 */
	loadState(chatHistory: ChatHistoryItem[]) {
		this.$chatHistory.set(chatHistory)
	}
}
