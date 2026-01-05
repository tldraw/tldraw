import { TLShapeId } from 'tldraw'
import { DistributeAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class DistributeActionUtil extends AgentActionUtil<DistributeAction> {
	static override type = 'distribute' as const

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
