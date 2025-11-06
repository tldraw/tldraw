import { StartProjectAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class StartProjectActionUtil extends AgentActionUtil<StartProjectAction> {
	static override type = 'start-project' as const

	override getInfo(action: Streaming<StartProjectAction>) {
		return {
			icon: 'note' as const,
			description: action.complete
				? `Started project: ${action.projectName}`
				: 'Starting project...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<StartProjectAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		// Todo
	}
}
