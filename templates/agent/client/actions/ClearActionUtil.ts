import { ClearAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const ClearActionUtil = registerActionUtil(
	class ClearActionUtil extends AgentActionUtil<ClearAction> {
		static override type = 'clear' as const

		override getInfo() {
			return {
				icon: 'trash' as const,
				description: 'Cleared the canvas',
			}
		}

		override applyAction(action: Streaming<ClearAction>) {
			if (!action.complete) return
			this.editor.deleteShapes(this.editor.getCurrentPageShapes())
		}
	}
)
