import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const ResizeAction = z
	.object({
		_type: z.literal('resize'),
		intent: z.string(),
		originX: z.number(),
		originY: z.number(),
		scaleX: z.number(),
		scaleY: z.number(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Resize',
		description:
			'The AI resizes one or more shapes, with the resize operation being performed relative to an origin point.',
	})

type ResizeAction = z.infer<typeof ResizeAction>

export class ResizeActionUtil extends AgentActionUtil<ResizeAction> {
	static override type = 'resize' as const

	override getSchema() {
		return ResizeAction
	}

	override getInfo(action: Streaming<ResizeAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<ResizeAction>, helpers: AgentHelpers) {
		const shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
		if (shapeIds.length === 0) return null

		action.shapeIds = shapeIds
		return action
	}

	override applyAction(action: Streaming<ResizeAction>, helpers: AgentHelpers) {
		if (!this.agent) return

		if (
			!action.shapeIds ||
			!action.scaleX ||
			!action.scaleY ||
			!action.originX ||
			!action.originY
		) {
			return
		}

		const origin = helpers.removeOffsetFromVec({ x: action.originX, y: action.originY })
		const shapeIds = action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId)

		for (const shapeId of shapeIds) {
			this.agent.editor.resizeShape(
				shapeId,
				{ x: action.scaleX, y: action.scaleY },
				{ scaleOrigin: origin }
			)
		}
	}
}
