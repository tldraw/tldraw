import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
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

type AlignAction = z.infer<typeof AlignAction>

export class AlignActionUtil extends AgentActionUtil<AlignAction> {
	static override type = 'align' as const

	override getSchema() {
		return AlignAction
	}

	override getInfo(action: Streaming<AlignAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<AlignAction>, helpers: AgentHelpers) {
		action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
		return action
	}

	override applyAction(action: Streaming<AlignAction>) {
		if (!action.complete) return
		if (!this.agent) return

		this.agent.editor.alignShapes(
			action.shapeIds.map((id) => `shape:${id}` as TLShapeId),
			action.alignment
		)
	}
}
