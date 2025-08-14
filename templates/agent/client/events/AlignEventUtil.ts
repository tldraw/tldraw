import { TLShapeId } from 'tldraw'
import { IAgentAlignEvent } from '../../worker/prompt/AgentEvent'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

export class AlignEventUtil extends AgentEventUtil<IAgentAlignEvent> {
	static override type = 'align' as const

	override getIcon() {
		return 'cursor' as const
	}

	override getDescription(event: Streaming<IAgentAlignEvent>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IAgentAlignEvent>, transform: AgentTransform) {
		if (!event.complete) return event
		event.shapeIds = transform.ensureShapeIdsAreReal(event.shapeIds)
		return event
	}

	override applyEvent(event: Streaming<IAgentAlignEvent>) {
		if (!event.complete) return
		const { editor } = this

		editor.alignShapes(
			event.shapeIds.map((id) => `shape:${id}` as TLShapeId),
			event.alignment
		)
	}
}
