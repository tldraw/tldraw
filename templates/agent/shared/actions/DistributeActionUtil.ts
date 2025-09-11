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

type DistributeAction = z.infer<typeof DistributeAction>

export class DistributeActionUtil extends AgentActionUtil<DistributeAction> {
	static override type = 'distribute' as const

	override getSchema() {
		return DistributeAction
	}

	override getInfo(action: Streaming<DistributeAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<DistributeAction>, helpers: AgentHelpers) {
		action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
		return action
	}

	override applyAction(action: Streaming<DistributeAction>) {
		if (!action.complete) return
		if (!this.agent) return

		this.agent.editor.distributeShapes(
			action.shapeIds.map((id) => `shape:${id}` as TLShapeId),
			action.direction
		)
	}
}
