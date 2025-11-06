import { EndCurrentProjectAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class EndCurrentProjectActionUtil extends AgentActionUtil<EndCurrentProjectAction> {
	static override type = 'end-project' as const

	override getInfo(action: Streaming<EndCurrentProjectAction>) {
		return {
			icon: 'note' as const,
			description: action.complete ? 'Ended current project' : 'Ending current project...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<EndCurrentProjectAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		// Todo
	}
}
