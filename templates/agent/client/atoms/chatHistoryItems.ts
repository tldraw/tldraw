import { atom } from 'tldraw'
import { AgentHistoryItem } from '../components/chat-history/AgentHistoryItem'

export const $chatHistoryItems = atom<AgentHistoryItem[]>('chatHistoryItems', [])

export function createOrUpdateHistoryItem(item: AgentHistoryItem) {
	$chatHistoryItems.update((items) => {
		// If there are no items, start off the chat history with the first item
		if (items.length === 0) return [item]

		// If the most recent item of the same type is still in progress, replace it with the new item
		const lastItem = items.findLast((item) => item.type === item.type)
		if (lastItem?.status === 'progress') {
			return [...items.slice(0, -1), item]
		}

		// Otherwise, just add the new item to the end of the list
		return [...items, item]
	})
}
