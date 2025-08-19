import { atom, RecordsDiff, squashRecordDiffs, TLRecord } from 'tldraw'
import { AgentEvent } from '../../shared/types/AgentEvent'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHistoryItem } from '../components/chat-history/AgentHistoryItem'

export const $chatHistoryItems = atom<AgentHistoryItem[]>('chatHistoryItems', [])

export function addEventToHistory(event: Streaming<AgentEvent>, diff: RecordsDiff<TLRecord>) {
	const item: AgentHistoryItem = {
		type: 'event',
		event,
		diff,
		acceptance: 'pending',
		status: event.complete ? 'done' : 'progress',
	}

	$chatHistoryItems.update((items) => {
		// If there are no items, start off the chat history with the first item
		if (items.length === 0) return [item]

		// If the last item is still in progress, replace it with the new item
		const lastItem = items.at(-1)
		if (lastItem?.status === 'progress') {
			if (item.type === 'event' && lastItem.type === 'event') {
				const mergedDiff = squashRecordDiffs([item.diff, lastItem.diff])
				console.log('mergedDiff', mergedDiff)
				return [...items.slice(0, -1), { ...item, diff: mergedDiff }]
			}
			return [...items.slice(0, -1), item]
		}

		// Otherwise, just add the new item to the end of the list
		return [...items, item]
	})
}
