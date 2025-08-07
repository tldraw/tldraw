import { TLAiChange } from '@tldraw/ai'
import { Editor, IndexKey, TLRichText, TLShapeId, toRichText } from 'tldraw'
import { IAgentCreateEvent } from '../../worker/prompt/AgentEvent'
import { simpleFillToShapeFill, stringToSimpleColor } from '../../worker/simple/color'
import { Streaming } from '../types/Streaming'

export function getTldrawAiChangesFromCreateEvent({
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

			// Make sure that the shape itself is the first event
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
