import { PlaceAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { TLShapeId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class PlaceActionUtil extends AgentActionUtil<PlaceAction> {
	static override type = 'place' as const

	override getInfo(action: Streaming<PlaceAction>) {
		return createAgentActionInfo({
			icon: 'target',
			description: action.intent ?? '',
			pose: 'working',
		})
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
		if (!this.agent) return
		const { editor } = this.agent

		const { side, sideOffset = 0, align, alignOffset = 0 } = action
		const referenceShapeId = `shape:${action.referenceShapeId}` as TLShapeId
		const shapeId = `shape:${action.shapeId}` as TLShapeId

		const shape = editor.getShape(shapeId)
		const referenceShape = editor.getShape(referenceShapeId)
		if (!shape || !referenceShape) return

		const bbA = editor.getShapePageBounds(shape)!
		const bbR = editor.getShapePageBounds(referenceShape)!

		let x: number
		let y: number

		if (side === 'top' && align === 'start') {
			x = bbR.minX + alignOffset
			y = bbR.minY - bbA.height - sideOffset
		} else if (side === 'top' && align === 'center') {
			x = bbR.midX - bbA.width / 2 + alignOffset
			y = bbR.minY - bbA.height - sideOffset
		} else if (side === 'top' && align === 'end') {
			x = bbR.maxX - bbA.width - alignOffset
			y = bbR.minY - bbA.height - sideOffset
		} else if (side === 'bottom' && align === 'start') {
			x = bbR.minX + alignOffset
			y = bbR.maxY + sideOffset
		} else if (side === 'bottom' && align === 'center') {
			x = bbR.midX - bbA.width / 2 + alignOffset
			y = bbR.maxY + sideOffset
		} else if (side === 'bottom' && align === 'end') {
			x = bbR.maxX - bbA.width - alignOffset
			y = bbR.maxY + sideOffset
		} else if (side === 'left' && align === 'start') {
			x = bbR.minX - bbA.width - sideOffset
			y = bbR.minY + alignOffset
		} else if (side === 'left' && align === 'center') {
			x = bbR.minX - bbA.width - sideOffset
			y = bbR.midY - bbA.height / 2 + alignOffset
		} else if (side === 'left' && align === 'end') {
			x = bbR.minX - bbA.width - sideOffset
			y = bbR.maxY - bbA.height - alignOffset
		} else if (side === 'right' && align === 'start') {
			x = bbR.maxX + sideOffset
			y = bbR.minY + alignOffset
		} else if (side === 'right' && align === 'center') {
			x = bbR.maxX + sideOffset
			y = bbR.midY - bbA.height / 2 + alignOffset
		} else if (side === 'right' && align === 'end') {
			x = bbR.maxX + sideOffset
			y = bbR.maxY - bbA.height - alignOffset
		} else {
			return
		}

		editor.updateShape({
			id: shapeId,
			type: shape.type,
			x,
			y,
		})

		this.agent.position.moveTo({ x, y })
	}
}
