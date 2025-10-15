import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
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

type RotateAction = z.infer<typeof RotateAction>

export class RotateActionUtil extends AgentActionUtil<RotateAction> {
	static override type = 'rotate' as const

	override getSchema() {
		return RotateAction
	}

	override getInfo(action: Streaming<RotateAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<RotateAction>, helpers: AgentHelpers) {
		action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
		return action
	}

	override applyAction(action: Streaming<RotateAction>, helpers: AgentHelpers) {
		if (!this.agent) return

		if (!action.shapeIds || !action.degrees || !action.originX || !action.originY) {
			return
		}

		const origin = helpers.removeOffsetFromVec({ x: action.originX, y: action.originY })
		const shapeIds = action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId)
		const radians = (action.degrees * Math.PI) / 180

		this.agent.editor.rotateShapesBy(shapeIds, radians, { center: origin })
	}
}
