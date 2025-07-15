import { TLAiChange, TLAiStreamingChange, defaultApply } from '@tldraw/ai'
import { Editor } from 'tldraw'
import { $chatHistoryItems } from './ChatHistory'
import { ChatHistoryItem } from './ChatHistoryItem'
import { $requestsSchedule } from './requestsSchedule'

const createOrUpdateHistoryItem = (item: ChatHistoryItem) => {
	$chatHistoryItems.update((prev) => {
		const lastItem = prev[prev.length - 1]
		// If the last item is not the same type, create a new one
		// (Unless the last item is an agent-raw, in which case we want to update it)
		if (lastItem.type !== item.type && lastItem.type !== 'agent-raw') {
			return [...prev, item]
		}

		// If the last item is complete, create a new one
		if (lastItem.status === 'done') {
			return [...prev, item]
		}

		// If the last item is not complete, update it
		return [...prev.slice(0, -1), item]
	})
}

export function applyChanges({
	change,
	editor,
}: {
	change: TLAiStreamingChange<TLAiChange>
	editor: Editor
}) {
	defaultApply({ change, editor })

	if (change.complete) {
		console.log(change)
	}

	switch (change.type) {
		case 'custom': {
			switch (change.action) {
				case 'message': {
					createOrUpdateHistoryItem({
						type: 'agent-message',
						message: change.text,
						status: change.complete ? 'done' : 'progress',
					})
					return
				}
				case 'think': {
					createOrUpdateHistoryItem({
						type: 'agent-action',
						action: 'thinking',
						status: change.complete ? 'done' : 'progress',
						info: change.text,
					})
					return
				}
				case 'schedule': {
					createOrUpdateHistoryItem({
						type: 'agent-action',
						action: 'schedule',
						status: change.complete ? 'done' : 'progress',
						info: change.intent ?? '',
					})
					$requestsSchedule.update((prev) => {
						if (change.complete) {
							return [...prev, { review: true, message: change.intent ?? '' }]
						}
						return prev
					})
					return
				}
				default: {
					createOrUpdateHistoryItem({
						type: 'agent-raw',
						change,
						status: change.complete ? 'done' : 'progress',
					})
					return
				}
			}
		}
		case 'createShape': {
			// createOrUpdateHistoryItem({
			// 	type: 'agent-action',
			// 	action: 'creating',
			// 	status: change.complete ? 'done' : 'progress',
			// 	info: change.description ?? '',
			// })
			createOrUpdateHistoryItem({
				type: 'agent-change',
				change,
				status: change.complete ? 'done' : 'progress',
			})
			return
		}
		case 'updateShape': {
			createOrUpdateHistoryItem({
				type: 'agent-action',
				action: 'updating',
				status: change.complete ? 'done' : 'progress',
				info: change.description ?? '',
			})
			return
		}
		case 'deleteShape': {
			createOrUpdateHistoryItem({
				type: 'agent-action',
				action: 'deleting',
				status: change.complete ? 'done' : 'progress',
				info: change.description ?? '',
			})
			return
		}
	}
}
