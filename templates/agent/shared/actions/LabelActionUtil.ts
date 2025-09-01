import { TLShapeId, toRichText } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const LabelAction = z
	.object({
		_type: z.literal('label'),
		intent: z.string(),
		shapeId: z.string(),
		text: z.string(),
	})
	.meta({ title: 'Label', description: "The AI changes a shape's text." })

type IAgentLabelEvent = z.infer<typeof LabelAction>

export class LabelActionUtil extends AgentActionUtil<IAgentLabelEvent> {
	static override type = 'label' as const

	override getSchema() {
		return LabelAction
	}

	override getInfo(action: Streaming<IAgentLabelEvent>) {
		return {
			icon: 'pencil' as const,
			description: action.intent ?? '',
		}
	}

	override transformAction(action: Streaming<IAgentLabelEvent>, transform: AgentTransform) {
		if (!action.complete) return action

		const shapeId = transform.ensureShapeIdIsReal(action.shapeId)
		if (!shapeId) return null

		action.shapeId = shapeId
		return action
	}

	override applyAction(action: Streaming<IAgentLabelEvent>, transform: AgentTransform) {
		if (!action.complete) return
		const { editor } = transform

		const shapeId = `shape:${action.shapeId}` as TLShapeId
		const shape = editor.getShape(shapeId)
		if (!shape) return
		editor.updateShape({
			id: shapeId,
			type: shape.type,
			props: { richText: toRichText(action.text ?? '') },
		})
	}
}
