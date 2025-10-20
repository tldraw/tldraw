import { TLShapeId } from '@tldraw/editor'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil, AgentActionUtilConstructor } from './AgentActionUtil'

const DistributeAction = z
	.object({
		_type: z.literal('distribute'),
		direction: z.enum(['horizontal', 'vertical']),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Distribute',
		description: 'The fairy distributes shapes horizontally or vertically.',
	})

type DistributeAction = z.infer<typeof DistributeAction>

export class DistributeActionUtil extends AgentActionUtil<DistributeAction> {
	static override type = 'distribute' as const

	override getSchema(actions: AgentActionUtilConstructor['type'][]) {
		if (!actions.includes('distribute')) {
			return null
		}
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

		const shapeIds = action.shapeIds.map((id) => `shape:${id}` as TLShapeId)
		this.agent.editor.distributeShapes(shapeIds, action.direction)

		const bounds = this.agent.editor.getShapesPageBounds(shapeIds)

		if (!bounds) {
			return
		}

		this.agent.moveToPosition(bounds.center)
	}
}
