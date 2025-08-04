import { Editor, TLShapeId } from 'tldraw'
import { createOrUpdateHistoryItem } from './atoms/chatHistoryItems'
import { $requestsSchedule } from './atoms/requestsSchedule'
import { AreaContextItem } from './types/ContextItem'
import { ScheduledRequest } from './types/ScheduledRequest'
import { Streaming, TLAgentChange, TLAgentPlaceChange } from './types/TLAgentChange'

export function applyAgentChange({
	editor,
	change,
}: {
	editor: Editor
	change: Streaming<TLAgentChange>
}) {
	if (change.complete) {
		console.log('AGENT CHANGE', change)
	}

	switch (change.type) {
		case 'message': {
			createOrUpdateHistoryItem({
				type: 'agent-message',
				message: change.text ?? '',
				status: change.complete ? 'done' : 'progress',
			})
			return
		}
		case 'think': {
			createOrUpdateHistoryItem({
				type: 'agent-action',
				action: 'thinking',
				status: change.complete ? 'done' : 'progress',
				info: change.text ?? '',
			})
			return
		}
		case 'review': {
			createOrUpdateHistoryItem({
				type: 'agent-action',
				action: 'review',
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

				// Use the previous request's view bounds if it exists
				// Otherwise use the scheduled review's bounds
				const prevRequest = prev[prev.length - 1] ?? {
					bounds: {
						x: change.x,
						y: change.y,
						w: change.w,
						h: change.h,
					},
				}

				const schedule: ScheduledRequest[] = [
					...prev,
					{
						type: 'review',
						message: change.intent ?? '',
						contextItems: [contextArea],
						bounds: prevRequest.bounds,
					},
				]
				return schedule
			})
			return
		}
		case 'setMyView': {
			createOrUpdateHistoryItem({
				type: 'agent-action',
				action: 'setMyView',
				status: change.complete ? 'done' : 'progress',
				info: change.intent ?? '',
			})

			$requestsSchedule.update((prev) => {
				if (!change.complete) return prev

				const schedule: ScheduledRequest[] = [
					...prev,
					{
						type: 'setMyView',
						message: change.intent ?? '',
						contextItems: [],
						bounds: {
							x: change.x,
							y: change.y,
							w: change.w,
							h: change.h,
						},
					},
				]
				return schedule
			})
			return
		}
		case 'distribute': {
			if (!change.complete) return
			const { direction, shapeIds } = change
			const diff = editor.store.extractingChanges(() => {
				editor.distributeShapes(shapeIds as TLShapeId[], direction)
			})
			createOrUpdateHistoryItem({
				type: 'agent-change',
				diff,
				change,
				status: 'done',
				acceptance: 'pending',
			})
			return
		}
		case 'stack': {
			if (!change.complete) return
			const { direction, shapeIds, gap } = change
			const diff = editor.store.extractingChanges(() => {
				const alignOperation = direction === 'vertical' ? 'center-vertical' : 'center-horizontal'
				editor.alignShapes(shapeIds as TLShapeId[], alignOperation)
				editor.stackShapes(shapeIds as TLShapeId[], direction, Math.max(gap, 1))
			})
			createOrUpdateHistoryItem({
				type: 'agent-change',
				diff,
				change,
				status: 'done',
				acceptance: 'pending',
			})
			return
		}
		case 'align': {
			if (!change.complete) return
			const { alignment, shapeIds } = change
			const diff = editor.store.extractingChanges(() => {
				editor.alignShapes(shapeIds as TLShapeId[], alignment)
			})
			createOrUpdateHistoryItem({
				type: 'agent-change',
				diff,
				change,
				status: 'done',
				acceptance: 'pending',
			})
			return
		}
		case 'place': {
			if (!change.complete) return
			const diff = editor.store.extractingChanges(() => {
				placeShape(editor, change)
			})
			createOrUpdateHistoryItem({
				type: 'agent-change',
				diff,
				change,
				status: 'done',
				acceptance: 'pending',
			})
			return
		}
		// Ignore all AI changes
		// We'll handle them after transforms are applied
		case 'createShape':
		case 'updateShape':
		case 'deleteShape':
		case 'createBinding':
		case 'updateBinding':
		case 'deleteBinding': {
			return
		}
		default: {
			createOrUpdateHistoryItem({
				type: 'agent-raw',
				change,
				status: change.complete ? 'done' : 'progress',
			})
		}
	}
}

function placeShape(editor: Editor, change: Streaming<TLAgentPlaceChange>) {
	const { shapeId, referenceShapeId, side, sideOffset = 0, align, alignOffset = 0 } = change

	if (!shapeId || !referenceShapeId) return
	const shape = editor.getShape(shapeId as TLShapeId)
	if (!shape) return
	const referenceShape = editor.getShape(referenceShapeId as TLShapeId)
	if (!referenceShape) return
	const bbA = editor.getShapePageBounds(shape.id)!
	const bbR = editor.getShapePageBounds(referenceShape.id)!
	if (side === 'top' && align === 'start') {
		editor.updateShape({
			id: shape.id,
			type: shape.type,
			x: bbR.minX + alignOffset,
			y: bbR.minY - bbA.height - sideOffset,
		})
	} else if (side === 'top' && align === 'center') {
		editor.updateShape({
			id: shape.id,
			type: shape.type,
			x: bbR.midX - bbA.width / 2 + alignOffset,
			y: bbR.minY - bbA.height - sideOffset,
		})
	} else if (side === 'top' && align === 'end') {
		editor.updateShape({
			id: shape.id,
			type: shape.type,
			x: bbR.maxX - bbA.width - alignOffset,
			y: bbR.minY - bbA.height - sideOffset,
		})
	} else if (side === 'bottom' && align === 'start') {
		editor.updateShape({
			id: shape.id,
			type: shape.type,
			x: bbR.minX + alignOffset,
			y: bbR.maxY + sideOffset,
		})
	} else if (side === 'bottom' && align === 'center') {
		editor.updateShape({
			id: shape.id,
			type: shape.type,
			x: bbR.midX - bbA.width / 2 + alignOffset,
			y: bbR.maxY + sideOffset,
		})
	} else if (side === 'bottom' && align === 'end') {
		editor.updateShape({
			id: shape.id,
			type: shape.type,
			x: bbR.maxX - bbA.width - alignOffset,
			y: bbR.maxY + sideOffset,
		})
		// LEFT SIDE (corrected)
	} else if (side === 'left' && align === 'start') {
		editor.updateShape({
			id: shape.id,
			type: shape.type,
			x: bbR.minX - bbA.width - sideOffset,
			y: bbR.minY + alignOffset,
		})
	} else if (side === 'left' && align === 'center') {
		editor.updateShape({
			id: shape.id,
			type: shape.type,
			x: bbR.minX - bbA.width - sideOffset,
			y: bbR.midY - bbA.height / 2 + alignOffset,
		})
	} else if (side === 'left' && align === 'end') {
		editor.updateShape({
			id: shape.id,
			type: shape.type,
			x: bbR.minX - bbA.width - sideOffset,
			y: bbR.maxY - bbA.height - alignOffset,
		})
		// RIGHT SIDE (corrected)
	} else if (side === 'right' && align === 'start') {
		editor.updateShape({
			id: shape.id,
			type: shape.type,
			x: bbR.maxX + sideOffset,
			y: bbR.minY + alignOffset,
		})
	} else if (side === 'right' && align === 'center') {
		editor.updateShape({
			id: shape.id,
			type: shape.type,
			x: bbR.maxX + sideOffset,
			y: bbR.midY - bbA.height / 2 + alignOffset,
		})
	} else if (side === 'right' && align === 'end') {
		editor.updateShape({
			id: shape.id,
			type: shape.type,
			x: bbR.maxX + sideOffset,
			y: bbR.maxY - bbA.height - alignOffset,
		})
	}
}
