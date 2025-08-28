import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const RotateAction = z
	.object({
		_type: z.literal('rotate'),
		centerX: z.number(),
		centerY: z.number(),
		degrees: z.number(),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Rotate',
		description: 'The AI rotates one or more shapes around a center point.',
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

	override transformAction(action: Streaming<IRotateAction>, transform: AgentTransform) {
		action.shapeIds = transform.ensureShapeIdsAreReal(action.shapeIds ?? [])
		return action
	}

	override applyAction(action: Streaming<IRotateAction>, transform: AgentTransform) {
		const { editor } = transform

		if (!action.shapeIds || !action.degrees || !action.centerX || !action.centerY) {
			return
		}

		const shapeIds = action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId)
		const radians = (action.degrees * Math.PI) / 180

		editor.rotateShapesBy(shapeIds, radians, {
			center: { x: action.centerX, y: action.centerY },
		})
	}
}
