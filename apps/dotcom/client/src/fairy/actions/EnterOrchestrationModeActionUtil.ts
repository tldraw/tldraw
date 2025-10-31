import { EnterOrchestrationModeAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class EnterOrchestrationModeActionUtil extends AgentActionUtil<EnterOrchestrationModeAction> {
	static override type = 'enter-orchestration-mode' as const

	override getInfo(action: Streaming<EnterOrchestrationModeAction>) {
		return {
			icon: 'note' as const,
			description: action.complete
				? 'Entered orchestration mode'
				: 'Entering orchestration mode...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<EnterOrchestrationModeAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		this.agent.schedule({
			messages: [getEnteringOrchestrationModePrompt(action)],
			mode: 'orchestrator',
		})
	}
}

function getEnteringOrchestrationModePrompt(_action: EnterOrchestrationModeAction) {
	return `You have just elected to enter orchestration mode in order to complete a project. 
    You should start by thinking about the project and how to complete it, then you should create a project plan, deciding on who should help you, and what the initial tasks for other fairies are.
    `
}
