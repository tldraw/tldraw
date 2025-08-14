import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

const AgentMoveEvent = z
	.object({
		_type: z.literal('move'),
		intent: z.string(),
		shapeId: z.string(),
		x: z.number(),
		y: z.number(),
	})
	.meta({ title: 'Move', description: 'The AI moves a shape to a new position.' })

type IAgentMoveEvent = z.infer<typeof AgentMoveEvent>

export class MoveEventUtil extends AgentEventUtil<IAgentMoveEvent> {
	static override type = 'move' as const

	override getSchema() {
		return AgentMoveEvent
	}

	override getIcon() {
		return 'cursor' as const
	}

	override getDescription(event: Streaming<IAgentMoveEvent>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IAgentMoveEvent>, transform: AgentTransform) {
		if (!event.complete) return event

		const shapeId = transform.ensureShapeIdIsReal(event.shapeId)
		if (!shapeId) return null

		event.shapeId = shapeId
		return event
	}

	override applyEvent(event: Streaming<IAgentMoveEvent>, transform: AgentTransform) {
		if (!event.complete) return
		const { editor } = transform

		const shapeId = `shape:${event.shapeId}` as TLShapeId
		const shape = editor.getShape(shapeId)

		if (!shape) return
		editor.updateShape({
			id: shapeId,
			type: shape.type,
			x: event.x,
			y: event.y,
		})
	}
}
