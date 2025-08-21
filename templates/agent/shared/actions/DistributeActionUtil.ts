import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const AgentDistributeEvent = z
	.object({
		_type: z.literal('distribute'),
		direction: z.enum(['horizontal', 'vertical']),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Distribute',
		description: 'The AI distributes shapes horizontally or vertically.',
	})

type IAgentDistributeEvent = z.infer<typeof AgentDistributeEvent>

export class DistributeActionUtil extends AgentActionUtil<IAgentDistributeEvent> {
	static override type = 'distribute' as const

	override getSchema() {
		return AgentDistributeEvent
	}

	override getIcon() {
		return 'cursor' as const
	}

	override getDescription(event: Streaming<IAgentDistributeEvent>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IAgentDistributeEvent>, transform: AgentTransform) {
		event.shapeIds = transform.ensureShapeIdsAreReal(event.shapeIds ?? [])
		return event
	}

	override applyEvent(event: Streaming<IAgentDistributeEvent>, transform: AgentTransform) {
		if (!event.complete) return
		const { editor } = transform

		editor.distributeShapes(
			event.shapeIds.map((id) => `shape:${id}` as TLShapeId),
			event.direction
		)
	}
}
