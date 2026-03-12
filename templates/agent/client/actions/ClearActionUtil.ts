import { ClearAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const ClearActionUtil = registerActionUtil(
	class ClearActionUtil extends AgentActionUtil<ClearAction> {
		static override type = 'clear' as const

		/**
		 * Tell the model what the action's schema is
		 */

		/**
		 * Tell the model how to display this action in the chat history UI
		 */
		override getInfo() {
			return {
				icon: 'trash' as const,
				description: 'Cleared the canvas',
			}
		}

		/**
		 * Tell the model how to apply the action
		 */
		override applyAction(action: Streaming<ClearAction>) {
			// Don't do anything if the action hasn't finished streaming
			if (!action.complete) return

			// Delete all shapes on the page
			const { editor } = this

			const allShapes = editor.getCurrentPageShapes()
			editor.deleteShapes(allShapes)
		}
	}
)
