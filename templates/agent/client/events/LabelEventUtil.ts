import { TLShapeId, toRichText } from 'tldraw'
import { IAgentLabelEvent } from '../../worker/prompt/AgentEvent'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

export class LabelEventUtil extends AgentEventUtil<IAgentLabelEvent> {
	static override type = 'label' as const

	override getIcon() {
		return 'pencil' as const
	}

	override getDescription(event: Streaming<IAgentLabelEvent>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IAgentLabelEvent>, transform: AgentTransform) {
		if (!event.complete) return event

		const shapeId = transform.ensureShapeIdIsReal(event.shapeId)
		if (!shapeId) return null

		event.shapeId = shapeId
		return event
	}

	override applyEvent(event: Streaming<IAgentLabelEvent>) {
		if (!event.complete) return
		const { editor } = this

		const shapeId = `shape:${event.shapeId}` as TLShapeId
		const shape = editor.getShape(shapeId)
		if (!shape) return
		editor.updateShape({
			id: shapeId,
			type: shape.type,
			props: { richText: toRichText(event.text ?? '') },
		})
	}
}
