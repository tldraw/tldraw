import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

const AgentRotateEvent = z
	.object({
		_type: z.literal('rotate'),
		intent: z.string(),
		shapeId: z.string(),
		degrees: z.number(),
		centerX: z.number(),
		centerY: z.number(),
	})
	.meta({ title: 'Rotate', description: 'The AI rotates a shape around a center point.' })

type IAgentRotateEvent = z.infer<typeof AgentRotateEvent>

export class RotateEventUtil extends AgentEventUtil<IAgentRotateEvent> {
	static override type = 'rotate' as const

	override getSchema() {
		return AgentRotateEvent
	}

	override getIcon() {
		return 'cursor' as const
	}

	override getDescription(event: Streaming<IAgentRotateEvent>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IAgentRotateEvent>, transform: AgentTransform) {
		if (!event.complete) return event

		const shapeId = transform.ensureShapeIdIsReal(event.shapeId)
		if (!shapeId) return null

		event.shapeId = shapeId
		return event
	}

	override applyEvent(event: Streaming<IAgentRotateEvent>, transform: AgentTransform) {
		if (!event.complete) return
		const { editor } = transform

		const shapeId = `shape:${event.shapeId}` as TLShapeId

		const radians = (event.degrees * Math.PI) / 180

		editor.rotateShapesBy([shapeId], radians, {
			center: { x: event.centerX, y: event.centerY },
		})
	}
}
