import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

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

export class BringToFrontActionUtil extends AgentActionUtil<IAgentBringToFrontEvent> {
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
		event.shapeIds = transform.ensureShapeIdsAreReal(event.shapeIds ?? [])
		return event
	}

	override applyEvent(event: Streaming<IAgentBringToFrontEvent>, transform: AgentTransform) {
		const { editor } = transform

		if (!event.shapeIds) return
		editor.bringToFront(event.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId))
	}
}
