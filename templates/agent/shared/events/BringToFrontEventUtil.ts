import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

const AgentBringToFrontEvent = z
	.object({
		_type: z.literal('bringToFront'),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Bring to Front',
		description:
			'The AI brings one or more shapes to the front so that they appear in front of everything else.',
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

		const shapeIds = transform.ensureShapeIdsAreReal(event.shapeIds)
		if (shapeIds.length === 0) return null

		event.shapeIds = shapeIds
		return event
	}

	override applyEvent(event: Streaming<IAgentBringToFrontEvent>, transform: AgentTransform) {
		if (!event.complete) return
		const { editor } = transform

		editor.bringToFront(event.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId))
	}
}
