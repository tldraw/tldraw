import { TLShapeId } from 'tldraw'
import { IAgentDeleteEvent } from '../../worker/prompt/AgentEvent'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

export class DeleteEventUtil extends AgentEventUtil<IAgentDeleteEvent> {
	static override type = 'delete' as const

	override getIcon() {
		return 'trash' as const
	}

	override getDescription(event: Streaming<IAgentDeleteEvent>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IAgentDeleteEvent>, transform: AgentTransform) {
		if (!event.complete) return event

		const shapeId = transform.sanitizeExistingShapeId(event.shapeId)
		if (!shapeId) return null

		event.shapeId = shapeId
		return event
	}

	override applyEvent(event: Streaming<IAgentDeleteEvent>) {
		if (!event.complete) return
		const { editor } = this

		editor.deleteShape(`shape:${event.shapeId}` as TLShapeId)
	}
}
