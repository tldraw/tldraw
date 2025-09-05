import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentRequestTransform } from '../AgentRequestTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const AlignAction = z
	.object({
		_type: z.literal('align'),
		alignment: z.enum(['top', 'bottom', 'left', 'right', 'center-horizontal', 'center-vertical']),
		gap: z.number(),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({ title: 'Align', description: 'The AI aligns shapes to each other on an axis.' })

type IAlignAction = z.infer<typeof AlignAction>

export class AlignActionUtil extends AgentActionUtil<IAlignAction> {
	static override type = 'align' as const

	override getSchema() {
		return AlignAction
	}

	override getInfo(action: Streaming<IAlignAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override transformAction(action: Streaming<IAlignAction>, transform: AgentRequestTransform) {
		action.shapeIds = transform.ensureShapeIdsAreReal(action.shapeIds ?? [])
		return action
	}

	override applyAction(action: Streaming<IAlignAction>, transform: AgentRequestTransform) {
		if (!action.complete) return
		const { editor } = transform

		editor.alignShapes(
			action.shapeIds.map((id) => `shape:${id}` as TLShapeId),
			action.alignment
		)
	}
}
