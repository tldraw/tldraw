import z from 'zod'
import { AgentRequestTransform } from '../AgentRequestTransform'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const CountShapesAction = z
	.object({
		_type: z.literal('count'),
		expression: z.string(),
	})
	.meta({
		title: 'Count',
		description:
			'The AI requests to count the number of shapes in the canvas. The answer will be provided to the AI in a follow-up request.',
	})

type ICountShapesAction = z.infer<typeof CountShapesAction>

export class CountShapesActionUtil extends AgentActionUtil<ICountShapesAction> {
	static override type = 'count' as const

	override getSchema() {
		return CountShapesAction
	}

	override getInfo(action: Streaming<ICountShapesAction>) {
		const description = action.complete ? 'Counted shapes' : 'Counting shapes'
		return {
			icon: 'search' as const,
			description,
		}
	}

	override async applyAction(
		action: Streaming<ICountShapesAction>,
		transform: AgentRequestTransform
	) {
		if (!action.complete) return
		const { agent, editor } = transform

		// Schedule a follow-up agent request
		agent.schedule()

		// Count the shapes
		return editor.getCurrentPageShapes().length
	}
}
