import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const ResizeAction = z
	.object({
		_type: z.literal('resize'),
		centerX: z.number(),
		centerY: z.number(),
		intent: z.string(),
		scaleX: z.number(),
		scaleY: z.number(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Resize',
		description: 'The AI resizes one or more shapes around a center point.',
	})

type IResizeAction = z.infer<typeof ResizeAction>

export class ResizeActionUtil extends AgentActionUtil<IResizeAction> {
	static override type = 'resize' as const

	override getSchema() {
		return ResizeAction
	}

	override getIcon() {
		return 'cursor' as const
	}

	override getDescription(event: Streaming<IResizeAction>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IResizeAction>, transform: AgentTransform) {
		const shapeIds = transform.ensureShapeIdsAreReal(event.shapeIds ?? [])
		if (shapeIds.length === 0) return null

		event.shapeIds = shapeIds
		return event
	}

	override applyEvent(event: Streaming<IResizeAction>, transform: AgentTransform) {
		const { editor } = transform

		if (!event.shapeIds || !event.scaleX || !event.scaleY || !event.centerX || !event.centerY) {
			return
		}

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
