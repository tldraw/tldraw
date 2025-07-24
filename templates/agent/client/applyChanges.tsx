import { TLAiStreamingChange, defaultApplyChange } from '@tldraw/ai'
import { Editor, RecordsDiff, TLRecord } from 'tldraw'
import { $chatHistoryItems } from './ChatHistory'
import { ChatHistoryItem } from './ChatHistoryItem'
import { AreaContextItem } from './Context'
import { $requestsSchedule, ScheduledRequest } from './requestsSchedule'

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
						if (!change.complete) return prev
						const contextArea: AreaContextItem = {
							type: 'area',
							bounds: {
								x: change.x,
								y: change.y,
								w: change.w,
								h: change.h,
							},
							source: 'agent',
						}

						const prevRequest = prev[prev.length - 1]
						if (!prevRequest) {
							// TODO: Get rid of this by letting the agent decide the bounds instead
							throw new Error("We couldnt find the request's bounds from the previous request.")
						}

						const schedule: ScheduledRequest[] = [
							...prev,
							{
								review: true,
								message: change.intent ?? '',
								contextItems: [contextArea],
								bounds: prevRequest.bounds,
							},
						]
						return schedule
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
			createOrUpdateHistoryItem({
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
				type: 'agent-change',
				diff,
				change,
				status: change.complete ? 'done' : 'progress',
				acceptance: 'pending',
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
