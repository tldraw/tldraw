import { assert, TLRichText, TLShape, TLShapeId, toRichText } from 'tldraw'
import { LabelAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

type ShapeWithRichText = Extract<TLShape, { props: { richText: TLRichText } }>

function isShapeWithRichText(shape: TLShape | null | undefined): shape is ShapeWithRichText {
	return !!(shape && 'richText' in shape.props)
}

export const LabelActionUtil = registerActionUtil(
	class LabelActionUtil extends AgentActionUtil<LabelAction> {
		static override type = 'label' as const

		override getInfo(action: Streaming<LabelAction>) {
			return {
				icon: 'pencil' as const,
				description: action.intent ?? '',
			}
		}

		override sanitizeAction(action: Streaming<LabelAction>, helpers: AgentHelpers) {
			if (!action.complete) return action

			const shapeId = helpers.ensureShapeIdExists(action.shapeId)
			if (!shapeId) return null
			const shape = this.editor.getShape(`shape:${shapeId}` as TLShapeId)
			if (!shape) return null
			if (!isShapeWithRichText(shape)) {
				console.warn(`Shape type "${shape.type}" does not support richText labels`)
				return null
			}
			action.shapeId = shapeId
			return action
		}

		override applyAction(action: Streaming<LabelAction>) {
			if (!action.complete) return
			const { editor } = this

			const shapeId = `shape:${action.shapeId}` as TLShapeId
			const shape = editor.getShape(shapeId)
			assert(isShapeWithRichText(shape), 'Shape is not a valid ShapeWithRichText')

			editor.updateShape({
				id: shapeId,
				type: shape.type,
				props: { richText: toRichText(action.text ?? '') },
			})
		}
	}
)
