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
			const { editor } = this

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

			// Calculate the offset from the shape bounds origin to the shape origin
			const shapeOriginDelta = shapeOrigin.sub(shapeBoundsOrigin)

			// Adjust the target position based on the anchor point
			const boundsWidth = shapeBounds.w
			const boundsHeight = shapeBounds.h

			// Calculate the anchor point offset from the bounds origin
			let anchorOffsetX = 0
			let anchorOffsetY = 0

			switch (action.anchor) {
				case 'top-left': {
					anchorOffsetX = 0
					anchorOffsetY = 0
					break
				}
				case 'top-center': {
					anchorOffsetX = boundsWidth / 2
					anchorOffsetY = 0
					break
				}
				case 'top-right': {
					anchorOffsetX = boundsWidth
					anchorOffsetY = 0
					break
				}
				case 'bottom-left': {
					anchorOffsetX = 0
					anchorOffsetY = boundsHeight
					break
				}
				case 'bottom-center': {
					anchorOffsetX = boundsWidth / 2
					anchorOffsetY = boundsHeight
					break
				}
				case 'bottom-right': {
					anchorOffsetX = boundsWidth
					anchorOffsetY = boundsHeight
					break
				}
				case 'center-left': {
					anchorOffsetX = 0
					anchorOffsetY = boundsHeight / 2
					break
				}
				case 'center-right': {
					anchorOffsetX = boundsWidth
					anchorOffsetY = boundsHeight / 2
					break
				}
				case 'center': {
					anchorOffsetX = boundsWidth / 2
					anchorOffsetY = boundsHeight / 2
					break
				}
			}

			// Adjust the target to account for the anchor point
			// The target x,y should be where the anchor point is positioned
			// So we subtract the anchor offset to get the bounds origin position
			const adjustedTarget = moveTarget.sub(new Vec(anchorOffsetX, anchorOffsetY))

			const newTarget = adjustedTarget.add(shapeOriginDelta)

			editor.updateShape({
				id: shapeId,
				type: shape.type,
				x: newTarget.x,
				y: newTarget.y,
			})
		}
	}
)
