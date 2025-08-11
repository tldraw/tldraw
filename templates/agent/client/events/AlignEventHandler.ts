import { TLShapeId } from 'tldraw'
import { IAgentAlignEvent } from '../../worker/prompt/AgentEvent'
import { Streaming } from '../types/Streaming'
import { AgentEventHandler } from './AgentEventHandler'

export class AlignEventHandler extends AgentEventHandler<IAgentAlignEvent> {
	static override type = 'align' as const

	override transformEvent(event: Streaming<IAgentAlignEvent>) {
		if (!event.complete) return event

		event.shapeIds = this.transform.sanitizeExistingShapeIds(event.shapeIds)

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
