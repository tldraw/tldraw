import { TLShapeId } from 'tldraw'
import { IAgentDistributeEvent } from '../../worker/prompt/AgentEvent'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

export class DistributeEventUtil extends AgentEventUtil<IAgentDistributeEvent> {
	static override type = 'distribute' as const

	override getIcon() {
		return 'cursor' as const
	}

	override getDescription(event: Streaming<IAgentDistributeEvent>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IAgentDistributeEvent>, transform: AgentTransform) {
		if (!event.complete) return event

		event.shapeIds = transform.sanitizeExistingShapeIds(event.shapeIds)

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
