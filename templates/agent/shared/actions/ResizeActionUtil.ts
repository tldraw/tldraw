import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentRequestTransform } from '../AgentRequestTransform'
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

type IResizeAction = z.infer<typeof ResizeAction>

export class ResizeActionUtil extends AgentActionUtil<IResizeAction> {
	static override type = 'resize' as const

	override getSchema() {
		return ResizeAction
	}

	override getInfo(action: Streaming<IResizeAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override transformAction(action: Streaming<IResizeAction>, transform: AgentRequestTransform) {
		const shapeIds = transform.ensureShapeIdsAreReal(action.shapeIds ?? [])
		if (shapeIds.length === 0) return null

		action.shapeIds = shapeIds
		return action
	}

	override applyAction(action: Streaming<IResizeAction>, transform: AgentRequestTransform) {
		const { editor } = transform

		if (
			!action.shapeIds ||
			!action.scaleX ||
			!action.scaleY ||
			!action.originX ||
			!action.originY
		) {
			return
		}

		const origin = transform.removeOffsetFromVec({ x: action.originX, y: action.originY })
		const shapeIds = action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId)

		for (const shapeId of shapeIds) {
			editor.resizeShape(shapeId, { x: action.scaleX, y: action.scaleY }, { scaleOrigin: origin })
		}
	}
}
