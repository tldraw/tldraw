import { UnknownAction } from '../../shared/schema/AgentActionSchemas'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

/**
 * This event util is used when the event type is unknown.
 * This usually happens because the event type has not finished streaming yet.
 * Sometimes it happens because the model makes a mistake.
 */
export const UnknownActionUtil = registerActionUtil(
	class UnknownActionUtil extends AgentActionUtil<UnknownAction> {
		static override type = 'unknown' as const

		override getInfo() {
			// Don't show anything in the UI for unknown actions
			return null
		}
	}
)
