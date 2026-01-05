import { TLShapeId } from 'tldraw'
import { SendToBackAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
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
		this.agent.editor.sendToBack(action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId))
	}
}
