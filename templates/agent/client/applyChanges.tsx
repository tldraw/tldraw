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
	$chatHistoryItems.update((prev) => {
		const newItems = getChatHistoryWithAddedItem({ items: prev, item })
		const mergedItems = getChatHistoryWithMergedAdjacentItems({ items: newItems })
		return mergedItems
	})
}

function getChatHistoryWithAddedItem({
	items,
	item,
}: {
	items: ChatHistoryItem[]
	item: ChatHistoryItem
}): ChatHistoryItem[] {
	const lastItem = items[items.length - 1]
	if (!lastItem) return [item]

	// If the previous item is in progress, then replace it with the new item
	if (lastItem.status === 'progress') {
		let newItem = item
		if (lastItem.type === 'agent-change' && item.type === 'agent-change') {
			// Replace the final change with the new one
			const changeCount = item.changes.length
			const newChanges = [...lastItem.changes.slice(0, -changeCount), ...item.changes]
			newItem = {
				...item,
				changes: newChanges,
				status: item.status,
			}
		}

		return [...items.slice(0, -1), newItem]
	}

	// If the previous item is done or cancelled, then create a new one
	return [...items, item]
}

function getChatHistoryWithMergedAdjacentItems({
	items,
}: {
	items: ChatHistoryItem[]
}): ChatHistoryItem[] {
	const newItems = []
	for (let i = 0; i < items.length; i++) {
		const currentItem = items[i]
		const nextItem = items[i + 1]

		if (
			currentItem.type === 'agent-change' &&
			currentItem.acceptance === 'pending' &&
			nextItem?.type === 'agent-change' &&
			nextItem.acceptance === 'pending'
		) {
			const mergedItem = {
				...nextItem,
				changes: [...currentItem.changes, ...nextItem.changes],
			}
			newItems.push(mergedItem)
			i++
			continue
		}

		newItems.push(currentItem)
	}

	return newItems
}
