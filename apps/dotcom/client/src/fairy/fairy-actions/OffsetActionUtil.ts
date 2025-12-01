import { OffsetAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { TLShapeId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class OffsetActionUtil extends AgentActionUtil<OffsetAction> {
	static override type = 'offset' as const

	override getInfo(action: Streaming<OffsetAction>) {
		return createAgentActionInfo({
			icon: 'cursor',
			description: action.intent ?? '',
			pose: 'working',
		})
	}

	override sanitizeAction(action: Streaming<OffsetAction>, helpers: AgentHelpers) {
		if (!action.complete) return action

		// Make sure the shape IDs refer to real shapes
		action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
		if (action.shapeIds.length === 0) return null

		// Make sure the offset values are numbers
		const floatOffsetX = helpers.ensureValueIsNumber(action.offsetX)
		const floatOffsetY = helpers.ensureValueIsNumber(action.offsetY)
		if (floatOffsetX === null || floatOffsetY === null) return null
		action.offsetX = floatOffsetX
		action.offsetY = floatOffsetY

		return action
	}

	override applyAction(action: Streaming<OffsetAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return
		const { editor } = this.agent

		// Get the offset values (these are already in page coordinates, not chat coordinates)
		const { offsetX, offsetY } = action

		const shapeIds = action.shapeIds.map((id) => `shape:${id}` as TLShapeId)

		// Move each shape by the offset
		for (const shapeId of shapeIds) {
			const shape = editor.getShape(shapeId)
			if (!shape) continue

			editor.updateShape({
				id: shapeId,
				type: shape.type,
				x: shape.x + offsetX,
				y: shape.y + offsetY,
			})
		}

		// Move the fairy to the center of the offset shapes
		if (shapeIds.length > 0) {
			const bounds = editor.getShapesPageBounds(shapeIds)
			if (bounds) {
				this.agent.position.moveTo(bounds.center)
			}
		}
	}
}
