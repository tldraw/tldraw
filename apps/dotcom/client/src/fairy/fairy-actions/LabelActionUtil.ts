import { LabelAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { ExtractShapeByProps, TLRichText, TLShape, TLShapeId, toRichText } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

type ShapeWithRichText = ExtractShapeByProps<{ richText: TLRichText }>

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

export class LabelActionUtil extends AgentActionUtil<LabelAction> {
	static override type = 'label' as const

	override getInfo(action: Streaming<LabelAction>) {
		return createAgentActionInfo({
			icon: 'pencil',
			description: action.intent ?? '',
			pose: 'working',
		})
	}

	override sanitizeAction(action: Streaming<LabelAction>, helpers: AgentHelpers) {
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

	override applyAction(action: Streaming<LabelAction>) {
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

		this.agent.position.moveTo({
			x: shape.x,
			y: shape.y,
		})
	}
}
