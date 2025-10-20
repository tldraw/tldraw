import { AgentHelpers, LabelAction, Streaming } from '@tldraw/fairy-shared'
import { TLShapeId, toRichText } from 'tldraw'
import { AgentActionUtil } from './AgentActionUtil'

export class LabelActionUtil extends AgentActionUtil<LabelAction> {
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

		action.shapeId = shapeId
		return action
	}

	override applyAction(action: Streaming<LabelAction>) {
		if (!action.complete) return
		if (!this.agent) return
		const { editor } = this.agent

		const shapeId = `shape:${action.shapeId}` as TLShapeId
		const shape = editor.getShape(shapeId)
		if (!shape) return
		editor.updateShape({
			id: shapeId,
			type: shape.type,
			props: { richText: toRichText(action.text ?? '') },
		})

		this.agent.moveToPosition({
			x: shape.x,
			y: shape.y,
		})
	}
}
