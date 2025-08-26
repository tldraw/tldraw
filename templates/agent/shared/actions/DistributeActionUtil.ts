import { TLShapeId } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const DistributeAction = z
	.object({
		_type: z.literal('distribute'),
		direction: z.enum(['horizontal', 'vertical']),
		intent: z.string(),
		shapeIds: z.array(z.string()),
	})
	.meta({
		title: 'Distribute',
		description: 'The AI distributes shapes horizontally or vertically.',
	})

type IDistributeAction = z.infer<typeof DistributeAction>

export class DistributeActionUtil extends AgentActionUtil<IDistributeAction> {
	static override type = 'distribute' as const

	override getSchema() {
		return DistributeAction
	}

	override getIcon() {
		return 'cursor' as const
	}

	override getDescription(event: Streaming<IDistributeAction>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IDistributeAction>, transform: AgentTransform) {
		event.shapeIds = transform.ensureShapeIdsAreReal(event.shapeIds ?? [])
		return event
	}

	override applyEvent(event: Streaming<IDistributeAction>, transform: AgentTransform) {
		if (!event.complete) return
		const { editor } = transform

		editor.distributeShapes(
			event.shapeIds.map((id) => `shape:${id}` as TLShapeId),
			event.direction
		)
	}
}
