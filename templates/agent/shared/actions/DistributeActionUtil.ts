import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const DistributeAction = z
	.object({
		_type: z.literal('distribute'),
		direction: z.enum(['horizontal', 'vertical']),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Distribute',
		description: 'The AI distributes shapes horizontally or vertically.',
	})

type IDistributeAction = z.infer<typeof DistributeAction>

export class DistributeActionUtil extends AgentActionUtil<IDistributeAction> {
	static override type = 'distribute' as const

	override getSchema() {
		return DistributeAction
	}

	override getInfo(action: Streaming<IDistributeAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<IDistributeAction>, agentHelpers: AgentHelpers) {
		action.shapeIds = agentHelpers.ensureShapeIdsExist(action.shapeIds ?? [])
		return action
	}

	override applyAction(action: Streaming<IDistributeAction>, agentHelpers: AgentHelpers) {
		if (!action.complete) return
		const { editor } = agentHelpers

		editor.distributeShapes(
			action.shapeIds.map((id) => `shape:${id}` as TLShapeId),
			action.direction
		)
	}
}
