import { DistributeAction, Streaming } from '@tldraw/fairy-shared'
import { TLShapeId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class DistributeActionUtil extends AgentActionUtil<DistributeAction> {
	static override type = 'distribute' as const

	override getInfo(action: Streaming<DistributeAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
			pose: 'working' as const,
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

		this.agent.positionManager.moveTo(bounds.center)
	}
}
