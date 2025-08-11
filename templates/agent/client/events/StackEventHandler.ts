import { TLShapeId } from 'tldraw'
import { IAgentStackEvent } from '../../worker/prompt/AgentEvent'
import { Streaming } from '../types/Streaming'
import { AgentEventHandler } from './AgentEventHandler'

export class StackEventHandler extends AgentEventHandler<IAgentStackEvent> {
	static override type = 'stack' as const

	override transformEvent(event: Streaming<IAgentStackEvent>) {
		if (!event.complete) return event

		event.shapeIds = this.transform.sanitizeExistingShapeIds(event.shapeIds)

		return event
	}

	override applyEvent(event: Streaming<IAgentStackEvent>) {
		if (!event.complete) return
		const { editor } = this

		editor.stackShapes(
			event.shapeIds.map((id) => `shape:${id}` as TLShapeId),
			event.direction,
			Math.min(event.gap, 1)
		)
	}
}
