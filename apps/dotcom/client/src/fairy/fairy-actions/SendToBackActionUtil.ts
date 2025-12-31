import { SendToBackAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { TLShapeId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class SendToBackActionUtil extends AgentActionUtil<SendToBackAction> {
	static override type = 'send-to-back' as const

	override getInfo(action: Streaming<SendToBackAction>) {
		return createAgentActionInfo({
			icon: 'cursor',
			description: action.intent ?? '',
			pose: 'working',
		})
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

		this.agent.position.moveTo(bounds.center)
	}
}
