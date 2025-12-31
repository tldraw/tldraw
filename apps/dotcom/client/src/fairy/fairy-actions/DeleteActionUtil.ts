import { DeleteAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { TLShapeId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class DeleteActionUtil extends AgentActionUtil<DeleteAction> {
	static override type = 'delete' as const

	override getInfo(action: Streaming<DeleteAction>) {
		return createAgentActionInfo({
			icon: 'trash',
			description: action.intent ?? '',
			pose: 'working',
			//canGroup: (other: Streaming<BaseAgentAction>) => other._type === 'delete',
		})
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

		const shapeId = `shape:${action.shapeId}` as TLShapeId
		const shape = this.agent.editor.getShape(shapeId)
		if (!shape) return

		this.agent.editor.deleteShape(shapeId)
		this.agent.position.moveTo({ x: shape.x, y: shape.y })
	}
}
