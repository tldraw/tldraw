import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

const AgentResizeEvent = z
	.object({
		_type: z.literal('resize'),
		intent: z.string(),
		shapeIds: z.array(z.string()),
		scaleX: z.number(),
		scaleY: z.number(),
		centerX: z.number(),
		centerY: z.number(),
	})
	.meta({
		title: 'Resize',
		description: 'The AI resizes one or more shapes around a center point.',
	})

type IAgentResizeEvent = z.infer<typeof AgentResizeEvent>

export class ResizeEventUtil extends AgentEventUtil<IAgentResizeEvent> {
	static override type = 'resize' as const

	override getSchema() {
		return AgentResizeEvent
	}

	override getIcon() {
		return 'cursor' as const
	}

	override getDescription(event: Streaming<IAgentResizeEvent>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IAgentResizeEvent>, transform: AgentTransform) {
		if (!event.complete) return event

		const shapeIds = transform.ensureShapeIdsAreReal(event.shapeIds)
		if (shapeIds.length === 0) return null

		event.shapeIds = shapeIds
		return event
	}

	override applyEvent(event: Streaming<IAgentResizeEvent>, transform: AgentTransform) {
		if (!event.complete) return
		const { editor } = transform

		const shapeIds = event.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId)

		for (const shapeId of shapeIds) {
			editor.resizeShape(
				shapeId,
				{ x: event.scaleX, y: event.scaleY },
				{
					scaleOrigin: { x: event.centerX, y: event.centerY },
				}
			)
		}
	}
}
