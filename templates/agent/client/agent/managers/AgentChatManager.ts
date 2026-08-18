import { Atom, atom } from 'tldraw'
import { ChatHistoryItem } from '../../../shared/types/ChatHistoryItem'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * The agent's chat history: prompts, actions, and continuations.
 */
export class AgentChatManager extends BaseAgentManager {
	private $chatHistory: Atom<ChatHistoryItem[]>

	constructor(agent: TldrawAgent) {
		super(agent)
		this.$chatHistory = atom('chatHistory', [])
	}

	getHistory() {
		return this.$chatHistory.get()
	}

	setHistory(history: ChatHistoryItem[]) {
		this.$chatHistory.set(history)
	}

	reset(): void {
		this.$chatHistory.set([])
	}

	push(...items: ChatHistoryItem[]) {
		if (items.length === 0) return
		this.$chatHistory.update((prev) => [...prev, ...items])
	}

	update(updater: (history: ChatHistoryItem[]) => ChatHistoryItem[]) {
		this.$chatHistory.update(updater)
	}
}
