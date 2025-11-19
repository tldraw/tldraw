import { SleepAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class SleepActionUtil extends AgentActionUtil<SleepAction> {
	static override type = 'sleep' as const

	override getInfo(_action: Streaming<SleepAction>) {
		return null
	}

	override applyAction(action: Streaming<SleepAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		this.agent.interrupt({ mode: 'idling' })
	}
}
