import { CountShapesAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const CountShapesActionUtil = registerActionUtil(
	class CountShapesActionUtil extends AgentActionUtil<CountShapesAction> {
		static override type = 'count' as const

		override getInfo(action: Streaming<CountShapesAction>) {
			const description = action.complete ? 'Counted shapes' : 'Counting shapes'
			return {
				icon: 'search' as const,
				description,
			}
		}

		override async applyAction(action: Streaming<CountShapesAction>, helpers: AgentHelpers) {
			if (!action.complete) return
			const { agent, editor } = helpers

			// Add the shape count to the next request
			agent.schedule({
				data: [`Number of shapes on the canvas: ${editor.getCurrentPageShapes().length}`],
			})
		}
	}
)
