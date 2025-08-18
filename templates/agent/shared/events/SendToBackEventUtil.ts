import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

const AgentSendToBackEvent = z
	.object({
		_type: z.literal('sendToBack'),
		intent: z.string(),
		shapeId: z.string(),
	})
	.meta({
		title: 'Send to Back',
		description: 'The AI sends a shape to the back so that it appears behind other shapes.',
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
		if (!event.complete) return event

		const shapeId = transform.ensureShapeIdIsReal(event.shapeId)
		if (!shapeId) return null

		event.shapeId = shapeId
		return event
	}

	override applyEvent(event: Streaming<IAgentSendToBackEvent>, transform: AgentTransform) {
		if (!event.complete) return
		const { editor } = transform

		const shapeId = `shape:${event.shapeId}` as TLShapeId
		editor.sendToBack([shapeId])
	}
}
