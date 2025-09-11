import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const PlaceAction = z
	.object({
		_type: z.literal('place'),
		align: z.enum(['start', 'center', 'end']),
		alignOffset: z.number(),
		intent: z.string(),
		referenceShapeId: z.string(),
		side: z.enum(['top', 'bottom', 'left', 'right']),
		sideOffset: z.number(),
		shapeId: z.string(),
	})
	.meta({ title: 'Place', description: 'The AI places a shape relative to another shape.' })

type PlaceAction = z.infer<typeof PlaceAction>

export class PlaceActionUtil extends AgentActionUtil<PlaceAction> {
	static override type = 'place' as const

	override getSchema() {
		return PlaceAction
	}

	override getInfo(action: Streaming<PlaceAction>) {
		return {
			icon: 'target' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<PlaceAction>, helpers: AgentHelpers) {
		if (!action.complete) return action

		const shapeId = helpers.ensureShapeIdExists(action.shapeId)
		if (!shapeId) return null
		action.shapeId = shapeId

		const referenceShapeId = helpers.ensureShapeIdExists(action.referenceShapeId)
		if (!referenceShapeId) return null
		action.referenceShapeId = referenceShapeId

		return action
	}

	override applyAction(action: Streaming<PlaceAction>) {
		if (!action.complete) return
		if (!this.agent) return
		const { editor } = this.agent

		const { side, sideOffset = 0, align, alignOffset = 0 } = action
		const referenceShapeId = `shape:${action.referenceShapeId}` as TLShapeId
		const shapeId = `shape:${action.shapeId}` as TLShapeId

		const shape = editor.getShape(shapeId)
		const referenceShape = editor.getShape(referenceShapeId)
		if (!shape || !referenceShape) return

		const bbA = editor.getShapePageBounds(shape)!
		const bbR = editor.getShapePageBounds(referenceShape)!
		if (side === 'top' && align === 'start') {
			editor.updateShape({
				id: shapeId,
				type: shape.type,
				x: bbR.minX + alignOffset,
				y: bbR.minY - bbA.height - sideOffset,
			})
		} else if (side === 'top' && align === 'center') {
			editor.updateShape({
				id: shapeId,
				type: shape.type,
				x: bbR.midX - bbA.width / 2 + alignOffset,
				y: bbR.minY - bbA.height - sideOffset,
			})
		} else if (side === 'top' && align === 'end') {
			editor.updateShape({
				id: shapeId,
				type: shape.type,
				x: bbR.maxX - bbA.width - alignOffset,
				y: bbR.minY - bbA.height - sideOffset,
			})
		} else if (side === 'bottom' && align === 'start') {
			editor.updateShape({
				id: shapeId,
				type: shape.type,
				x: bbR.minX + alignOffset,
				y: bbR.maxY + sideOffset,
			})
		} else if (side === 'bottom' && align === 'center') {
			editor.updateShape({
				id: shapeId,
				type: shape.type,
				x: bbR.midX - bbA.width / 2 + alignOffset,
				y: bbR.maxY + sideOffset,
			})
		} else if (side === 'bottom' && align === 'end') {
			editor.updateShape({
				id: shapeId,
				type: shape.type,
				x: bbR.maxX - bbA.width - alignOffset,
				y: bbR.maxY + sideOffset,
			})
			// LEFT SIDE (corrected)
		} else if (side === 'left' && align === 'start') {
			editor.updateShape({
				id: shapeId,
				type: shape.type,
				x: bbR.minX - bbA.width - sideOffset,
				y: bbR.minY + alignOffset,
			})
		} else if (side === 'left' && align === 'center') {
			editor.updateShape({
				id: shapeId,
				type: shape.type,
				x: bbR.minX - bbA.width - sideOffset,
				y: bbR.midY - bbA.height / 2 + alignOffset,
			})
		} else if (side === 'left' && align === 'end') {
			editor.updateShape({
				id: shapeId,
				type: shape.type,
				x: bbR.minX - bbA.width - sideOffset,
				y: bbR.maxY - bbA.height - alignOffset,
			})
			// RIGHT SIDE (corrected)
		} else if (side === 'right' && align === 'start') {
			editor.updateShape({
				id: shapeId,
				type: shape.type,
				x: bbR.maxX + sideOffset,
				y: bbR.minY + alignOffset,
			})
		} else if (side === 'right' && align === 'center') {
			editor.updateShape({
				id: shapeId,
				type: shape.type,
				x: bbR.maxX + sideOffset,
				y: bbR.midY - bbA.height / 2 + alignOffset,
			})
		} else if (side === 'right' && align === 'end') {
			editor.updateShape({
				id: shapeId,
				type: shape.type,
				x: bbR.maxX + sideOffset,
				y: bbR.maxY - bbA.height - alignOffset,
			})
		}
	}
}
