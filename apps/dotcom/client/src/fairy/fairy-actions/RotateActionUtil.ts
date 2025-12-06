import { RotateAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { TLShapeId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class RotateActionUtil extends AgentActionUtil<RotateAction> {
	static override type = 'rotate' as const

	override getInfo(action: Streaming<RotateAction>) {
		return createAgentActionInfo({
			icon: 'cursor',
			description: action.intent ?? '',
			pose: 'working',
		})
	}

	override sanitizeAction(action: Streaming<RotateAction>, helpers: AgentHelpers) {
		action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
		return action
	}

	override applyAction(action: Streaming<RotateAction>, helpers: AgentHelpers) {
		const { agent } = this
		if (!agent) return

		if (!action.shapeIds || !action.degrees || !action.originX || !action.originY) {
			return
		}

		const origin = helpers.removeOffsetFromVec({ x: action.originX, y: action.originY })
		const shapeIds = action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId)
		const radians = (action.degrees * Math.PI) / 180

		agent.editor.rotateShapesBy(shapeIds, radians, { center: origin })
		agent.position.moveTo(origin)
	}
}
