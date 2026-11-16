import { CountShapesAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
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

		// The count is the result of the tool call.
		override getResult() {
			return `Number of shapes on the canvas: ${this.editor.getCurrentPageShapes().length}`
		}
	}
)
