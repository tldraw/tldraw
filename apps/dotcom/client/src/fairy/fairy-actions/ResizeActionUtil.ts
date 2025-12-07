import { ResizeAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { TLShapeId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class ResizeActionUtil extends AgentActionUtil<ResizeAction> {
	static override type = 'resize' as const

	override getInfo(action: Streaming<ResizeAction>) {
		return createAgentActionInfo({
			icon: 'cursor',
			description: action.intent ?? '',
			pose: 'working',
		})
	}

	override sanitizeAction(action: Streaming<ResizeAction>, helpers: AgentHelpers) {
		const shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
		if (shapeIds.length === 0) return null

		action.shapeIds = shapeIds
		return action
	}

	override applyAction(action: Streaming<ResizeAction>, helpers: AgentHelpers) {
		if (!this.agent) return

		if (
			!action.shapeIds ||
			!action.scaleX ||
			!action.scaleY ||
			!action.originX ||
			!action.originY
		) {
			return
		}

		const origin = helpers.removeOffsetFromVec({ x: action.originX, y: action.originY })
		const shapeIds = action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId)

		for (const shapeId of shapeIds) {
			this.agent.editor.resizeShape(
				shapeId,
				{ x: action.scaleX, y: action.scaleY },
				{ scaleOrigin: origin }
			)
		}

		this.agent.position.moveTo(origin)
	}
}
