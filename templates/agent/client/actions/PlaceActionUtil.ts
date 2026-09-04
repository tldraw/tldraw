import { TLShapeId } from 'tldraw'
import { PlaceAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const PlaceActionUtil = registerActionUtil(
	class PlaceActionUtil extends AgentActionUtil<PlaceAction> {
		static override type = 'place' as const

		override getInfo(action: Streaming<PlaceAction>) {
			return {
				icon: 'target' as const,
				description: action.intent ?? '',
			}
		}

		override sanitizeAction(action: Streaming<PlaceAction>, helpers: AgentHelpers) {
			if (!action.complete) return action

			const shapeId = helpers.ensureShapeIdExists(action.shapeId)
			if (!shapeId) return null
			action.shapeId = shapeId

			const referenceShapeId = helpers.ensureShapeIdExists(action.referenceShapeId)
			if (!referenceShapeId) return null
			action.referenceShapeId = referenceShapeId

			return action
		}

		override applyAction(action: Streaming<PlaceAction>) {
			if (!action.complete) return
			const { editor } = this

			const { side, sideOffset = 0, align, alignOffset = 0 } = action
			const referenceShapeId = `shape:${action.referenceShapeId}` as TLShapeId
			const shapeId = `shape:${action.shapeId}` as TLShapeId

			const shape = editor.getShape(shapeId)
			const referenceShape = editor.getShape(referenceShapeId)
			if (!shape || !referenceShape) return

			const bbA = editor.getShapePageBounds(shape)!
			const bbR = editor.getShapePageBounds(referenceShape)!

			// Position along the reference shape's edge, in the axis parallel to that edge
			const alignX = alignAlong(align, bbR.minX, bbR.midX, bbR.maxX, bbA.width, alignOffset)
			const alignY = alignAlong(align, bbR.minY, bbR.midY, bbR.maxY, bbA.height, alignOffset)

			const position = {
				top: { x: alignX, y: bbR.minY - bbA.height - sideOffset },
				bottom: { x: alignX, y: bbR.maxY + sideOffset },
				left: { x: bbR.minX - bbA.width - sideOffset, y: alignY },
				right: { x: bbR.maxX + sideOffset, y: alignY },
			}[side]
			if (!position) return

			editor.updateShape({ id: shapeId, type: shape.type, ...position })
		}
	}
)

function alignAlong(
	align: PlaceAction['align'],
	min: number,
	mid: number,
	max: number,
	size: number,
	offset: number
) {
	switch (align) {
		case 'start':
			return min + offset
		case 'center':
			return mid - size / 2 + offset
		case 'end':
			return max - size - offset
	}
}
