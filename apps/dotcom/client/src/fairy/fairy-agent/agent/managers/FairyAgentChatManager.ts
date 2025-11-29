import { ChatHistoryItem } from '@tldraw/fairy-shared'
import { atom, Atom, VecModel } from 'tldraw'
import { FairyAgent } from '../FairyAgent'

/**
 * Manages chat history and chat-related state for a fairy agent.
 * The chat history stores all interactions between the user and the agent,
 * including prompts, actions, and continuations.
 */
export class FairyAgentChatManager {
	/**
	 * An atom containing the agent's chat history.
	 */
	$chatHistory: Atom<ChatHistoryItem[]>

	/**
	 * An atom containing the position on the page where the current chat started.
	 */
	$chatOrigin: Atom<VecModel>

	constructor(public agent: FairyAgent) {
		this.$chatHistory = atom('chatHistory', [])
		this.$chatOrigin = atom('chatOrigin', { x: 0, y: 0 })
	}

	/**
	 * Push one or more items to the chat history.
	 * @param items - The chat history item(s) to add
	 */
	pushToChatHistory(...items: ChatHistoryItem[]) {
		if (items.length === 0) return
		this.$chatHistory.update((prev) => [...prev, ...items])
	}

	/**
	 * Clear the chat history.
	 */
	clearChatHistory() {
		this.$chatHistory.set([])
	}

	/**
	 * Set the chat origin position.
	 * @param origin - The position where the chat started
	 */
	setChatOrigin(origin: VecModel) {
		this.$chatOrigin.set(origin)
	}

	/**
	 * Get the chat origin position.
	 */
	getChatOrigin() {
		return this.$chatOrigin.get()
	}

	/**
	 * Serialize the chat state to a plain object for persistence.
	 */
	serializeState() {
		return {
			chatHistory: this.$chatHistory.get(),
			chatOrigin: this.$chatOrigin.get(),
		}
	}

	/**
	 * Load previously persisted chat state into the manager.
	 */
	loadState(state: { chatHistory?: ChatHistoryItem[]; chatOrigin?: VecModel }) {
		if (state.chatHistory) {
			this.$chatHistory.set(state.chatHistory)
		}
		if (state.chatOrigin) {
			this.$chatOrigin.set(state.chatOrigin)
		}
	}

	/**
	 * Update chat history items in place.
	 * This is used for things like marking actions as accepted/rejected.
	 */
	updateChatHistory(updater: (history: ChatHistoryItem[]) => ChatHistoryItem[]) {
		this.$chatHistory.update(updater)
	}
}
