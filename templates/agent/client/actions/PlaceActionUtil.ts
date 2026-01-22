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
			if (side === 'top' && align === 'start') {
				editor.updateShape({
					id: shapeId,
					type: shape.type,
					x: bbR.minX + alignOffset,
					y: bbR.minY - bbA.height - sideOffset,
				})
			} else if (side === 'top' && align === 'center') {
				editor.updateShape({
					id: shapeId,
					type: shape.type,
					x: bbR.midX - bbA.width / 2 + alignOffset,
					y: bbR.minY - bbA.height - sideOffset,
				})
			} else if (side === 'top' && align === 'end') {
				editor.updateShape({
					id: shapeId,
					type: shape.type,
					x: bbR.maxX - bbA.width - alignOffset,
					y: bbR.minY - bbA.height - sideOffset,
				})
			} else if (side === 'bottom' && align === 'start') {
				editor.updateShape({
					id: shapeId,
					type: shape.type,
					x: bbR.minX + alignOffset,
					y: bbR.maxY + sideOffset,
				})
			} else if (side === 'bottom' && align === 'center') {
				editor.updateShape({
					id: shapeId,
					type: shape.type,
					x: bbR.midX - bbA.width / 2 + alignOffset,
					y: bbR.maxY + sideOffset,
				})
			} else if (side === 'bottom' && align === 'end') {
				editor.updateShape({
					id: shapeId,
					type: shape.type,
					x: bbR.maxX - bbA.width - alignOffset,
					y: bbR.maxY + sideOffset,
				})
				// LEFT SIDE (corrected)
			} else if (side === 'left' && align === 'start') {
				editor.updateShape({
					id: shapeId,
					type: shape.type,
					x: bbR.minX - bbA.width - sideOffset,
					y: bbR.minY + alignOffset,
				})
			} else if (side === 'left' && align === 'center') {
				editor.updateShape({
					id: shapeId,
					type: shape.type,
					x: bbR.minX - bbA.width - sideOffset,
					y: bbR.midY - bbA.height / 2 + alignOffset,
				})
			} else if (side === 'left' && align === 'end') {
				editor.updateShape({
					id: shapeId,
					type: shape.type,
					x: bbR.minX - bbA.width - sideOffset,
					y: bbR.maxY - bbA.height - alignOffset,
				})
				// RIGHT SIDE (corrected)
			} else if (side === 'right' && align === 'start') {
				editor.updateShape({
					id: shapeId,
					type: shape.type,
					x: bbR.maxX + sideOffset,
					y: bbR.minY + alignOffset,
				})
			} else if (side === 'right' && align === 'center') {
				editor.updateShape({
					id: shapeId,
					type: shape.type,
					x: bbR.maxX + sideOffset,
					y: bbR.midY - bbA.height / 2 + alignOffset,
				})
			} else if (side === 'right' && align === 'end') {
				editor.updateShape({
					id: shapeId,
					type: shape.type,
					x: bbR.maxX + sideOffset,
					y: bbR.maxY - bbA.height - alignOffset,
				})
			}
		}
	}
)
