import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil, BaseAgentAction } from './AgentActionUtil'

const DeleteAction = z
	.object({
		_type: z.literal('delete'),
		intent: z.string(),
		shapeId: z.string(),
	})
	.meta({ title: 'Delete', description: 'The AI deletes a shape.' })

type IDeleteAction = z.infer<typeof DeleteAction>

export class DeleteActionUtil extends AgentActionUtil<IDeleteAction> {
	static override type = 'delete' as const

	override getSchema() {
		return DeleteAction
	}

	override getIcon() {
		return 'trash' as const
	}

	override canGroup(event: Streaming<IDeleteAction>, other: Streaming<BaseAgentAction>) {
		return other._type === 'delete'
	}

	override getDescription(event: Streaming<IDeleteAction>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IDeleteAction>, transform: AgentTransform) {
		if (!event.complete) return event

		const shapeId = transform.ensureShapeIdIsReal(event.shapeId)
		if (!shapeId) return null

		event.shapeId = shapeId
		return event
	}

	override applyEvent(event: Streaming<IDeleteAction>, transform: AgentTransform) {
		if (!event.complete) return
		const { editor } = transform

		editor.deleteShape(`shape:${event.shapeId}` as TLShapeId)
	}
}
