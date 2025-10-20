import { TLShapeId } from '@tldraw/editor'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil, AgentActionUtilConstructor } from './AgentActionUtil'

const SendToBackAction = z
	.object({
		_type: z.literal('send-to-back'),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Send to Back',
		description:
			'The fairy sends one or more shapes to the back so that they appear behind everything else.',
	})

type SendToBackAction = z.infer<typeof SendToBackAction>

export class SendToBackActionUtil extends AgentActionUtil<SendToBackAction> {
	static override type = 'send-to-back' as const

	override getSchema(actions: AgentActionUtilConstructor['type'][]) {
		if (!actions.includes('send-to-back')) {
			return null
		}
		return SendToBackAction
	}

	override getInfo(action: Streaming<SendToBackAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<SendToBackAction>, helpers: AgentHelpers) {
		action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
		return action
	}

	override applyAction(action: Streaming<SendToBackAction>) {
		if (!this.agent) return

		if (!action.shapeIds) return

		const shapeIds = action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId)
		this.agent.editor.sendToBack(shapeIds)

		const bounds = this.agent.editor.getShapesPageBounds(shapeIds)

		if (!bounds) {
			return
		}

		this.agent.moveToPosition(bounds.center)
	}
}
