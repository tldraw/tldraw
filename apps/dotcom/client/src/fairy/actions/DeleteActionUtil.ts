import { AgentHelpers, DeleteAction, Streaming } from '@tldraw/fairy-shared'
import { TLShapeId } from 'tldraw'
import { AgentActionUtil } from './AgentActionUtil'

export class DeleteActionUtil extends AgentActionUtil<DeleteAction> {
	static override type = 'delete' as const

	override getInfo(action: Streaming<DeleteAction>) {
		return {
			icon: 'trash' as const,
			description: action.intent ?? '',
			//canGroup: (other: Streaming<BaseAgentAction>) => other._type === 'delete',
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

		const shape = this.agent.editor.getShape(`shape:${action.shapeId}` as TLShapeId)
		if (!shape) return

		this.agent.editor.deleteShape(`shape:${action.shapeId}` as TLShapeId)
		this.agent.moveToPosition({ x: shape.x, y: shape.y })
	}
}
