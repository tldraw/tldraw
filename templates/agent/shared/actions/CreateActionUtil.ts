import { TLAiChange } from '@tldraw/ai'
import {
	Editor,
	FONT_FAMILIES,
	FONT_SIZES,
	IndexKey,
	TEXT_PROPS,
	TLShape,
	TLShapeId,
	toRichText,
	Vec,
	VecLike,
} from 'tldraw'
import z from 'zod'
import { applyAiChange } from '../../client/agent/applyAiChange'
import { AgentRequestTransform } from '../AgentRequestTransform'
import { asColor } from '../format/SimpleColor'
import { convertSimpleFillToTldrawFill } from '../format/SimpleFill'
import { convertSimpleFontSizeToTldrawFontSizeAndScale } from '../format/SimpleFontSize'
import { convertSimpleTypeToTldrawType } from '../format/SimpleGeoShapeType'
import {
	ISimpleArrowShape,
	ISimpleEmbedShape,
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

	override transformAction(action: Streaming<ICreateAction>, transform: AgentRequestTransform) {
		if (!action.complete) return action

		const { shape } = action

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

	override applyAction(action: Streaming<ICreateAction>, transform: AgentRequestTransform) {
		if (!action.complete) return
		const { editor } = transform

		// Translate the shape back to the chat's position
		action.shape = transform.removeOffsetFromShape(action.shape)

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

	const shapeType = convertSimpleTypeToTldrawType(shape._type)

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

			const autoSize = !textShape.wrap // this will be true if the wrap property is not set, which is desired

			const textFontSize = FONT_SIZES[textSize]
			const textAlign = textShape.textAlign ?? 'start'

			const correctedTextCoords = new Vec()

			const effectiveFontSize = textFontSize * scale

			const measurement = editor.textMeasure.measureText(textShape.text, {
				...TEXT_PROPS,
				fontFamily: FONT_FAMILIES['draw'],
				fontSize: effectiveFontSize,
				maxWidth: textShape.width ?? Infinity,
			})

			switch (textAlign) {
				case 'start':
					correctedTextCoords.x = textShape.x
					correctedTextCoords.y = textShape.y - measurement.h / 2
					break
				case 'middle':
					correctedTextCoords.x = textShape.x - measurement.w / 2
					correctedTextCoords.y = textShape.y - measurement.h / 2
					break
				case 'end':
					correctedTextCoords.x = textShape.x - measurement.w
					correctedTextCoords.y = textShape.y - measurement.h / 2
					break
			}

			changes.push({
				type: 'createShape',
				description: action.intent ?? '',
				shape: {
					id: shapeId,
					type: 'text',
					x: correctedTextCoords.x,
					y: correctedTextCoords.y,
					props: {
						size: textSize,
						scale,
						richText: toRichText(textShape.text),
						color: asColor(textShape.color),
						textAlign,
						autoSize,
						w: measurement.w, // it's okay to set width to a number regardeless of autoSize because it won't do anything if autoSize is true
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

			const x1 = arrowShape.x1
			const y1 = arrowShape.y1
			const x2 = arrowShape.x2
			const y2 = arrowShape.y2
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

			if (startShape) {
				const targetPoint = { x: x1, y: y1 }
				const finalNormalizedAnchor = calculateArrowBindingAnchor(editor, startShape, targetPoint)

				changes.push({
					type: 'createBinding',
					description: action.intent ?? '',
					binding: {
						type: 'arrow',
						fromId: shapeId,
						toId: startShape.id,
						props: {
							normalizedAnchor: finalNormalizedAnchor,
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

			if (endShape) {
				const targetPoint = { x: x2, y: y2 }
				const finalNormalizedAnchor = calculateArrowBindingAnchor(editor, endShape, targetPoint)

				changes.push({
					type: 'createBinding',
					description: action.intent ?? '',
					binding: {
						type: 'arrow',
						fromId: shapeId,
						toId: endShape.id,
						props: {
							normalizedAnchor: finalNormalizedAnchor,
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
		case 'bookmark': {
			const embedShape = shape as ISimpleEmbedShape
			changes.push({
				type: 'createShape',
				description: action.intent ?? '',
				shape: {
					id: shapeId,
					type: 'bookmark',
					x: embedShape.x,
					y: embedShape.y,
					props: {
						url: embedShape.url,
					},
					meta: {
						note: embedShape.note ?? '',
					},
				},
			})
			break
		}
	}

	return changes
}

/**
 * Helper function to calculate the best normalized anchor point for arrow binding
 * @param editor - The tldraw editor instance
 * @param targetShape - The shape to bind to
 * @param targetPoint - The desired point in page space
 * @returns The normalized anchor point (0-1 range within shape bounds)
 */
export function calculateArrowBindingAnchor(
	editor: Editor,
	targetShape: TLShape,
	targetPoint: VecLike
): VecLike {
	const targetShapePageBounds = editor.getShapePageBounds(targetShape)
	const targetShapeGeometry = editor.getShapeGeometry(targetShape)

	if (!targetShapePageBounds || !targetShapeGeometry) {
		return { x: 0.5, y: 0.5 } // Fall back to center
	}

	// Transform the target shape's geometry to page space for calculations
	const pageTransform = editor.getShapePageTransform(targetShape)
	const targetShapeGeometryInPageSpace = targetShapeGeometry.transform(pageTransform)

	// Step 1: Find the best anchor point on the shape
	// If the target point is inside the shape, use it; otherwise use the nearest point on the shape
	const anchorPoint = targetShapeGeometryInPageSpace.hitTestPoint(targetPoint, 0, true)
		? targetPoint
		: targetShapeGeometryInPageSpace.nearestPoint(targetPoint)

	// Step 2: Convert anchor point to normalized coordinates (0-1 range within shape bounds)
	const normalizedAnchor = {
		x: (anchorPoint.x - targetShapePageBounds.x) / targetShapePageBounds.w,
		y: (anchorPoint.y - targetShapePageBounds.y) / targetShapePageBounds.h,
	}

	// Step 3: Clamp normalized coordinates to valid range [0, 1]
	const clampedNormalizedAnchor = {
		x: Math.max(0, Math.min(1, normalizedAnchor.x)),
		y: Math.max(0, Math.min(1, normalizedAnchor.y)),
	}

	// Step 4: Validate that the clamped anchor point is still within the shape geometry. This is necessary because the above logic sometimes fails for some reason?
	const clampedAnchorInPageSpace = {
		x: targetShapePageBounds.x + clampedNormalizedAnchor.x * targetShapePageBounds.w,
		y: targetShapePageBounds.y + clampedNormalizedAnchor.y * targetShapePageBounds.h,
	}

	const finalNormalizedAnchor = targetShapeGeometryInPageSpace.hitTestPoint(
		clampedAnchorInPageSpace,
		0,
		true
	)
		? clampedNormalizedAnchor
		: { x: 0.5, y: 0.5 } // Fall back to center

	return finalNormalizedAnchor
}
