import { atom } from 'tldraw'
import { ChatHistoryItem } from '../types/ChatHistoryItem'

export const $chatHistoryItems = atom<ChatHistoryItem[]>('chatHistoryItems', [])

export function createOrUpdateHistoryItem(item: ChatHistoryItem) {
	$chatHistoryItems.update((items) => {
		if (items.length === 0) return [item]

		const lastItem = items[items.length - 1]
		if (lastItem.status === 'progress') {
			return [...items.slice(0, -1), item]
		}
		return [...items, item]
	})
}
