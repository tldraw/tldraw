import { TLAiChange } from '@tldraw/ai'
import {
	Editor,
	FONT_FAMILIES,
	FONT_SIZES,
	IndexKey,
	TEXT_PROPS,
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
import { applyAiChange } from '../../client/agent/applyAiChange'
import { TldrawAgent } from '../../client/agent/TldrawAgent'
import { AgentTransform } from '../AgentTransform'
import { asColor } from '../format/SimpleColor'
import { convertSimpleFillToTldrawFill } from '../format/SimpleFill'
import { convertSimpleFontSizeToTldrawFontSizeAndScale } from '../format/SimpleFontSize'
import { convertSimpleTypeToTldrawType } from '../format/SimpleGeoShapeType'
import {
	ISimpleArrowShape,
	ISimpleDrawShape,
	ISimpleGeoShape,
	ISimpleLineShape,
	ISimpleNoteShape,
	ISimpleTextShape,
	ISimpleUnknownShape,
	SimpleShape,
} from '../format/SimpleShape'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const UpdateAction = z
	.object({
		_type: z.literal('update'),
		intent: z.string(),
		update: SimpleShape,
	})
	.meta({
		title: 'Update',
		description: 'The AI updates an existing shape.',
	})

type IUpdateAction = z.infer<typeof UpdateAction>

export class UpdateActionUtil extends AgentActionUtil<IUpdateAction> {
	static override type = 'update' as const

	override getSchema() {
		return UpdateAction
	}

	override getInfo(action: Streaming<IUpdateAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override transformAction(action: Streaming<IUpdateAction>, transform: AgentTransform) {
		if (!action.complete) return action

		const { update } = action

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

		// Unround the shape to restore the original values
		action.update = transform.unroundShape(action.update)

		return action
	}

	override applyAction(action: Streaming<IUpdateAction>, agent: TldrawAgent) {
		if (!action.complete) return
		const { editor } = agent

		const aiChanges = getTldrawAiChangesFromUpdateEvent({ editor, action })
		for (const aiChange of aiChanges) {
			applyAiChange({ change: aiChange, editor })
		}
	}
}

export function getTldrawAiChangesFromUpdateEvent({
	editor,
	action,
}: {
	editor: Editor
	action: Streaming<IUpdateAction>
}): TLAiChange[] {
	const changes: TLAiChange[] = []
	if (!action.complete) return changes

	const update = action.update
	const shapeId = `shape:${update.shapeId}` as TLShapeId

	const updateShapeType = convertSimpleTypeToTldrawType(update._type)

	switch (updateShapeType) {
		case 'text': {
			const textShape = update as ISimpleTextShape
			const shapeOnCanvas = editor.getShape<TLTextShape>(shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const color = textShape.color ? asColor(textShape.color) : shapeOnCanvas.props.color
			const richText = textShape.text ? toRichText(textShape.text) : shapeOnCanvas.props.richText
			const textAlign = textShape.textAlign ?? shapeOnCanvas.props.textAlign

			// Determine the base font size and scale
			let textSize: keyof typeof FONT_SIZES = shapeOnCanvas.props.size
			let scale = shapeOnCanvas.props.scale

			// If a new fontSize is specified, find closest predefined font size and scale combination
			if (textShape.fontSize) {
				const { textSize: calculatedTextSize, scale: calculatedScale } =
					convertSimpleFontSizeToTldrawFontSizeAndScale(textShape.fontSize)
				textSize = calculatedTextSize
				scale = calculatedScale
			}

			const textFontSize = FONT_SIZES[textSize]
			const effectiveFontSize = textFontSize * scale
			const candidateTextWidth = editor.textMeasure.measureText(
				textShape.text ?? shapeOnCanvas.props.richText,
				{
					...TEXT_PROPS,
					fontFamily: FONT_FAMILIES['draw'],
					fontSize: effectiveFontSize,
					maxWidth: Infinity,
				}
			).w

			let correctedX = textShape.x ?? shapeOnCanvas.x
			switch (textAlign) {
				case 'start':
					correctedX = textShape.x ?? shapeOnCanvas.x
					break
				case 'middle':
					correctedX = (textShape.x ?? shapeOnCanvas.x) - candidateTextWidth / 2
					break
				case 'end':
					correctedX = (textShape.x ?? shapeOnCanvas.x) - candidateTextWidth
					break
			}

			changes.push({
				type: 'updateShape',
				description: action.intent ?? '',
				shape: {
					id: shapeId,
					type: 'text',
					x: correctedX,
					y: textShape.y ?? shapeOnCanvas.y,
					props: {
						color,
						richText,
						size: textSize,
						scale,
						textAlign,
					},
					meta: {
						note: textShape.note ?? shapeOnCanvas.meta.note,
					},
				},
			})
			break
		}
		case 'line': {
			const lineShape = update as ISimpleLineShape
			const shapeOnCanvas = editor.getShape<TLLineShape>(shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const startX = lineShape.x1
			const startY = lineShape.y1
			const endX = lineShape.x2 - startX
			const endY = lineShape.y2 - startY

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

			const color = lineShape.color ? asColor(lineShape.color) : shapeOnCanvas.props.color
			changes.push({
				type: 'updateShape',
				description: action.intent ?? '',
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
						note: lineShape.note ?? shapeOnCanvas.meta.note,
					},
				},
			})
			break
		}
		case 'arrow': {
			const arrowShape = update as ISimpleArrowShape
			const shapeOnCanvas = editor.getShape<TLArrowShape>(shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const x1 = arrowShape.x1
			const y1 = arrowShape.y1
			const x2 = arrowShape.x2
			const y2 = arrowShape.y2
			const minX = Math.min(x1, x2)
			const minY = Math.min(y1, y2)

			const bend = arrowShape.bend ?? shapeOnCanvas.props.bend

			const color = arrowShape.color ? asColor(arrowShape.color) : shapeOnCanvas.props.color
			const richText = arrowShape.text ? toRichText(arrowShape.text) : shapeOnCanvas.props.richText

			changes.push({
				type: 'updateShape',
				description: action.intent ?? '',
				shape: {
					id: shapeId,
					type: 'arrow',
					x: minX,
					y: minY,
					props: {
						color,
						richText,
						start: { x: x1 - minX, y: y1 - minY },
						end: { x: x2 - minX, y: y2 - minY },
						bend,
					},
					meta: {
						note: arrowShape.note ?? shapeOnCanvas.meta.note,
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

			const fromId = arrowShape.fromId ? (`shape:${arrowShape.fromId}` as TLShapeId) : null
			const toId = arrowShape.toId ? (`shape:${arrowShape.toId}` as TLShapeId) : null

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
			const geoShape = update as ISimpleGeoShape
			const shapeOnCanvas = editor.getShape<TLGeoShape>(shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const color = geoShape.color ? asColor(geoShape.color) : shapeOnCanvas.props.color
			const richText = geoShape.text ? toRichText(geoShape.text) : shapeOnCanvas.props.richText
			const fill = geoShape.fill
				? convertSimpleFillToTldrawFill(geoShape.fill)
				: shapeOnCanvas.props.fill

			changes.push({
				type: 'updateShape',
				description: action.intent ?? '',
				shape: {
					id: shapeId,
					type: 'geo',
					x: geoShape.x ?? shapeOnCanvas.x,
					y: geoShape.y ?? shapeOnCanvas.y,
					props: {
						align: geoShape.textAlign ?? shapeOnCanvas.props.align,
						color,
						geo: updateShapeType,
						w: geoShape.w ?? shapeOnCanvas.props.w,
						h: geoShape.h ?? shapeOnCanvas.props.h,
						fill,
						richText,
					},
					meta: {
						note: geoShape.note ?? shapeOnCanvas.meta.note,
					},
				},
			})

			break
		}
		case 'note': {
			const noteShape = update as ISimpleNoteShape
			const shapeOnCanvas = editor.getShape<TLNoteShape>(shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const color = noteShape.color ? asColor(noteShape.color) : shapeOnCanvas.props.color
			const richText = noteShape.text ? toRichText(noteShape.text) : shapeOnCanvas.props.richText

			changes.push({
				type: 'updateShape',
				description: action.intent ?? '',
				shape: {
					id: shapeId,
					type: 'note',
					x: noteShape.x ?? shapeOnCanvas.x,
					y: noteShape.y ?? shapeOnCanvas.y,
					props: {
						color,
						richText,
					},
					meta: {
						note: noteShape.note ?? shapeOnCanvas.meta.note,
					},
				},
			})

			break
		}
		case 'draw': {
			const drawShape = update as ISimpleDrawShape
			const shapeOnCanvas = editor.getShape<TLDrawShape>(shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			const color = drawShape.color ? asColor(drawShape.color) : shapeOnCanvas.props.color
			const fill = drawShape.fill
				? convertSimpleFillToTldrawFill(drawShape.fill)
				: shapeOnCanvas.props.fill

			changes.push({
				type: 'updateShape',
				description: action.intent ?? '',
				shape: {
					id: shapeId,
					type: 'draw',
					props: {
						color,
						fill,
					},
					meta: {
						note: drawShape.note ?? shapeOnCanvas.meta.note,
					},
				},
			})

			break
		}
		case 'unknown': {
			const unknownShape = update as ISimpleUnknownShape
			const shapeOnCanvas = editor.getShape(shapeId)
			if (!shapeOnCanvas) {
				throw new Error(`Shape ${update.shapeId} not found in canvas`)
			}

			changes.push({
				type: 'updateShape',
				description: action.intent ?? '',
				shape: {
					id: shapeId,
					type: shapeOnCanvas.type,
					x: unknownShape.x ?? shapeOnCanvas.x,
					y: unknownShape.y ?? shapeOnCanvas.y,
					meta: {
						note: unknownShape.note ?? shapeOnCanvas.meta.note,
					},
				},
			})

			break
		}
	}

	return changes
}
