import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

const AgentBringToFrontEvent = z
	.object({
		_type: z.literal('bringToFront'),
		intent: z.string(),
		shapeId: z.string(),
	})
	.meta({
		title: 'Bring to Front',
		description: 'The AI brings a shape to the front so that it appears in front of other shapes.',
	})

type IAgentBringToFrontEvent = z.infer<typeof AgentBringToFrontEvent>

export class BringToFrontEventUtil extends AgentEventUtil<IAgentBringToFrontEvent> {
	static override type = 'bringToFront' as const

	override getSchema() {
		return AgentBringToFrontEvent
	}

	override getIcon() {
		return 'cursor' as const
	}

	override getDescription(event: Streaming<IAgentBringToFrontEvent>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IAgentBringToFrontEvent>, transform: AgentTransform) {
		if (!event.complete) return event

		const shapeId = transform.ensureShapeIdIsReal(event.shapeId)
		if (!shapeId) return null

		event.shapeId = shapeId
		return event
	}

	override applyEvent(event: Streaming<IAgentBringToFrontEvent>, transform: AgentTransform) {
		if (!event.complete) return
		const { editor } = transform

		const shapeId = `shape:${event.shapeId}` as TLShapeId
		editor.bringToFront([shapeId])
	}
}
