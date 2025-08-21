import { defaultApplyChange, TLAiChange } from '@tldraw/ai'
import { Editor, IndexKey, TLShapeId, toRichText } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { asColor } from '../format/SimpleColor'
import { convertSimpleFillToTldrawFill } from '../format/SimpleFill'
import { SimpleShape } from '../format/SimpleShape'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const CreateAction = z
	.object({
		_type: z.literal('create'),
		intent: z.string(),
		shape: SimpleShape,
	})
	.meta({ title: 'Create', description: 'The AI creates a new shape.' })

type ICreateAction = z.infer<typeof CreateAction>

export class CreateActionUtil extends AgentActionUtil<ICreateAction> {
	static override type = 'create' as const

	override getSchema() {
		return CreateAction
	}

	override getIcon() {
		return 'pencil' as const
	}

	override getDescription(event: Streaming<ICreateAction>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<ICreateAction>, transform: AgentTransform) {
		if (!event.complete) return event

		const shape = event.shape

		// Ensure the created shape has a unique ID
		shape.shapeId = transform.ensureShapeIdIsUnique(shape.shapeId)

		// If the shape is an arrow, ensure the from and to IDs are real shapes
		if (shape._type === 'arrow') {
			if (shape.fromId) {
				shape.fromId = transform.ensureShapeIdIsReal(shape.fromId)
			}
			if (shape.toId) {
				shape.toId = transform.ensureShapeIdIsReal(shape.toId)
			}
		}

		return event
	}

	override applyEvent(event: Streaming<ICreateAction>, transform: AgentTransform) {
		if (!event.complete) return
		const { editor } = transform

		const aiChanges = getTldrawAiChangesFromCreateAction({ editor, event })
		for (const aiChange of aiChanges) {
			defaultApplyChange({ change: aiChange, editor })
		}
	}
}

export function getTldrawAiChangesFromCreateAction({
	editor,
	event,
}: {
	editor: Editor
	event: Streaming<ICreateAction>
}): TLAiChange[] {
	const changes: TLAiChange[] = []
	if (!event.complete) return changes

	const { shape } = event
	const shapeId = `shape:${shape.shapeId}` as TLShapeId

	switch (shape._type) {
		case 'text': {
			changes.push({
				type: 'createShape',
				description: event.intent ?? '',
				shape: {
					id: shapeId,
					type: 'text',
					x: shape.x,
					y: shape.y,
					props: {
						size: 's',
						richText: toRichText(shape.text),
						color: asColor(shape.color),
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
				description: event.intent ?? '',
				shape: {
					id: shapeId,
					type: 'line',
					x: minX,
					y: minY,
					props: {
						size: 's',
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
						color: asColor(shape.color),
					},
					meta: {
						note: shape.note ?? '',
					},
				},
			})
			break
		}
		case 'arrow': {
			const fromId = shape.fromId ? (`shape:${shape.fromId}` as TLShapeId) : null
			const toId = shape.toId ? (`shape:${shape.toId}` as TLShapeId) : null

			const x1 = shape.x1 ?? 0
			const y1 = shape.y1 ?? 0
			const x2 = shape.x2 ?? 0
			const y2 = shape.y2 ?? 0
			const minX = Math.min(x1, x2)
			const minY = Math.min(y1, y2)

			// Make sure that the shape itself is the first event
			changes.push({
				type: 'createShape',
				description: event.intent ?? '',
				shape: {
					id: shapeId,
					type: 'arrow',
					x: minX,
					y: minY,
					props: {
						size: 's',
						color: asColor(shape.color),
						richText: toRichText(shape.text ?? ''),
						start: { x: x1 - minX, y: y1 - minY },
						end: { x: x2 - minX, y: y2 - minY },
						bend: shape.bend ?? 0,
					},
					meta: {
						note: shape.note ?? '',
					},
				},
			})

			// Does the arrow have a start shape? Then try to create the binding
			const startShape = fromId ? editor.getShape(fromId) : null
			const startShapePageBounds = startShape ? editor.getShapePageBounds(startShape) : null
			if (startShape && startShapePageBounds) {
				const pointInPageSpace = { x: x1, y: y1 }
				const normalizedAnchor = {
					x: (pointInPageSpace.x - startShapePageBounds.x) / startShapePageBounds.w,
					y: (pointInPageSpace.y - startShapePageBounds.y) / startShapePageBounds.h,
				}

				const clampedNormalizedAnchor = {
					x: Math.max(0, Math.min(1, normalizedAnchor.x)),
					y: Math.max(0, Math.min(1, normalizedAnchor.y)),
				}

				changes.push({
					type: 'createBinding',
					description: event.intent ?? '',
					binding: {
						type: 'arrow',
						fromId: shapeId,
						toId: startShape.id,
						props: {
							normalizedAnchor: clampedNormalizedAnchor,
							isExact: false,
							isPrecise: true,
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
				const pointInPageSpace = { x: x2, y: y2 }
				const normalizedAnchor = {
					x: (pointInPageSpace.x - endShapePageBounds.x) / endShapePageBounds.w,
					y: (pointInPageSpace.y - endShapePageBounds.y) / endShapePageBounds.h,
				}

				const clampedNormalizedAnchor = {
					x: Math.max(0, Math.min(1, normalizedAnchor.x)),
					y: Math.max(0, Math.min(1, normalizedAnchor.y)),
				}

				changes.push({
					type: 'createBinding',
					description: event.intent ?? '',
					binding: {
						type: 'arrow',
						fromId: shapeId,
						toId: endShape.id,
						props: {
							normalizedAnchor: clampedNormalizedAnchor,
							isExact: false,
							isPrecise: true,
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
				description: event.intent ?? '',
				shape: {
					id: shapeId,
					type: 'geo',
					x: shape.x,
					y: shape.y,
					props: {
						size: 's',
						geo: shape._type,
						w: shape.width,
						h: shape.height,
						color: asColor(shape.color ?? 'black'),
						fill: convertSimpleFillToTldrawFill(shape.fill ?? 'none'),
						richText: toRichText(shape.text ?? ''),
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
				description: event.intent ?? '',
				shape: {
					id: shapeId,
					type: 'note',
					x: shape.x,
					y: shape.y,
					props: {
						color: asColor(shape.color),
						richText: toRichText(shape.text ?? ''),
						size: 's',
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
