import { TLShapeId } from 'tldraw'
import { IAgentMoveEvent } from '../../worker/prompt/AgentEvent'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

export class MoveEventUtil extends AgentEventUtil<IAgentMoveEvent> {
	static override type = 'move' as const

	override getIcon() {
		return 'cursor' as const
	}

	override getDescription(event: Streaming<IAgentMoveEvent>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IAgentMoveEvent>, transform: AgentTransform) {
		if (!event.complete) return event

		const shapeId = transform.sanitizeExistingShapeId(event.shapeId)
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
