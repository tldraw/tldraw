import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const SendToBackAction = z
	.object({
		_type: z.literal('sendToBack'),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Send to Back',
		description:
			'The AI sends one or more shapes to the back so that they appear behind everything else.',
	})

type SendToBackAction = z.infer<typeof SendToBackAction>

export class SendToBackActionUtil extends AgentActionUtil<SendToBackAction> {
	static override type = 'sendToBack' as const

	override getSchema() {
		return SendToBackAction
	}

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
