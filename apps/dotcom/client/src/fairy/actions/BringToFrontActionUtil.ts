import { AgentHelpers, BringToFrontAction, Streaming } from '@tldraw/fairy-shared'
import { TLShapeId } from 'tldraw'
import { AgentActionUtil } from './AgentActionUtil'

export class BringToFrontActionUtil extends AgentActionUtil<BringToFrontAction> {
	static override type = 'bringToFront' as const

	override getInfo(action: Streaming<BringToFrontAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<BringToFrontAction>, helpers: AgentHelpers) {
		action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
		return action
	}

	override applyAction(action: Streaming<BringToFrontAction>) {
		if (!this.agent) return

		if (!action.shapeIds) return

		const shapeIds = action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId)
		this.agent.editor.bringToFront(shapeIds)

		const bounds = this.agent.editor.getShapesPageBounds(shapeIds)

		if (!bounds) {
			return
		}

		this.agent.moveToPosition(bounds.center)
	}
}
