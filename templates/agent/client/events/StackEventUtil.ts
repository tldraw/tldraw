import { TLShapeId } from 'tldraw'
import { IAgentStackEvent } from '../../worker/prompt/AgentEvent'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

export class StackEventUtil extends AgentEventUtil<IAgentStackEvent> {
	static override type = 'stack' as const

	override getIcon() {
		return 'cursor' as const
	}

	override getDescription(event: Streaming<IAgentStackEvent>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IAgentStackEvent>, transform: AgentTransform) {
		if (!event.complete) return event

		event.shapeIds = transform.ensureShapeIdsAreReal(event.shapeIds)

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
