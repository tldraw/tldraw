import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
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

	override async applyAction(action: Streaming<ICountShapesAction>, agentHelpers: AgentHelpers) {
		if (!action.complete) return
		const { agent, editor } = agentHelpers

		// Schedule a follow-up agent request
		agent.schedule("Here's the number of shapes on the canvas.")

		// Count the shapes
		return editor.getCurrentPageShapes().length
	}
}
