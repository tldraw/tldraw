import { AddDetailAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const AddDetailActionUtil = registerActionUtil(
	class AddDetailActionUtil extends AgentActionUtil<AddDetailAction> {
		static override type = 'add-detail' as const

		override getInfo(action: Streaming<AddDetailAction>) {
			const label = 'Adding detail'
			const text = action.intent?.startsWith('#') ? `\n\n${action.intent}` : action.intent
			const description = `**${label}:** ${text ?? ''}`

			return {
				icon: 'pencil' as const,
				description,
			}
		}

		override applyAction(action: Streaming<AddDetailAction>) {
			if (!action.complete) return
			this.agent.schedule('Add detail to the canvas.')
		}
	}
)
