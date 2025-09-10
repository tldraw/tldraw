import { TLShapeId, Vec } from 'tldraw'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
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

	override sanitizeAction(action: Streaming<IMoveAction>, agentHelpers: AgentHelpers) {
		if (!action.complete) return action

		// Make sure the shape ID refers to a real shape
		const shapeId = agentHelpers.ensureShapeIdExists(action.shapeId)
		if (!shapeId) return null
		action.shapeId = shapeId

		// Make sure the x and y values are numbers
		const floatX = agentHelpers.ensureValueIsNumber(action.x)
		const floatY = agentHelpers.ensureValueIsNumber(action.y)
		if (floatX === null || floatY === null) return null
		action.x = floatX
		action.y = floatY

		return action
	}

	override applyAction(action: Streaming<IMoveAction>, agentHelpers: AgentHelpers) {
		if (!action.complete) return

		// Translate the position back to the chat's position
		const { x, y } = agentHelpers.removeOffsetFromVec({ x: action.x, y: action.y })

		const { editor } = agentHelpers
		const shapeId = `shape:${action.shapeId}` as TLShapeId
		const shape = editor.getShape(shapeId)
		if (!shape) return

		const shapeBounds = editor.getShapePageBounds(shapeId)
		if (!shapeBounds) return

		const moveTarget = new Vec(x, y)
		const shapeOrigin = new Vec(shape.x, shape.y)
		const shapeBoundsOrigin = new Vec(shapeBounds.minX, shapeBounds.minY)

		const shapeOriginDelta = shapeOrigin.sub(shapeBoundsOrigin)
		const newTarget = moveTarget.add(shapeOriginDelta)

		editor.updateShape({
			id: shapeId,
			type: shape.type,
			x: newTarget.x,
			y: newTarget.y,
		})
	}
}
