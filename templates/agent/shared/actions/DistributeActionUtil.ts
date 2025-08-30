import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
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

	override transformAction(action: Streaming<IDistributeAction>, transform: AgentTransform) {
		action.shapeIds = transform.ensureShapeIdsAreReal(action.shapeIds ?? [])
		return action
	}

	override applyAction(action: Streaming<IDistributeAction>, transform: AgentTransform) {
		if (!action.complete) return
		const { editor } = transform

		editor.distributeShapes(
			action.shapeIds.map((id) => `shape:${id}` as TLShapeId),
			action.direction
		)
	}
}
