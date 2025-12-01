import { BringToFrontAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { TLShapeId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class BringToFrontActionUtil extends AgentActionUtil<BringToFrontAction> {
	static override type = 'bring-to-front' as const

	override getInfo(action: Streaming<BringToFrontAction>) {
		return createAgentActionInfo({
			icon: 'cursor',
			description: action.intent ?? '',
			pose: 'working',
		})
	}

	override sanitizeAction(action: Streaming<BringToFrontAction>, helpers: AgentHelpers) {
		action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
		return action
	}

	override applyAction(action: Streaming<BringToFrontAction>) {
		if (!this.agent) return

		if (!action.shapeIds) return

		const shapeIds = action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId)
		this.agent.editor.bringToFront(shapeIds)

		const bounds = this.agent.editor.getShapesPageBounds(shapeIds)

		if (!bounds) {
			return
		}

		this.agent.position.moveTo(bounds.center)
	}
}
