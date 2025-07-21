import { TLAiStreamingChange, defaultApplyChange } from '@tldraw/ai'
import { Editor, RecordsDiff, TLRecord, uniqueId } from 'tldraw'
import { $chatHistoryItems } from './ChatHistory'
import { ChatHistoryItem } from './ChatHistoryItem'
import { $requestsSchedule } from './requestsSchedule'

export function applyChange({ change, editor }: { change: TLAiStreamingChange; editor: Editor }) {
	const diff = editor.store.extractingChanges(() => {
		defaultApplyChange({ change, editor })
	})

	applyChangeToChatHistory({ change, diff })
}

function applyChangeToChatHistory({
	change,
	diff,
}: {
	change: TLAiStreamingChange
	diff: RecordsDiff<TLRecord>
}) {
	switch (change.type) {
		case 'custom': {
			switch (change.action) {
				case 'message': {
					createOrUpdateHistoryItem({
						id: uniqueId(),
						type: 'agent-message',
						message: change.text,
						status: change.complete ? 'done' : 'progress',
					})
					return
				}
				case 'think': {
					createOrUpdateHistoryItem({
						id: uniqueId(),
						type: 'agent-action',
						action: 'thinking',
						status: change.complete ? 'done' : 'progress',
						info: change.text,
					})
					return
				}
				case 'schedule': {
					createOrUpdateHistoryItem({
						id: uniqueId(),
						type: 'agent-action',
						action: 'schedule',
						status: change.complete ? 'done' : 'progress',
						info: change.intent ?? '',
					})
					$requestsSchedule.update((prev) => {
						if (change.complete) {
							const lastItem = prev[prev.length - 1]
							return [
								...prev,
								{
									review: true,
									message: change.intent ?? '',
									contextItems: lastItem?.contextItems ?? [],
								},
							]
						}
						return prev
					})
					return
				}
				default: {
					createOrUpdateHistoryItem({
						id: uniqueId(),
						type: 'agent-raw',
						change,
						status: change.complete ? 'done' : 'progress',
					})
					return
				}
			}
		}
		case 'createShape': {
			createOrUpdateHistoryItem({
				id: uniqueId(),
				type: 'agent-change',
				diff,
				change,
				status: change.complete ? 'done' : 'progress',
				acceptance: 'pending',
			})
			return
		}
		case 'updateShape': {
			createOrUpdateHistoryItem({
				id: uniqueId(),
				type: 'agent-change',
				diff,
				change,
				status: change.complete ? 'done' : 'progress',
				acceptance: 'pending',
			})
			return
		}
		case 'deleteShape': {
			createOrUpdateHistoryItem({
				id: uniqueId(),
				type: 'agent-change',
				diff,
				change,
				status: change.complete ? 'done' : 'progress',
				acceptance: 'pending',
			})
			return
		}
	}
}

function createOrUpdateHistoryItem(item: ChatHistoryItem) {
	$chatHistoryItems.update((items) => {
		if (items.length === 0) return [item]

		const lastItem = items[items.length - 1]
		if (lastItem.status === 'progress') {
			return [...items.slice(0, -1), item]
		}
		return [...items, item]
	})
}
