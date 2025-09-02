import { TLAiChange } from '@tldraw/ai'
import {
	Editor,
	FONT_FAMILIES,
	FONT_SIZES,
	IndexKey,
	TEXT_PROPS,
	TLShapeId,
	toRichText,
	Vec,
} from 'tldraw'
import z from 'zod'
import { applyAiChange } from '../../client/agent/applyAiChange'
import { TldrawAgent } from '../../client/agent/TldrawAgent'
import { AgentTransform } from '../AgentTransform'
import { asColor } from '../format/SimpleColor'
import { convertSimpleFillToTldrawFill } from '../format/SimpleFill'
import { convertSimpleFontSizeToTldrawFontSizeAndScale } from '../format/SimpleFontSize'
import { convertSimpleGeoShapeTypeToTldrawGeoShapeGeoStyleOrUnknownIfNeeded } from '../format/SimpleGeoShapeType'
import {
	ISimpleArrowShape,
	ISimpleGeoShape,
	ISimpleLineShape,
	ISimpleNoteShape,
	ISimpleTextShape,
	SimpleShape,
} from '../format/SimpleShape'
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

	override getInfo(action: Streaming<ICreateAction>) {
		return {
			icon: 'pencil' as const,
			description: action.intent ?? '',
		}
	}

	override transformAction(action: Streaming<ICreateAction>, transform: AgentTransform) {
		if (!action.complete) return action

		const shape = action.shape

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

		return action
	}

	override applyAction(action: Streaming<ICreateAction>, agent: TldrawAgent) {
		if (!action.complete) return
		const { editor } = agent

		const aiChanges = getTldrawAiChangesFromCreateAction({ editor, action })
		for (const aiChange of aiChanges) {
			applyAiChange({ change: aiChange, editor })
		}
	}
}

export function getTldrawAiChangesFromCreateAction({
	editor,
	action,
}: {
	editor: Editor
	action: Streaming<ICreateAction>
}): TLAiChange[] {
	const changes: TLAiChange[] = []
	if (!action.complete) return changes

	const { shape } = action
	const shapeId = `shape:${shape.shapeId}` as TLShapeId

	const shapeType = convertSimpleGeoShapeTypeToTldrawGeoShapeGeoStyleOrUnknownIfNeeded(shape._type)

	switch (shapeType) {
		case 'text': {
			const textShape = shape as ISimpleTextShape

			// Determine the base font size and scale
			let textSize: keyof typeof FONT_SIZES = 's'
			let scale = 1

			// find closest predefined font size and scale combination to back solve for the model's desired font size
			if (textShape.fontSize) {
				const { textSize: calculatedTextSize, scale: calculatedScale } =
					convertSimpleFontSizeToTldrawFontSizeAndScale(textShape.fontSize)
				textSize = calculatedTextSize
				scale = calculatedScale
			}

			const textFontSize = FONT_SIZES[textSize]
			const textAlign = textShape.textAlign ?? 'start'

			const correctedTextPlacement = new Vec()

			const effectiveFontSize = textFontSize * scale
			const candidateTextWidth = editor.textMeasure.measureText(textShape.text, {
				...TEXT_PROPS,
				fontFamily: FONT_FAMILIES['draw'],
				fontSize: effectiveFontSize,
				maxWidth: Infinity,
			}).w

			switch (textAlign) {
				case 'start':
					correctedTextPlacement.x = textShape.x
					correctedTextPlacement.y = textShape.y
					break
				case 'middle':
					correctedTextPlacement.x = textShape.x - candidateTextWidth / 2
					correctedTextPlacement.y = textShape.y
					break
				case 'end':
					correctedTextPlacement.x = textShape.x - candidateTextWidth
					correctedTextPlacement.y = textShape.y
					break
			}

			changes.push({
				type: 'createShape',
				description: action.intent ?? '',
				shape: {
					id: shapeId,
					type: 'text',
					x: correctedTextPlacement.x,
					y: correctedTextPlacement.y,
					props: {
						size: textSize,
						scale,
						richText: toRichText(textShape.text),
						color: asColor(textShape.color),
						textAlign,
					},
					meta: {
						note: textShape.note ?? '',
					},
				},
			})
			break
		}
		case 'line': {
			const lineShape = shape as ISimpleLineShape
			const x1 = lineShape.x1 ?? 0
			const y1 = lineShape.y1 ?? 0
			const x2 = lineShape.x2 ?? 0
			const y2 = lineShape.y2 ?? 0
			const minX = Math.min(x1, x2)
			const minY = Math.min(y1, y2)

			changes.push({
				type: 'createShape',
				description: action.intent ?? '',
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
						color: asColor(lineShape.color),
					},
					meta: {
						note: lineShape.note ?? '',
					},
				},
			})
			break
		}
		case 'arrow': {
			const arrowShape = shape as ISimpleArrowShape
			const fromId = arrowShape.fromId ? (`shape:${arrowShape.fromId}` as TLShapeId) : null
			const toId = arrowShape.toId ? (`shape:${arrowShape.toId}` as TLShapeId) : null

			const x1 = arrowShape.x1 ?? 0
			const y1 = arrowShape.y1 ?? 0
			const x2 = arrowShape.x2 ?? 0
			const y2 = arrowShape.y2 ?? 0
			const minX = Math.min(x1, x2)
			const minY = Math.min(y1, y2)

			// Make sure that the shape itself is the first action
			changes.push({
				type: 'createShape',
				description: action.intent ?? '',
				shape: {
					id: shapeId,
					type: 'arrow',
					x: minX,
					y: minY,
					props: {
						size: 's',
						color: asColor(arrowShape.color),
						richText: toRichText(arrowShape.text ?? ''),
						start: { x: x1 - minX, y: y1 - minY },
						end: { x: x2 - minX, y: y2 - minY },
						bend: arrowShape.bend ?? 0,
					},
					meta: {
						note: arrowShape.note ?? '',
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
					description: action.intent ?? '',
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
					description: action.intent ?? '',
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
			const geoShape = shape as ISimpleGeoShape
			changes.push({
				type: 'createShape',
				description: action.intent ?? '',
				shape: {
					id: shapeId,
					type: 'geo',
					x: geoShape.x,
					y: geoShape.y,
					props: {
						align: geoShape.textAlign ?? 'middle',
						size: 's',
						geo: shapeType,
						w: geoShape.w,
						h: geoShape.h,
						color: asColor(geoShape.color ?? 'black'),
						fill: convertSimpleFillToTldrawFill(geoShape.fill ?? 'none'),
						richText: toRichText(geoShape.text ?? ''),
					},
					meta: {
						note: geoShape.note ?? '',
					},
				},
			})
			break
		}

		case 'note': {
			const noteShape = shape as ISimpleNoteShape
			changes.push({
				type: 'createShape',
				description: action.intent ?? '',
				shape: {
					id: shapeId,
					type: 'note',
					x: noteShape.x,
					y: noteShape.y,
					props: {
						color: asColor(noteShape.color),
						richText: toRichText(noteShape.text ?? ''),
						size: 's',
					},
					meta: {
						note: noteShape.note ?? '',
					},
				},
			})
			break
		}
	}

	return changes
}
