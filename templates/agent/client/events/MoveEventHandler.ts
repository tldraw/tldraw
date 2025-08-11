import { TLShapeId } from 'tldraw'
import { IAgentMoveEvent } from '../../worker/prompt/AgentEvent'
import { Streaming } from '../types/Streaming'
import { AgentEventHandler } from './AgentEventHandler'

export class MoveEventHandler extends AgentEventHandler<IAgentMoveEvent> {
	static override type = 'move' as const

	override transformEvent(event: Streaming<IAgentMoveEvent>) {
		if (!event.complete) return event

		const shapeId = this.transform.sanitizeExistingShapeId(event.shapeId)
		if (!shapeId) return null

		event.shapeId = shapeId
		return event
	}

	override applyEvent(event: Streaming<IAgentMoveEvent>) {
		if (!event.complete) return
		const { editor } = this

		const shape = editor.getShape(`shape:${event.shapeId}` as TLShapeId)
		if (!shape) return
		editor.updateShape({
			id: event.shapeId as TLShapeId,
			type: shape.type,
			x: event.x,
			y: event.y,
		})
	}
}
