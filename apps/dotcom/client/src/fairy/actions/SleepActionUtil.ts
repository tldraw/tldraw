import { SleepAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class SleepActionUtil extends AgentActionUtil<SleepAction> {
	static override type = 'sleep' as const

	override getInfo(action: Streaming<SleepAction>) {
		return {
			icon: 'note' as const,
			description: action.complete ? 'Stopped' : 'Stopping...',
			pose: 'idle' as const,
		}
	}

	override applyAction(action: Streaming<SleepAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		this.agent.cancel()
		this.agent.setMode('idling')
	}
}
