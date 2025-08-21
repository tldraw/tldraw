import { TLShapeId, toRichText } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const AgentLabelEvent = z
	.object({
		_type: z.literal('label'),
		intent: z.string(),
		shapeId: z.string(),
		text: z.string(),
	})
	.meta({ title: 'Label', description: "The AI changes a shape's text." })

type IAgentLabelEvent = z.infer<typeof AgentLabelEvent>

export class LabelActionUtil extends AgentActionUtil<IAgentLabelEvent> {
	static override type = 'label' as const

	override getSchema() {
		return AgentLabelEvent
	}

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

	override applyEvent(event: Streaming<IAgentLabelEvent>, transform: AgentTransform) {
		if (!event.complete) return
		const { editor } = transform

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
