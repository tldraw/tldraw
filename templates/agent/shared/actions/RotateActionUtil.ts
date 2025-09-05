import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentRequestTransform } from '../AgentRequestTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const RotateAction = z
	.object({
		_type: z.literal('rotate'),
		centerY: z.number(),
		degrees: z.number(),
		intent: z.string(),
		originX: z.number(),
		originY: z.number(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Rotate',
		description: 'The AI rotates one or more shapes around an origin point.',
	})

type IRotateAction = z.infer<typeof RotateAction>

export class RotateActionUtil extends AgentActionUtil<IRotateAction> {
	static override type = 'rotate' as const

	override getSchema() {
		return RotateAction
	}

	override getInfo(action: Streaming<IRotateAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override transformAction(action: Streaming<IRotateAction>, transform: AgentRequestTransform) {
		action.shapeIds = transform.ensureShapeIdsAreReal(action.shapeIds ?? [])
		return action
	}

	override applyAction(action: Streaming<IRotateAction>, transform: AgentRequestTransform) {
		const { editor } = transform

		if (!action.shapeIds || !action.degrees || !action.originX || !action.originY) {
			return
		}

		const origin = transform.removeOffsetFromVec({ x: action.originX, y: action.originY })
		const shapeIds = action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId)
		const radians = (action.degrees * Math.PI) / 180

		editor.rotateShapesBy(shapeIds, radians, { center: origin })
	}
}
