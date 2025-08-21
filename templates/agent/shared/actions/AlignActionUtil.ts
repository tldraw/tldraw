import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const AgentAlignEvent = z
	.object({
		_type: z.literal('align'),
		alignment: z.enum(['top', 'bottom', 'left', 'right', 'center-horizontal', 'center-vertical']),
		gap: z.number(),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({ title: 'Align', description: 'The AI aligns shapes to each other on an axis.' })

type IAgentAlignEvent = z.infer<typeof AgentAlignEvent>

export class AlignActionUtil extends AgentActionUtil<IAgentAlignEvent> {
	static override type = 'align' as const

	override getSchema() {
		return AgentAlignEvent
	}

	override getIcon() {
		return 'cursor' as const
	}

	override getDescription(event: Streaming<IAgentAlignEvent>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IAgentAlignEvent>, transform: AgentTransform) {
		event.shapeIds = transform.ensureShapeIdsAreReal(event.shapeIds ?? [])
		return event
	}

	override applyEvent(event: Streaming<IAgentAlignEvent>, transform: AgentTransform) {
		if (!event.complete) return
		const { editor } = transform

		editor.alignShapes(
			event.shapeIds.map((id) => `shape:${id}` as TLShapeId),
			event.alignment
		)
	}
}
