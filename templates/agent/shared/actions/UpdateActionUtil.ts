import { defaultApplyChange, TLAiChange } from '@tldraw/ai'
import {
	Editor,
	IndexKey,
	TLArrowShape,
	TLBindingId,
	TLDrawShape,
	TLGeoShape,
	TLLineShape,
	TLNoteShape,
	TLShapeId,
	TLTextShape,
	toRichText,
} from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { asColor } from '../format/SimpleColor'
import { convertSimpleFillToTldrawFill } from '../format/SimpleFill'
import { SimpleShape } from '../format/SimpleShape'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const AgentUpdateEvent = z
	.object({
		_type: z.literal('update'),
		intent: z.string(),
		update: SimpleShape,
	})
	.meta({
		title: 'Update',
		description: 'The AI updates an existing shape.',
	})

type IAgentUpdateEvent = z.infer<typeof AgentUpdateEvent>

export class UpdateActionUtil extends AgentActionUtil<IAgentUpdateEvent> {
	static override type = 'update' as const

	override getSchema() {
		return AgentUpdateEvent
	}

	override getIcon() {
		return 'cursor' as const
	}

	override transformEvent(event: Streaming<IAgentUpdateEvent>, transform: AgentTransform) {
		if (!event.complete) return event

		const { update } = event

		// Ensure the shape ID refers to a real shape
		const shapeId = transform.ensureShapeIdIsReal(update.shapeId)
		if (!shapeId) return null
		update.shapeId = shapeId

		// If it's an arrow, ensure the from and to IDs refer to real shapes
		if (update._type === 'arrow') {
			if (update.fromId) {
				update.fromId = transform.ensureShapeIdIsReal(update.fromId)
			}
			if (update.toId) {
				update.toId = transform.ensureShapeIdIsReal(update.toId)
			}
		}

		return event
	}

	override getDescription(event: Streaming<IAgentUpdateEvent>) {
		return event.intent ?? ''
	}

	override applyEvent(event: Streaming<IAgentUpdateEvent>, transform: AgentTransform) {
		if (!event.complete) return
		const { editor } = transform

		event.update = transform.unroundShape(event.update)

		const aiChanges = getTldrawAiChangesFromUpdateEvent({ editor, event })
		for (const aiChange of aiChanges) {
			defaultApplyChange({ change: aiChange, editor })
		}
	}
}

export function getTldrawAiChangesFromUpdateEvent({
	editor,
	event,
}: {
	editor: Editor
	event: Streaming<IAgentUpdateEvent>
}): TLAiChange[] {
	const changes: TLAiChange[] = []
	if (!event.complete) return changes

	const update = event.update
	const shapeId = `shape:${update.shapeId}` as TLShapeId

	switch (update._type) {
		case 'text': {
			const shapeOnCanvas = editor.getShape<TLTextShape>(shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const color = update.color ? asColor(update.color) : shapeOnCanvas.props.color
			const richText = update.text ? toRichText(update.text) : shapeOnCanvas.props.richText

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: {
					id: shapeId,
					type: 'text',
					x: update.x ?? shapeOnCanvas.x,
					y: update.y ?? shapeOnCanvas.y,
					props: {
						color,
						richText,
					},
					meta: {
						note: update.note ?? shapeOnCanvas.meta.note,
					},
				},
			})
			break
		}
		case 'line': {
			const shapeOnCanvas = editor.getShape<TLLineShape>(shapeId)
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

			const color = update.color ? asColor(update.color) : shapeOnCanvas.props.color
			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: {
					id: shapeId,
					type: 'line',
					x: startX,
					y: startY,
					props: {
						color,
						points,
					},
					meta: {
						note: update.note ?? shapeOnCanvas.meta.note,
					},
				},
			})
			break
		}
		case 'arrow': {
			const shapeOnCanvas = editor.getShape<TLArrowShape>(shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const startX = update.x1
			const startY = update.y1
			const endX = update.x2 - startX
			const endY = update.y2 - startY
			const bend = update.bend ?? shapeOnCanvas.props.bend

			const color = update.color ? asColor(update.color) : shapeOnCanvas.props.color
			const richText = update.text ? toRichText(update.text) : shapeOnCanvas.props.richText

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: {
					id: shapeId,
					type: 'arrow',
					x: startX,
					y: startY,
					props: {
						color,
						richText,
						start: { x: 0, y: 0 },
						end: { x: endX, y: endY },
						bend,
					},
					meta: {
						note: update.note ?? shapeOnCanvas.meta.note,
					},
				},
			})

			const bindings = editor.getBindingsFromShape(shapeId, 'arrow')
			for (const binding of bindings) {
				changes.push({
					type: 'deleteBinding',
					description: 'Cleaning up old bindings',
					bindingId: binding.id as TLBindingId,
				})
			}

			const fromId = update.fromId ? (`shape:${update.fromId}` as TLShapeId) : null
			const toId = update.toId ? (`shape:${update.toId}` as TLShapeId) : null

			// Does the arrow have a start shape? Then try to create the binding
			const startShape = fromId ? editor.getShape(fromId) : null
			const startShapePageBounds = startShape ? editor.getShapePageBounds(startShape) : null
			if (startShape && startShapePageBounds) {
				const pointInPageSpace = { x: startX, y: startY }
				const normalizedAnchor = {
					x: (pointInPageSpace.x - startShapePageBounds.x) / startShapePageBounds.w,
					y: (pointInPageSpace.y - startShapePageBounds.y) / startShapePageBounds.h,
				}

				changes.push({
					type: 'createBinding',
					description: event.intent ?? '',
					binding: {
						type: 'arrow',
						fromId: shapeId,
						toId: startShape.id,
						props: {
							normalizedAnchor,
							isExact: false,
							isPrecise: false,
							terminal: 'start',
						},
						meta: {},
					},
				})
			}

			// Does the arrow have an end shape? Then try to create the binding
			const endShape = toId ? editor.getShape(toId) : null
			const endShapePageBounds = endShape ? editor.getShapePageBounds(endShape) : null
			if (endShape && endShapePageBounds) {
				const pointInPageSpace = { x: endX, y: endY }
				const normalizedAnchor = {
					x: (pointInPageSpace.x - endShapePageBounds.x) / endShapePageBounds.w,
					y: (pointInPageSpace.y - endShapePageBounds.y) / endShapePageBounds.h,
				}
				changes.push({
					type: 'createBinding',
					description: event.intent ?? '',
					binding: {
						type: 'arrow',
						fromId: shapeId,
						toId: endShape.id,
						props: {
							normalizedAnchor,
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
			const shapeOnCanvas = editor.getShape<TLGeoShape>(shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const color = update.color ? asColor(update.color) : shapeOnCanvas.props.color
			const richText = update.text ? toRichText(update.text) : shapeOnCanvas.props.richText
			const fill = update.fill
				? convertSimpleFillToTldrawFill(update.fill)
				: shapeOnCanvas.props.fill

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: {
					id: shapeId,
					type: 'geo',
					x: update.x ?? shapeOnCanvas.x,
					y: update.y ?? shapeOnCanvas.y,
					props: {
						color,
						geo: update._type,
						w: update.width ?? shapeOnCanvas.props.w,
						h: update.height ?? shapeOnCanvas.props.h,
						fill,
						richText,
					},
					meta: {
						note: update.note ?? shapeOnCanvas.meta.note,
					},
				},
			})

			break
		}
		case 'note': {
			const shapeOnCanvas = editor.getShape<TLNoteShape>(shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const color = update.color ? asColor(update.color) : shapeOnCanvas.props.color
			const richText = update.text ? toRichText(update.text) : shapeOnCanvas.props.richText

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: {
					id: shapeId,
					type: 'note',
					x: update.x ?? shapeOnCanvas.x,
					y: update.y ?? shapeOnCanvas.y,
					props: {
						color,
						richText,
					},
					meta: {
						note: update.note ?? shapeOnCanvas.meta.note,
					},
				},
			})

			break
		}
		case 'pen': {
			const shapeOnCanvas = editor.getShape<TLDrawShape>(shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const color = update.color ? asColor(update.color) : shapeOnCanvas.props.color
			const fill = update.fill
				? convertSimpleFillToTldrawFill(update.fill)
				: shapeOnCanvas.props.fill

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: {
					id: shapeId,
					type: 'draw',
					props: {
						color,
						fill,
					},
					meta: {
						note: update.note ?? shapeOnCanvas.meta.note,
					},
				},
			})

			break
		}
		case 'unknown': {
			const shapeOnCanvas = editor.getShape(shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: {
					id: shapeId,
					type: shapeOnCanvas.type,
					x: update.x ?? shapeOnCanvas.x,
					y: update.y ?? shapeOnCanvas.y,
					meta: {
						note: update.note ?? shapeOnCanvas.meta.note,
					},
				},
			})

			break
		}
	}

	return changes
}
