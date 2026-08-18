import { TLShapeId, Vec } from 'tldraw'
import { MoveAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const MoveActionUtil = registerActionUtil(
	class MoveActionUtil extends AgentActionUtil<MoveAction> {
		static override type = 'move' as const

		override getInfo(action: Streaming<MoveAction>) {
			return {
				icon: 'cursor' as const,
				description: action.intent ?? '',
			}
		}

		override sanitizeAction(action: Streaming<MoveAction>, helpers: AgentHelpers) {
			if (!action.complete) return action

			const shapeId = helpers.ensureShapeIdExists(action.shapeId)
			if (!shapeId) return null
			action.shapeId = shapeId

			const floatX = helpers.ensureValueIsNumber(action.x)
			const floatY = helpers.ensureValueIsNumber(action.y)
			if (floatX === null || floatY === null) return null
			action.x = floatX
			action.y = floatY

			return action
		}

		override applyAction(action: Streaming<MoveAction>, helpers: AgentHelpers) {
			if (!action.complete) return
			const { editor } = this

			// Translate the position back to the chat's position
			const moveTarget = Vec.From(helpers.removeOffsetFromVec({ x: action.x, y: action.y }))

			const shapeId = `shape:${action.shapeId}` as TLShapeId
			const shape = editor.getShape(shapeId)
			if (!shape) return

			const shapeBounds = editor.getShapePageBounds(shapeId)
			if (!shapeBounds) return

			// The target is where the anchor point should end up, so shift back to the bounds
			// origin, then from the bounds origin to the shape origin.
			const [anchorX, anchorY] = ANCHOR_OFFSETS[action.anchor]
			const anchorOffset = new Vec(shapeBounds.w * anchorX, shapeBounds.h * anchorY)
			const shapeOriginDelta = new Vec(shape.x, shape.y).sub(shapeBounds.point)
			const newTarget = moveTarget.sub(anchorOffset).add(shapeOriginDelta)

			editor.updateShape({
				id: shapeId,
				type: shape.type,
				x: newTarget.x,
				y: newTarget.y,
			})
		}
	}
)

// Anchor position as a fraction of the shape's bounds
const ANCHOR_OFFSETS: Record<MoveAction['anchor'], [number, number]> = {
	'top-left': [0, 0],
	'top-center': [0.5, 0],
	'top-right': [1, 0],
	'center-left': [0, 0.5],
	center: [0.5, 0.5],
	'center-right': [1, 0.5],
	'bottom-left': [0, 1],
	'bottom-center': [0.5, 1],
	'bottom-right': [1, 1],
}
