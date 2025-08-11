import { TLShapeId } from 'tldraw'
import { IAgentDeleteEvent } from '../../worker/prompt/AgentEvent'
import { Streaming } from '../types/Streaming'
import { AgentEventHandler } from './AgentEventHandler'

export class DeleteEventHandler extends AgentEventHandler<IAgentDeleteEvent> {
	static override type = 'delete' as const

	override transformEvent(event: Streaming<IAgentDeleteEvent>) {
		if (!event.complete) return event

		const shapeId = this.transform.sanitizeExistingShapeId(event.shapeId)
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
