import { TLShapeId } from 'tldraw'
import { IAgentDistributeEvent } from '../../worker/prompt/AgentEvent'
import { Streaming } from '../types/Streaming'
import { AgentEventHandler } from './AgentEventHandler'

export class DistributeEventHandler extends AgentEventHandler<IAgentDistributeEvent> {
	static override type = 'distribute' as const

	override transformEvent(event: Streaming<IAgentDistributeEvent>) {
		if (!event.complete) return event

		event.shapeIds = this.transform.sanitizeExistingShapeIds(event.shapeIds)

		return event
	}

	override applyEvent(event: Streaming<IAgentDistributeEvent>) {
		if (!event.complete) return
		const { editor } = this

		editor.distributeShapes(
			event.shapeIds.map((id) => `shape:${id}` as TLShapeId),
			event.direction
		)
	}
}
