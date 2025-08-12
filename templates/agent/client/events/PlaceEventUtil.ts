import { TLShapeId } from 'tldraw'
import { IAgentPlaceEvent } from '../../worker/prompt/AgentEvent'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

export class PlaceEventUtil extends AgentEventUtil<IAgentPlaceEvent> {
	static override type = 'place' as const

	override getIcon() {
		return 'target' as const
	}

	override getDescription(event: Streaming<IAgentPlaceEvent>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IAgentPlaceEvent>, transform: AgentTransform) {
		if (!event.complete) return event

		const shapeId = transform.sanitizeExistingShapeId(event.shapeId)
		if (!shapeId) return null

		event.shapeId = shapeId

		return event
	}

	override applyEvent(event: Streaming<IAgentPlaceEvent>) {
		if (!event.complete) return
		const { editor } = this

		const { referenceShapeId, side, sideOffset = 0, align, alignOffset = 0 } = event
		const shapeId = `shape:${event.shapeId}` as TLShapeId

		if (!referenceShapeId) return
		const shape = editor.getShape(shapeId)
		if (!shape) return
		const referenceShape = editor.getShape(referenceShapeId as TLShapeId)
		if (!referenceShape) return
		const bbA = editor.getShapePageBounds(shape.id)!
		const bbR = editor.getShapePageBounds(referenceShape.id)!
		if (side === 'top' && align === 'start') {
			editor.updateShape({
				id: shape.id,
				type: shape.type,
				x: bbR.minX + alignOffset,
				y: bbR.minY - bbA.height - sideOffset,
			})
		} else if (side === 'top' && align === 'center') {
			editor.updateShape({
				id: shape.id,
				type: shape.type,
				x: bbR.midX - bbA.width / 2 + alignOffset,
				y: bbR.minY - bbA.height - sideOffset,
			})
		} else if (side === 'top' && align === 'end') {
			editor.updateShape({
				id: shape.id,
				type: shape.type,
				x: bbR.maxX - bbA.width - alignOffset,
				y: bbR.minY - bbA.height - sideOffset,
			})
		} else if (side === 'bottom' && align === 'start') {
			editor.updateShape({
				id: shape.id,
				type: shape.type,
				x: bbR.minX + alignOffset,
				y: bbR.maxY + sideOffset,
			})
		} else if (side === 'bottom' && align === 'center') {
			editor.updateShape({
				id: shape.id,
				type: shape.type,
				x: bbR.midX - bbA.width / 2 + alignOffset,
				y: bbR.maxY + sideOffset,
			})
		} else if (side === 'bottom' && align === 'end') {
			editor.updateShape({
				id: shape.id,
				type: shape.type,
				x: bbR.maxX - bbA.width - alignOffset,
				y: bbR.maxY + sideOffset,
			})
			// LEFT SIDE (corrected)
		} else if (side === 'left' && align === 'start') {
			editor.updateShape({
				id: shape.id,
				type: shape.type,
				x: bbR.minX - bbA.width - sideOffset,
				y: bbR.minY + alignOffset,
			})
		} else if (side === 'left' && align === 'center') {
			editor.updateShape({
				id: shape.id,
				type: shape.type,
				x: bbR.minX - bbA.width - sideOffset,
				y: bbR.midY - bbA.height / 2 + alignOffset,
			})
		} else if (side === 'left' && align === 'end') {
			editor.updateShape({
				id: shape.id,
				type: shape.type,
				x: bbR.minX - bbA.width - sideOffset,
				y: bbR.maxY - bbA.height - alignOffset,
			})
			// RIGHT SIDE (corrected)
		} else if (side === 'right' && align === 'start') {
			editor.updateShape({
				id: shape.id,
				type: shape.type,
				x: bbR.maxX + sideOffset,
				y: bbR.minY + alignOffset,
			})
		} else if (side === 'right' && align === 'center') {
			editor.updateShape({
				id: shape.id,
				type: shape.type,
				x: bbR.maxX + sideOffset,
				y: bbR.midY - bbA.height / 2 + alignOffset,
			})
		} else if (side === 'right' && align === 'end') {
			editor.updateShape({
				id: shape.id,
				type: shape.type,
				x: bbR.maxX + sideOffset,
				y: bbR.maxY - bbA.height - alignOffset,
			})
		}
	}
}
