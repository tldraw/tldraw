import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const AgentRotateEvent = z
	.object({
		_type: z.literal('rotate'),
		centerX: z.number(),
		centerY: z.number(),
		degrees: z.number(),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Rotate',
		description: 'The AI rotates one or more shapes around a center point.',
	})

type IAgentRotateEvent = z.infer<typeof AgentRotateEvent>

export class RotateActionUtil extends AgentActionUtil<IAgentRotateEvent> {
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
		event.shapeIds = transform.ensureShapeIdsAreReal(event.shapeIds ?? [])
		return event
	}

	override applyEvent(event: Streaming<IAgentRotateEvent>, transform: AgentTransform) {
		const { editor } = transform

		if (!event.shapeIds || !event.degrees || !event.centerX || !event.centerY) {
			return
		}

		const shapeIds = event.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId)
		const radians = (event.degrees * Math.PI) / 180

		editor.rotateShapesBy(shapeIds, radians, {
			center: { x: event.centerX, y: event.centerY },
		})
	}
}
