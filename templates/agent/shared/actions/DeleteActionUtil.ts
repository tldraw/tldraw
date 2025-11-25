import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import { BaseAgentAction } from '../types/BaseAgentAction'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const DeleteAction = z
	.object({
		_type: z.literal('delete'),
		intent: z.string(),
		shapeId: z.string(),
	})
	.meta({ title: 'Delete', description: 'The AI deletes a shape.' })

type DeleteAction = z.infer<typeof DeleteAction>

export class DeleteActionUtil extends AgentActionUtil<DeleteAction> {
	static override type = 'delete' as const

	override getSchema() {
		return DeleteAction
	}

	override getInfo(action: Streaming<DeleteAction>) {
		return {
			icon: 'trash' as const,
			description: action.intent ?? '',
			canGroup: (other: Streaming<BaseAgentAction>) => other._type === 'delete',
		}
	}

	override sanitizeAction(action: Streaming<DeleteAction>, helpers: AgentHelpers) {
		if (!action.complete) return action

		const shapeId = helpers.ensureShapeIdExists(action.shapeId)
		if (!shapeId) return null

		action.shapeId = shapeId
		return action
	}

	override applyAction(action: Streaming<DeleteAction>) {
		if (!action.complete) return
		if (!this.agent) return

		this.agent.editor.deleteShape(`shape:${action.shapeId}` as TLShapeId)
	}
}
