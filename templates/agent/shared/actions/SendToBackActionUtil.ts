import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
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

	override getIcon() {
		return 'cursor' as const
	}

	override getDescription(event: Streaming<ISendToBackAction>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<ISendToBackAction>, transform: AgentTransform) {
		event.shapeIds = transform.ensureShapeIdsAreReal(event.shapeIds ?? [])
		return event
	}

	override applyEvent(event: Streaming<ISendToBackAction>, transform: AgentTransform) {
		const { editor } = transform

		if (!event.shapeIds) return
		editor.sendToBack(event.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId))
	}
}
