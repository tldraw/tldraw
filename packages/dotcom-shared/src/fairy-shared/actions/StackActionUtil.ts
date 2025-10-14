import { TLShapeId } from '@tldraw/editor'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil, AgentActionUtilConstructor } from './AgentActionUtil'

const StackAction = z
	.object({
		_type: z.literal('stack'),
		direction: z.enum(['vertical', 'horizontal']),
		gap: z.number(),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Stack',
		description:
			"The fairy stacks shapes horizontally or vertically. Note that this doesn't align shapes, it only stacks them along one axis.",
	})

type IAgentStackEvent = z.infer<typeof StackAction>

export class StackActionUtil extends AgentActionUtil<IAgentStackEvent> {
	static override type = 'stack' as const

	override getSchema(actions: AgentActionUtilConstructor['type'][]) {
		if (!actions.includes('stack')) {
			return null
		}
		return StackAction
	}

	override getInfo(action: Streaming<IAgentStackEvent>) {
		return {
			icon: null, //'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<IAgentStackEvent>, helpers: AgentHelpers) {
		if (!action.complete) return action

		action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds)

		return action
	}

	override applyAction(action: Streaming<IAgentStackEvent>) {
		if (!action.complete) return
		if (!this.agent) return

		const shapeIds = action.shapeIds.map((id) => `shape:${id}` as TLShapeId)
		this.agent.editor.stackShapes(shapeIds, action.direction, Math.min(action.gap, 1))

		const bounds = this.agent.editor.getShapesPageBounds(shapeIds)

		if (!bounds) {
			return
		}

		this.agent.moveToPosition(bounds.center)
	}
}
