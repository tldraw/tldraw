import { AgentHelpers, CountShapesAction, Streaming } from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class CountShapesActionUtil extends AgentActionUtil<CountShapesAction> {
	static override type = 'count' as const

	override getInfo(action: Streaming<CountShapesAction>) {
		const description = action.complete ? 'Counted shapes' : 'Counting shapes'
		return {
			icon: 'search' as const,
			description,
		}
	}

	override applyAction(action: Streaming<CountShapesAction>, helpers: AgentHelpers) {
		if (!action.complete) return
		const { agent, editor } = helpers

		// Add the shape count to the next request
		agent.schedule({
			data: [`Number of shapes on the canvas: ${editor.getCurrentPageShapes().length}`],
		})
	}
}
