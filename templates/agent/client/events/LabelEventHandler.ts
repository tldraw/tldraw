import { TLShapeId } from 'tldraw'
import { IAgentLabelEvent } from '../../worker/prompt/AgentEvent'
import { asRichText } from '../transforms/SimpleText'
import { Streaming } from '../types/Streaming'
import { AgentEventHandler } from './AgentEventHandler'

export class LabelEventHandler extends AgentEventHandler<IAgentLabelEvent> {
	static override type = 'label' as const

	override transformEvent(event: Streaming<IAgentLabelEvent>) {
		if (!event.complete) return event

		const shapeId = this.transform.sanitizeExistingShapeId(event.shapeId)
		if (!shapeId) return null

		event.shapeId = shapeId
		return event
	}

	override applyEvent(event: Streaming<IAgentLabelEvent>) {
		if (!event.complete) return
		const { editor } = this

		const shape = editor.getShape(`shape:${event.shapeId}` as TLShapeId)
		if (!shape) return
		editor.updateShape({
			id: event.shapeId as TLShapeId,
			type: shape.type,
			props: { richText: asRichText(event.text ?? '') },
		})
	}
}
