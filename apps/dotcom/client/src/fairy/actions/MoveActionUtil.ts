import { AgentHelpers, MoveAction, Streaming } from '@tldraw/fairy-shared'
import { TLShapeId, Vec } from 'tldraw'
import { AgentActionUtil } from './AgentActionUtil'

export class MoveActionUtil extends AgentActionUtil<MoveAction> {
	static override type = 'move' as const

	override getInfo(action: Streaming<MoveAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<MoveAction>, helpers: AgentHelpers) {
		if (!action.complete) return action

		// Make sure the shape ID refers to a real shape
		const shapeId = helpers.ensureShapeIdExists(action.shapeId)
		if (!shapeId) return null
		action.shapeId = shapeId

		// Make sure the x and y values are numbers
		const floatX = helpers.ensureValueIsNumber(action.x)
		const floatY = helpers.ensureValueIsNumber(action.y)
		if (floatX === null || floatY === null) return null
		action.x = floatX
		action.y = floatY

		return action
	}

	override applyAction(action: Streaming<MoveAction>, helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return
		const { editor } = this.agent

		// Translate the position back to the chat's position
		const { x, y } = helpers.removeOffsetFromVec({ x: action.x, y: action.y })

		const shapeId = `shape:${action.shapeId}` as TLShapeId
		const shape = editor.getShape(shapeId)
		if (!shape) return

		const shapeBounds = editor.getShapePageBounds(shapeId)
		if (!shapeBounds) return

		const moveTarget = new Vec(x, y)
		const shapeOrigin = new Vec(shape.x, shape.y)
		const shapeBoundsOrigin = new Vec(shapeBounds.minX, shapeBounds.minY)

		const shapeOriginDelta = shapeOrigin.sub(shapeBoundsOrigin)
		const newTarget = moveTarget.add(shapeOriginDelta)

		editor.updateShape({
			id: shapeId,
			type: shape.type,
			x: newTarget.x,
			y: newTarget.y,
		})

		this.agent.moveToPosition({
			x: newTarget.x,
			y: newTarget.y,
		})
	}
}
