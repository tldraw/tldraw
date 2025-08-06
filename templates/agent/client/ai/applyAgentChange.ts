import { defaultApplyChange, TLAiChange } from '@tldraw/ai'
import {
	Editor,
	IndexKey,
	TLArrowShape,
	TLBindingId,
	TLGeoShape,
	TLLineShape,
	TLNoteShape,
	TLRichText,
	TLShape,
	TLShapeId,
	TLShapePartial,
	TLTextShape,
	toRichText,
} from 'tldraw'
import {
	IAgentCreateEvent,
	IAgentEvent,
	IAgentPlaceEvent,
	IAgentUpdateEvent,
} from '../../worker/prompt/AgentEvent'
import { simpleFillToShapeFill, stringToSimpleColor } from '../../worker/simple/color'
import { createOrUpdateHistoryItem } from '../atoms/chatHistoryItems'
import { $requestsSchedule } from '../atoms/requestsSchedule'
import { AreaContextItem } from '../types/ContextItem'
import { ScheduledRequest } from '../types/ScheduledRequest'
import { Streaming } from '../types/Streaming'

/**
 * Apply a change to the app. This might mean making a change to the canvas. It
 * might also mean updating the chat history, or adding a new request to the
 * schedule.
 */
export function applySimpleEvent({
	editor,
	change,
}: {
	editor: Editor
	change: Streaming<IAgentEvent>
}) {
	if (change.complete) {
		console.log('AGENT CHANGE', change)
	}

	switch (change._type) {
		case 'create': {
			if (!change.complete) return
			const aiChanges = getTldrawAiChangesFromCreateEvent({ editor, agentChange: change })
			const diff = editor.store.extractingChanges(() => {
				for (const aiChange of aiChanges) {
					defaultApplyChange({ change: aiChange, editor })
				}
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
		case 'update': {
			if (!change.complete) return
			const aiChanges = getTldrawAiChangesFromUpdateEvent({ editor, agentChange: change })
			const diff = editor.store.extractingChanges(() => {
				for (const aiChange of aiChanges) {
					defaultApplyChange({ change: aiChange, editor })
				}
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
				editor.stackShapes(shapeIds as TLShapeId[], direction, Math.min(gap, 1))
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
		case 'label': {
			if (!change.complete) return
			const diff = editor.store.extractingChanges(() => {
				const shape = editor.getShape(change.shapeId as TLShapeId)
				if (!shape) return
				editor.updateShape({
					id: change.shapeId as TLShapeId,
					type: shape.type,
					props: { richText: toRichTextIfNeeded(change.text ?? '') },
				})
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
		case 'move': {
			if (!change.complete) return
			const diff = editor.store.extractingChanges(() => {
				const shape = editor.getShape(change.shapeId as TLShapeId)
				if (!shape) return
				editor.updateShape({
					id: change.shapeId as TLShapeId,
					type: shape.type,
					x: change.x,
					y: change.y,
				})
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
		case 'delete': {
			if (!change.complete) return
			const diff = editor.store.extractingChanges(() => {
				editor.deleteShape(change.shapeId as TLShapeId)
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
		default: {
			createOrUpdateHistoryItem({
				type: 'agent-raw',
				change,
				status: change.complete ? 'done' : 'progress',
			})
		}
	}
}

function getTldrawAiChangesFromUpdateEvent({
	editor,
	agentChange,
}: {
	editor: Editor
	agentChange: Streaming<IAgentUpdateEvent>
}): TLAiChange[] {
	const changes: TLAiChange[] = []
	if (!agentChange.complete) {
		const update = agentChange.update

		changes.push({
			type: 'updateShape',
			description: agentChange.intent ?? '',
			shape: {
				id: (update?.shapeId ?? '') as TLShapeId,
				type: '',
				meta: {
					note: update?.note ?? '',
				},
			},
		})

		return changes
	}

	const update = agentChange.update

	switch (update._type) {
		case 'text': {
			const shapeOnCanvas = editor.getShape(update.shapeId as TLShapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const mergedShape: TLShapePartial<TLTextShape> = {
				id: update.shapeId as TLShapeId,
				type: 'text',
				x: update.x,
				y: update.y,
				props: {
					color: update.color ? stringToSimpleColor(update.color) : undefined,
					richText: update.text ? toRichTextIfNeeded(update.text) : undefined,
				},
				meta: {
					note: update.note,
				},
			}

			changes.push({
				type: 'updateShape',
				description: agentChange.intent ?? '',
				shape: mergedShape,
			})
			break
		}
		case 'line': {
			const shapeOnCanvas = editor.getShape(update.shapeId as TLShapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const startX = update.x1
			const startY = update.y1
			const endX = update.x2 - startX
			const endY = update.y2 - startY

			const points = {
				a1: {
					id: 'a1',
					index: 'a1' as IndexKey,
					x: 0,
					y: 0,
				},
				a2: {
					id: 'a2',
					index: 'a2' as IndexKey,
					x: endX,
					y: endY,
				},
			}

			const mergedShape: TLShapePartial<TLLineShape> = {
				id: update.shapeId as TLShapeId,
				type: 'line',
				x: startX,
				y: startY,
				props: {
					color: update.color ? stringToSimpleColor(update.color) : undefined,
					points,
				},
				meta: {
					note: update.note,
				},
			}

			changes.push({
				type: 'updateShape',
				description: agentChange.intent ?? '',
				shape: mergedShape,
			})
			break
		}
		case 'arrow': {
			const shapeOnCanvas = editor.getShape(update.shapeId as TLShapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const startX = update.x1
			const startY = update.y1
			const endX = update.x2 - startX
			const endY = update.y2 - startY
			const bend = update.bend ?? 0

			const mergedShape: TLShapePartial<TLArrowShape> = {
				id: update.shapeId as TLShapeId,
				type: 'arrow',
				x: startX,
				y: startY,
				props: {
					color: update.color ? stringToSimpleColor(update.color) : undefined,
					richText: update.text ? toRichTextIfNeeded(update.text) : undefined,
					start: { x: 0, y: 0 },
					end: { x: endX, y: endY },
					bend,
				},
				meta: {
					note: update.note,
				},
			}

			changes.push({
				type: 'updateShape',
				description: agentChange.intent ?? '',
				shape: mergedShape,
			})

			const bindings = editor.getBindingsFromShape(update.shapeId as TLShapeId, 'arrow')
			for (const binding of bindings) {
				changes.push({
					type: 'deleteBinding',
					description: 'Cleaning up old bindings',
					bindingId: binding.id as TLBindingId,
				})
			}

			// Does the arrow have a start shape? Then try to create the binding
			const startShape = update.fromId ? editor.getShape(update.fromId as TLShapeId) : null
			if (startShape) {
				changes.push({
					type: 'createBinding',
					description: agentChange.intent ?? '',
					binding: {
						type: 'arrow',
						fromId: update.shapeId as TLShapeId,
						toId: startShape.id as TLShapeId,
						props: {
							normalizedAnchor: { x: 0.5, y: 0.5 },
							isExact: false,
							isPrecise: false,
							terminal: 'start',
						},
						meta: {},
					},
				})
			}

			// Does the arrow have an end shape? Then try to create the binding
			const endShape = update.toId ? editor.getShape(update.toId as TLShapeId) : null
			if (endShape) {
				changes.push({
					type: 'createBinding',
					description: agentChange.intent ?? '',
					binding: {
						type: 'arrow',
						fromId: update.shapeId as TLShapeId,
						toId: endShape.id as TLShapeId,
						props: {
							normalizedAnchor: { x: 0.5, y: 0.5 },
							isExact: false,
							isPrecise: false,
							terminal: 'end',
						},
						meta: {},
					},
				})
			}

			break
		}
		case 'cloud':
		case 'rectangle':
		case 'triangle':
		case 'diamond':
		case 'hexagon':
		case 'oval':
		case 'x-box':
		case 'pentagon':
		case 'octagon':
		case 'star':
		case 'rhombus':
		case 'rhombus-2':
		case 'trapezoid':
		case 'arrow-right':
		case 'arrow-left':
		case 'arrow-up':
		case 'arrow-down':
		case 'check-box':
		case 'heart':
		case 'ellipse': {
			const shapeOnCanvas = editor.getShape(update.shapeId as TLShapeId)

			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			// Create a merged shape object that starts with all properties from shapeOnCanvas  and overrides with any properties from the update. Returns undefined if there are no changes to that field, so the editor function won't try to update it.
			const mergedShape: TLShapePartial<TLGeoShape> = {
				id: update.shapeId as TLShapeId,
				type: 'geo',
				props: {
					color: update.color ? stringToSimpleColor(update.color) : undefined,
					geo: update._type,
					w: update.width,
					h: update.height,
					fill: update.fill ? simpleFillToShapeFill(update.fill) : undefined,
					richText: update.text ? toRichTextIfNeeded(update.text) : undefined,
				},
				meta: {
					note: update.note,
				},
			}

			changes.push({
				type: 'updateShape',
				description: agentChange.intent ?? '',
				shape: mergedShape,
			})

			break
		}
		case 'note': {
			const shapeOnCanvas = editor.getShape(update.shapeId as TLShapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const mergedShape: TLShapePartial<TLNoteShape> = {
				id: update.shapeId as TLShapeId,
				type: 'note',
				x: update.x,
				y: update.y,
				props: {
					color: update.color ? stringToSimpleColor(update.color) : undefined,
					richText: update.text ? toRichTextIfNeeded(update.text) : undefined,
				},
				meta: {
					note: update.note,
				},
			}

			changes.push({
				type: 'updateShape',
				description: agentChange.intent ?? '',
				shape: mergedShape,
			})

			break
		}
		case 'unknown': {
			const shapeOnCanvas = editor.getShape(update.shapeId as TLShapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const mergedShape: TLShapePartial<TLShape> = {
				id: update.shapeId as TLShapeId,
				type: shapeOnCanvas.type,
				x: update.x,
				y: update.y,
				meta: {
					note: update.note,
				},
			}

			changes.push({
				type: 'updateShape',
				description: agentChange.intent ?? '',
				shape: mergedShape,
			})

			break
		}
	}

	return changes
}

function getTldrawAiChangesFromCreateEvent({
	editor,
	agentChange,
}: {
	editor: Editor
	agentChange: Streaming<IAgentCreateEvent>
}): TLAiChange[] {
	const changes: TLAiChange[] = []
	if (!agentChange.complete) return changes

	const shape = agentChange.shape
	switch (shape._type) {
		case 'text': {
			changes.push({
				type: 'createShape',
				description: agentChange.intent ?? '',
				shape: {
					id: shape.shapeId as TLShapeId,
					type: 'text',
					x: shape.x,
					y: shape.y,
					props: {
						richText: toRichTextIfNeeded(shape.text ?? ''),
						color: stringToSimpleColor(shape.color),
						textAlign: 'start',
					},
					meta: {
						note: shape.note ?? '',
					},
				},
			})
			break
		}
		case 'line': {
			const x1 = shape.x1 ?? 0
			const y1 = shape.y1 ?? 0
			const x2 = shape.x2 ?? 0
			const y2 = shape.y2 ?? 0
			const minX = Math.min(x1, x2)
			const minY = Math.min(y1, y2)

			changes.push({
				type: 'createShape',
				description: agentChange.intent ?? '',
				shape: {
					id: shape.shapeId as TLShapeId,
					type: 'line',
					x: minX,
					y: minY,
					props: {
						points: {
							a1: {
								id: 'a1',
								index: 'a1' as IndexKey,
								x: x1 - minX,
								y: y1 - minY,
							},
							a2: {
								id: 'a2',
								index: 'a2' as IndexKey,
								x: x2 - minX,
								y: y2 - minY,
							},
						},
						color: stringToSimpleColor(shape.color),
					},
					meta: {
						note: shape.note ?? '',
					},
				},
			})
			break
		}
		case 'arrow': {
			const { shapeId, fromId, toId } = shape

			const x1 = shape.x1 ?? 0
			const y1 = shape.y1 ?? 0
			const x2 = shape.x2 ?? 0
			const y2 = shape.y2 ?? 0
			const minX = Math.min(x1, x2)
			const minY = Math.min(y1, y2)

			// Make sure that the shape itself is the first change
			changes.push({
				type: 'createShape',
				description: agentChange.intent ?? '',
				shape: {
					id: shapeId as TLShapeId,
					type: 'arrow',
					x: minX,
					y: minY,
					props: {
						color: stringToSimpleColor(shape.color),
						richText: toRichTextIfNeeded(shape.text ?? ''),
						start: { x: x1 - minX, y: y1 - minY },
						end: { x: x2 - minX, y: y2 - minY },
					},
					meta: {
						note: shape.note ?? '',
					},
				},
			})

			// Does the arrow have a start shape? Then try to create the binding
			const startShape = fromId ? editor.getShape(fromId as TLShapeId) : null
			if (startShape) {
				changes.push({
					type: 'createBinding',
					description: agentChange.intent ?? '',
					binding: {
						type: 'arrow',
						fromId: shapeId as TLShapeId,
						toId: startShape.id,
						props: {
							normalizedAnchor: { x: 0.5, y: 0.5 },
							isExact: false,
							isPrecise: false,
							terminal: 'start',
						},
						meta: {},
					},
				})
			}

			// Does the arrow have an end shape? Then try to create the binding

			const endShape = toId ? editor.getShape(toId as TLShapeId) : null

			if (endShape) {
				changes.push({
					type: 'createBinding',
					description: agentChange.intent ?? '',
					binding: {
						type: 'arrow',
						fromId: shapeId as TLShapeId,
						toId: endShape.id,
						props: {
							normalizedAnchor: { x: 0.5, y: 0.5 },
							isExact: false,
							isPrecise: false,
							terminal: 'end',
						},
						meta: {},
					},
				})
			}
			break
		}
		case 'cloud':
		case 'rectangle':
		case 'triangle':
		case 'diamond':
		case 'hexagon':
		case 'oval':
		case 'x-box':
		case 'pentagon':
		case 'octagon':
		case 'star':
		case 'rhombus':
		case 'rhombus-2':
		case 'trapezoid':
		case 'arrow-right':
		case 'arrow-left':
		case 'arrow-up':
		case 'arrow-down':
		case 'check-box':
		case 'heart':
		case 'ellipse': {
			changes.push({
				type: 'createShape',
				description: agentChange.intent ?? '',
				shape: {
					id: shape.shapeId as TLShapeId,
					type: 'geo',
					x: shape.x,
					y: shape.y,
					props: {
						geo: shape._type,
						w: shape.width,
						h: shape.height,
						color: stringToSimpleColor(shape.color ?? 'black'),
						fill: simpleFillToShapeFill(shape.fill ?? 'none'),
						richText: toRichTextIfNeeded(shape.text ?? ''),
					},
					meta: {
						note: shape.note ?? '',
					},
				},
			})
			break
		}

		case 'note': {
			changes.push({
				type: 'createShape',
				description: agentChange.intent ?? '',
				shape: {
					id: shape.shapeId as TLShapeId,
					type: 'note',
					x: shape.x,
					y: shape.y,
					props: {
						color: stringToSimpleColor(shape.color),
						richText: toRichTextIfNeeded(shape.text ?? ''),
					},
					meta: {
						note: shape.note ?? '',
					},
				},
			})
			break
		}
	}

	return changes
}

function toRichTextIfNeeded(text: string | TLRichText): TLRichText {
	if (typeof text === 'string') {
		return toRichText(text)
	}
	return text
}

function placeShape(editor: Editor, change: Streaming<IAgentPlaceEvent>) {
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
