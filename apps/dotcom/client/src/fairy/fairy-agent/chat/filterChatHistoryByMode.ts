import { ChatHistoryItem, FairyMemoryLevel } from '@tldraw/fairy-shared'

/**
 * Filters chat history items based on the agent's current mode memory level.
 *
 * - 'fairy': Returns all items with memory level 'fairy'
 * - 'project': Returns items with memory level 'project', stopping at 'fairy' level items
 * - 'task': Returns items with memory level 'task', stopping at any other level
 */
export function filterChatHistoryByMode(
	allItems: ChatHistoryItem[],
	memoryLevel: FairyMemoryLevel
): ChatHistoryItem[] {
	switch (memoryLevel) {
		case 'fairy':
			return allItems.filter((item) => item.memoryLevel === 'fairy')
		case 'project': {
			const filteredItems: ChatHistoryItem[] = []
			for (let i = allItems.length - 1; i >= 0; i--) {
				const item = allItems[i]
				if (item.memoryLevel === 'project') {
					filteredItems.unshift(item)
				} else if (item.memoryLevel === 'task') {
					continue
				} else if (item.memoryLevel === 'fairy') {
					break
				}
			}
			return filteredItems
		}
		case 'task': {
			const filteredItems: ChatHistoryItem[] = []
			for (let i = allItems.length - 1; i >= 0; i--) {
				const item = allItems[i]
				if (item.memoryLevel === 'task') {
					filteredItems.unshift(item)
				} else {
					break
				}
			}
			return filteredItems
		}
	}
}
