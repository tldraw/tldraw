import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

const AgentSendToBackEvent = z
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

type IAgentSendToBackEvent = z.infer<typeof AgentSendToBackEvent>

export class SendToBackEventUtil extends AgentEventUtil<IAgentSendToBackEvent> {
	static override type = 'sendToBack' as const

	override getSchema() {
		return AgentSendToBackEvent
	}

	override getIcon() {
		return 'cursor' as const
	}

	override getDescription(event: Streaming<IAgentSendToBackEvent>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IAgentSendToBackEvent>, transform: AgentTransform) {
		event.shapeIds = transform.ensureShapeIdsAreReal(event.shapeIds ?? [])
		return event
	}

	override applyEvent(event: Streaming<IAgentSendToBackEvent>, transform: AgentTransform) {
		const { editor } = transform

		if (!event.shapeIds) return
		editor.sendToBack(event.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId))
	}
}
