import { TLShapeId } from 'tldraw'
import z from 'zod'
import { TldrawAgent } from '../../client/agent/TldrawAgent'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const ResizeAction = z
	.object({
		_type: z.literal('resize'),
		centerX: z.number(),
		centerY: z.number(),
		intent: z.string(),
		scaleX: z.number(),
		scaleY: z.number(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Resize',
		description: 'The AI resizes one or more shapes around a center point.',
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

	override transformAction(action: Streaming<IResizeAction>, transform: AgentTransform) {
		const shapeIds = transform.ensureShapeIdsAreReal(action.shapeIds ?? [])
		if (shapeIds.length === 0) return null

		action.shapeIds = shapeIds
		return action
	}

	override applyAction(action: Streaming<IResizeAction>, agent: TldrawAgent) {
		const { editor } = agent

		if (
			!action.shapeIds ||
			!action.scaleX ||
			!action.scaleY ||
			!action.centerX ||
			!action.centerY
		) {
			return
		}

		const shapeIds = action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId)

		for (const shapeId of shapeIds) {
			editor.resizeShape(
				shapeId,
				{ x: action.scaleX, y: action.scaleY },
				{
					scaleOrigin: { x: action.centerX, y: action.centerY },
				}
			)
		}
	}
}
