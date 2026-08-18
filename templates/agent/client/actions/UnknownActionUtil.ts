import { UnknownAction } from '../../shared/schema/AgentActionSchemas'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

/**
 * Used when the action type is unknown, usually because it hasn't finished streaming yet,
 * sometimes because the model made a mistake.
 */
export const UnknownActionUtil = registerActionUtil(
	class UnknownActionUtil extends AgentActionUtil<UnknownAction> {
		static override type = 'unknown' as const

		override getInfo() {
			return null
		}
	}
)
