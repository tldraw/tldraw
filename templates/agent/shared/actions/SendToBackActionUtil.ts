import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentRequestTransform } from '../AgentRequestTransform'
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

type ISendToBackAction = z.infer<typeof SendToBackAction>

export class SendToBackActionUtil extends AgentActionUtil<ISendToBackAction> {
	static override type = 'sendToBack' as const

	override getSchema() {
		return SendToBackAction
	}

	override getInfo(action: Streaming<ISendToBackAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override transformAction(action: Streaming<ISendToBackAction>, transform: AgentRequestTransform) {
		action.shapeIds = transform.ensureShapeIdsAreReal(action.shapeIds ?? [])
		return action
	}

	override applyAction(action: Streaming<ISendToBackAction>, transform: AgentRequestTransform) {
		const { editor } = transform

		if (!action.shapeIds) return
		editor.sendToBack(action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId))
	}
}
