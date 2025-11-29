import { AlignAction, Streaming } from '@tldraw/fairy-shared'
import { TLShapeId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class AlignActionUtil extends AgentActionUtil<AlignAction> {
	static override type = 'align' as const

	override getInfo(action: Streaming<AlignAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
			pose: 'working' as const,
		}
	}

	override sanitizeAction(action: Streaming<AlignAction>, helpers: AgentHelpers) {
		action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
		return action
	}

	override applyAction(action: Streaming<AlignAction>) {
		if (!action.complete) return
		if (!this.agent) return

		const shapeIds = action.shapeIds.map((id) => `shape:${id}` as TLShapeId)
		this.agent.editor.alignShapes(shapeIds, action.alignment)

		const bounds = this.agent.editor.getShapesPageBounds(shapeIds)

		if (!bounds) {
			return
		}

		this.agent.moveToPosition(bounds.center)
	}
}
