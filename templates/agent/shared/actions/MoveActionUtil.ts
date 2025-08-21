import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform, ensureValueIsNumber } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const MoveAction = z
	.object({
		_type: z.literal('move'),
		intent: z.string(),
		shapeId: z.string(),
		x: z.number(),
		y: z.number(),
	})
	.meta({ title: 'Move', description: 'The AI moves a shape to a new position.' })

type IMoveAction = z.infer<typeof MoveAction>

export class MoveActionUtil extends AgentActionUtil<IMoveAction> {
	static override type = 'move' as const

	override getSchema() {
		return MoveAction
	}

	override getIcon() {
		return 'cursor' as const
	}

	override getDescription(event: Streaming<IMoveAction>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IMoveAction>, transform: AgentTransform) {
		if (!event.complete) return event

		const shapeId = transform.ensureShapeIdIsReal(event.shapeId)
		if (!shapeId) return null

		const floatX = ensureValueIsNumber(event.x)
		const floatY = ensureValueIsNumber(event.y)
		if (floatX === null || floatY === null) return null

		event.x = floatX
		event.y = floatY

		event.shapeId = shapeId
		return event
	}

	override applyEvent(event: Streaming<IMoveAction>, transform: AgentTransform) {
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
