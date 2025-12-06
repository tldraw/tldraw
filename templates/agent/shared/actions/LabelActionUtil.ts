import { TLRichText, TLShape, TLShapeId, toRichText } from 'tldraw'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import { SimpleShapeIdSchema } from '../types/ids-schema'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const LabelAction = z
	.object({
		_type: z.literal('label'),
		intent: z.string(),
		shapeId: SimpleShapeIdSchema,
		text: z.string(),
	})
	.meta({ title: 'Label', description: "The AI changes a shape's text." })

type ILabelEvent = z.infer<typeof LabelAction>

type ShapeWithRichText = Extract<TLShape, { props: { richText: TLRichText } }>

function isShapeWithRichText(shape: TLShape | null | undefined): shape is ShapeWithRichText {
	return !!(shape && 'richText' in shape.props)
}

function assertShapeWithRichText(
	shape: TLShape | null | undefined
): asserts shape is ShapeWithRichText {
	if (!isShapeWithRichText(shape)) {
		throw new Error('Shape is not a valid ShapeWithRichText')
	}
}

export class LabelActionUtil extends AgentActionUtil<ILabelEvent> {
	static override type = 'label' as const

	override getSchema() {
		return LabelAction
	}

	override getInfo(action: Streaming<ILabelEvent>) {
		return {
			icon: 'pencil' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<ILabelEvent>, helpers: AgentHelpers) {
		if (!action.complete) return action

		const shapeId = helpers.ensureShapeIdExists(action.shapeId)
		if (!shapeId || !this.agent?.editor) {
			return null
		}
		const shape = this.agent.editor.getShape(`shape:${shapeId}` as TLShapeId)
		if (!shape) {
			return null
		}
		if (!isShapeWithRichText(shape)) {
			console.warn(`Shape type "${shape.type}" does not support richText labels`)
			return null
		}
		action.shapeId = shapeId
		return action
	}

	override applyAction(action: Streaming<ILabelEvent>) {
		if (!action.complete) return
		if (!this.agent) return
		const { editor } = this.agent

		const shapeId = `shape:${action.shapeId}` as TLShapeId
		const shape = editor.getShape(shapeId)
		assertShapeWithRichText(shape)

		editor.updateShape({
			id: shapeId,
			type: shape.type,
			props: { richText: toRichText(action.text ?? '') },
		})
	}
}
