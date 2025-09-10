import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const BringToFrontAction = z
	.object({
		_type: z.literal('bringToFront'),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Bring to Front',
		description:
			'The AI brings one or more shapes to the front so that they appear in front of everything else.',
	})

type IBringToFrontAction = z.infer<typeof BringToFrontAction>

export class BringToFrontActionUtil extends AgentActionUtil<IBringToFrontAction> {
	static override type = 'bringToFront' as const

	override getSchema() {
		return BringToFrontAction
	}

	override getInfo(action: Streaming<IBringToFrontAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<IBringToFrontAction>, agentHelpers: AgentHelpers) {
		action.shapeIds = agentHelpers.ensureShapeIdsExist(action.shapeIds ?? [])
		return action
	}

	override applyAction(action: Streaming<IBringToFrontAction>, agentHelpers: AgentHelpers) {
		const { editor } = agentHelpers

		if (!action.shapeIds) return
		editor.bringToFront(action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId))
	}
}
