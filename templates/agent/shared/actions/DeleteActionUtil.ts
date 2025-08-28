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

	override getInfo(action: Streaming<IDeleteAction>) {
		return {
			icon: 'trash' as const,
			description: action.intent ?? '',
			canGroup: (other: Streaming<BaseAgentAction>) => other._type === 'delete',
		}
	}

	override transformAction(action: Streaming<IDeleteAction>, transform: AgentTransform) {
		if (!action.complete) return action

		const shapeId = transform.ensureShapeIdIsReal(action.shapeId)
		if (!shapeId) return null

		action.shapeId = shapeId
		return action
	}

	override applyAction(action: Streaming<IDeleteAction>, transform: AgentTransform) {
		if (!action.complete) return
		const { editor } = transform

		editor.deleteShape(`shape:${action.shapeId}` as TLShapeId)
	}
}
