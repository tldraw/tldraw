import { TLAiStreamingChange, defaultApplyChange } from '@tldraw/ai'
import { Editor, TLShape } from 'tldraw'
import { $chatHistoryItems } from './ChatHistory'
import { ChatHistoryItem } from './ChatHistoryItem'
import { $requestsSchedule } from './requestsSchedule'

export function applyChanges({ change, editor }: { change: TLAiStreamingChange; editor: Editor }) {
	if (change.complete) {
		// console.log(change)
	}

	applyChangeToChatHistory({ change, editor })
	defaultApplyChange({ change, editor })
}

function applyChangeToChatHistory({
	change,
	editor,
}: {
	change: TLAiStreamingChange
	editor: Editor
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
				changes: [change],
				status: change.complete ? 'done' : 'progress',
				acceptance: 'pending',
			})
			return
		}
		case 'updateShape': {
			// createOrUpdateHistoryItem({
			// 	type: 'agent-action',
			// 	action: 'updating',
			// 	status: change.complete ? 'done' : 'progress',
			// 	info: change.description ?? '',
			// })
			let previousShape: TLShape | undefined = undefined
			if (change.complete) {
				previousShape = editor.getShape(change.shape.id)
			}
			const newShape = {
				...previousShape,
				...change.shape,
				props: { ...previousShape?.props, ...(change.shape?.props ?? {}) },
				meta: { ...previousShape?.meta, ...change.shape?.meta },
			}
			createOrUpdateHistoryItem({
				type: 'agent-change',
				changes: [{ ...change, previousShape, shape: newShape as TLShape }],
				status: change.complete ? 'done' : 'progress',
				acceptance: 'pending',
			})
			return
		}
		case 'deleteShape': {
			// createOrUpdateHistoryItem({
			// 	type: 'agent-action',
			// 	action: 'deleting',
			// 	status: change.complete ? 'done' : 'progress',
			// 	info: change.description ?? '',
			// })
			let shape: TLShape | undefined = undefined
			if (change.complete) {
				shape = editor.getShape(change.shapeId)
			}
			createOrUpdateHistoryItem({
				type: 'agent-change',
				changes: [{ ...change, shape }],
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
