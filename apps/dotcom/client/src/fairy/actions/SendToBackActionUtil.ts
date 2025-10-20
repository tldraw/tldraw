import { AgentHelpers, SendToBackAction, Streaming } from '@tldraw/fairy-shared'
import { TLShapeId } from 'tldraw'
import { AgentActionUtil } from './AgentActionUtil'

export class SendToBackActionUtil extends AgentActionUtil<SendToBackAction> {
	static override type = 'sendToBack' as const

	override getInfo(action: Streaming<SendToBackAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<SendToBackAction>, helpers: AgentHelpers) {
		action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
		return action
	}

	override applyAction(action: Streaming<SendToBackAction>) {
		if (!this.agent) return

		if (!action.shapeIds) return

		const shapeIds = action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId)
		this.agent.editor.sendToBack(shapeIds)

		const bounds = this.agent.editor.getShapesPageBounds(shapeIds)

		if (!bounds) {
			return
		}

		this.agent.moveToPosition(bounds.center)
	}
}
