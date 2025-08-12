import { defaultApplyChange, TLAiChange } from '@tldraw/ai'
import {
	Editor,
	IndexKey,
	TLArrowShape,
	TLBindingId,
	TLGeoShape,
	TLLineShape,
	TLNoteShape,
	TLShapeId,
	TLTextShape,
	toRichText,
} from 'tldraw'
import { IAgentUpdateEvent } from '../../worker/prompt/AgentEvent'
import { asColor, simpleFillToShapeFill } from '../../worker/simple/color'
import { AgentTransform } from '../transforms/AgentTransform'
import { asRichText } from '../transforms/SimpleText'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

export class UpdateEventUtil extends AgentEventUtil<IAgentUpdateEvent> {
	static override type = 'update' as const

	override transformEvent(event: Streaming<IAgentUpdateEvent>, transform: AgentTransform) {
		if (!event.complete) return event

		const update = transform.sanitizeExistingShape(event.update)
		if (!update) return null
		event.update = update

		return event
	}

	override getDescription(event: Streaming<IAgentUpdateEvent>) {
		return event.intent ?? ''
	}

	override applyEvent(event: Streaming<IAgentUpdateEvent>) {
		if (!event.complete) return
		const { editor } = this

		const aiChanges = getTldrawAiChangesFromUpdateEvent({ editor, event: event })
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
	update.shapeId = `shape:${update.shapeId}`

	switch (update._type) {
		case 'text': {
			const shapeOnCanvas = editor.getShape<TLTextShape>(update.shapeId as TLShapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const color = update.color ? asColor(update.color) : shapeOnCanvas.props.color
			const richText = update.text ? toRichText(update.text) : shapeOnCanvas.props.richText

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: {
					id: update.shapeId as TLShapeId,
					type: 'text',
					x: update.x,
					y: update.y,
					props: {
						color,
						richText,
					},
					meta: {
						note: update.note,
					},
				},
			})
			break
		}
		case 'line': {
			const shapeOnCanvas = editor.getShape<TLLineShape>(update.shapeId as TLShapeId)
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
					id: update.shapeId as TLShapeId,
					type: 'line',
					x: startX,
					y: startY,
					props: {
						color,
						points,
					},
					meta: {
						note: update.note,
					},
				},
			})
			break
		}
		case 'arrow': {
			const shapeOnCanvas = editor.getShape<TLArrowShape>(update.shapeId as TLShapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const startX = update.x1
			const startY = update.y1
			const endX = update.x2 - startX
			const endY = update.y2 - startY
			const bend = update.bend ?? 0

			const color = update.color ? asColor(update.color) : shapeOnCanvas.props.color
			const richText = update.text ? asRichText(update.text) : shapeOnCanvas.props.richText

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: {
					id: update.shapeId as TLShapeId,
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
						note: update.note,
					},
				},
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
					description: event.intent ?? '',
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
					description: event.intent ?? '',
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
			const shapeOnCanvas = editor.getShape<TLGeoShape>(update.shapeId as TLShapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const color = update.color ? asColor(update.color) : shapeOnCanvas.props.color
			const richText = update.text ? toRichText(update.text) : shapeOnCanvas.props.richText
			const fill = update.fill ? simpleFillToShapeFill(update.fill) : shapeOnCanvas.props.fill

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: {
					id: update.shapeId as TLShapeId,
					type: 'geo',
					props: {
						color,
						geo: update._type,
						w: update.width,
						h: update.height,
						fill,
						richText,
					},
					meta: {
						note: update.note,
					},
				},
			})

			break
		}
		case 'note': {
			const shapeOnCanvas = editor.getShape<TLNoteShape>(update.shapeId as TLShapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const color = update.color ? asColor(update.color) : shapeOnCanvas.props.color
			const richText = update.text ? toRichText(update.text) : shapeOnCanvas.props.richText

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: {
					id: update.shapeId as TLShapeId,
					type: 'note',
					x: update.x,
					y: update.y,
					props: {
						color,
						richText,
					},
					meta: {
						note: update.note,
					},
				},
			})

			break
		}
		case 'unknown': {
			const shapeOnCanvas = editor.getShape(update.shapeId as TLShapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			changes.push({
				type: 'updateShape',
				description: event.intent ?? '',
				shape: {
					id: update.shapeId as TLShapeId,
					type: shapeOnCanvas.type,
					x: update.x,
					y: update.y,
					meta: {
						note: update.note,
					},
				},
			})

			break
		}
	}

	return changes
}
