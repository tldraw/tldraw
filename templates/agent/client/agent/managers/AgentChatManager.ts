import { Atom, atom } from 'tldraw'
import { ChatHistoryItem } from '../../../shared/types/ChatHistoryItem'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * Manages chat history for an agent.
 * The chat history stores all interactions between the user and the agent,
 * including prompts, actions, and continuations.
 */
export class AgentChatManager extends BaseAgentManager {
	/**
	 * An atom containing the agent's chat history.
	 * Stores all chat interactions including prompts, actions, and continuations.
	 */
	private $chatHistory: Atom<ChatHistoryItem[]>

	/**
	 * Creates a new AgentChatManager instance.
	 * Initializes chat history atom with an empty array.
	 */
	constructor(agent: TldrawAgent) {
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
	 * Set the chat history directly.
	 * Primarily used for loading persisted state.
	 * @param history - The chat history items to set.
	 */
	setHistory(history: ChatHistoryItem[]) {
		this.$chatHistory.set(history)
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
}
