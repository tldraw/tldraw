import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

const AgentStackEvent = z
	.object({
		_type: z.literal('stack'),
		direction: z.enum(['vertical', 'horizontal']),
		gap: z.number(),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Stack',
		description:
			"The AI stacks shapes horizontally or vertically. Note that this doesn't align shapes, it only stacks them along one axis.",
	})

type IAgentStackEvent = z.infer<typeof AgentStackEvent>

export class StackEventUtil extends AgentEventUtil<IAgentStackEvent> {
	static override type = 'stack' as const

	override getSchema() {
		return AgentStackEvent
	}

	override getIcon() {
		return 'cursor' as const
	}

	override getDescription(event: Streaming<IAgentStackEvent>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IAgentStackEvent>, transform: AgentTransform) {
		if (!event.complete) return event

		event.shapeIds = transform.ensureShapeIdsAreReal(event.shapeIds)

		return event
	}

	override applyEvent(event: Streaming<IAgentStackEvent>, transform: AgentTransform) {
		if (!event.complete) return
		const { editor } = transform

		editor.stackShapes(
			event.shapeIds.map((id) => `shape:${id}` as TLShapeId),
			event.direction,
			Math.min(event.gap, 1)
		)
	}
}
