import { StackAction, Streaming } from '@tldraw/fairy-shared'
import { TLShapeId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class StackActionUtil extends AgentActionUtil<StackAction> {
	static override type = 'stack' as const

	override getInfo(action: Streaming<StackAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<StackAction>, helpers: AgentHelpers) {
		if (!action.complete) return action

		action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds)

		return action
	}

	override applyAction(action: Streaming<StackAction>) {
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
