import { TLShapeId, Vec } from 'tldraw'
import z from 'zod'
import { AgentTransform, ensureValueIsNumber } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const MoveAction = z
	.object({
		_type: z.literal('move'),
		intent: z.string(),
		shapeId: z.string(),
		x: z.number(),
		y: z.number(),
	})
	.meta({ title: 'Move', description: 'The AI moves a shape to a new position.' })

type IMoveAction = z.infer<typeof MoveAction>

export class MoveActionUtil extends AgentActionUtil<IMoveAction> {
	static override type = 'move' as const

	override getSchema() {
		return MoveAction
	}

	override getInfo(action: Streaming<IMoveAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override transformAction(action: Streaming<IMoveAction>, transform: AgentTransform) {
		if (!action.complete) return action

		const shapeId = transform.ensureShapeIdIsReal(action.shapeId)
		if (!shapeId) return null

		const floatX = ensureValueIsNumber(action.x)
		const floatY = ensureValueIsNumber(action.y)
		if (floatX === null || floatY === null) return null

		action.x = floatX
		action.y = floatY

		action.shapeId = shapeId
		return action
	}

	override applyAction(action: Streaming<IMoveAction>, transform: AgentTransform) {
		if (!action.complete) return
		const { editor } = transform

		const shapeId = `shape:${action.shapeId}` as TLShapeId
		const shape = editor.getShape(shapeId)
		if (!shape) return

		const shapeBounds = editor.getShapePageBounds(shapeId)
		if (!shapeBounds) return

		const { x: targetX, y: targetY } = action

		const moveTarget: Vec = new Vec(targetX, targetY)
		const shapeBoundsOrigin: Vec = new Vec(shapeBounds.minX, shapeBounds.minY)
		const shapeTrueOrigin: Vec = new Vec(shape.x, shape.y)

		const shapeOriginDelta = shapeTrueOrigin.sub(shapeBoundsOrigin)

		const newTarget = moveTarget.add(shapeOriginDelta)

		editor.updateShape({
			id: shapeId,
			type: shape.type,
			x: newTarget.x,
			y: newTarget.y,
		})
	}
}
