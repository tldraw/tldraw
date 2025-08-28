import { AgentActionUtil } from './AgentActionUtil'

/**
 * This event util is used when the event type is unknown.
 * This usually happens because the event type has not finished streaming yet.
 * Sometimes it happens because the model makes a mistake.
 */
export class UnknownActionUtil extends AgentActionUtil<{ _type: 'unknown' }> {
	static override type = 'unknown' as const

	override getInfo() {
		// Don't show anything in the UI for unknown actions
		return null
	}
}
