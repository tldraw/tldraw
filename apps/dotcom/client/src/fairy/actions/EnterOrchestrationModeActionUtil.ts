import { EnterOrchestrationModeAction, FairyProject, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getFairyAgents } from '../fairy-agent/agent/fairyAgentsAtom'
import { $projects } from '../Projects'
import { AgentActionUtil } from './AgentActionUtil'

export class EnterOrchestrationModeActionUtil extends AgentActionUtil<EnterOrchestrationModeAction> {
	static override type = 'enter-orchestration-mode' as const

	override getInfo(action: Streaming<EnterOrchestrationModeAction>) {
		return {
			icon: 'note' as const,
			description: action.complete ? 'Created a project' : 'Creating a project...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<EnterOrchestrationModeAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		// If it's the only fairy, don't allow it to enter orchestration mode
		if (getFairyAgents(this.editor).length < 2) {
			this.agent.schedule({
				messages: [
					'You have elected to enter orchestration mode, but there are no other fairies on the canvas that you can orchestrate. Instead, you should carry out the task by yourself.',
				],
				mode: 'default',
			})
			return
		}

		this.agent.schedule({
			messages: [getEnteringOrchestrationModePrompt(action, $projects.get())],
			mode: 'orchestrator',
		})
	}
}

function getEnteringOrchestrationModePrompt(
	_action: EnterOrchestrationModeAction,
	projects: FairyProject[]
) {
	return `You have just elected to enter orchestration mode in order to complete a project. 
    You should start by thinking about the project and how to complete it, then you should create a project plan, deciding on who should help you, and what the initial tasks for other fairies are. Do not recruit more fairies than you need to complete the project.
	${
		projects.length > 0
			? `Current projects: 
${JSON.stringify(projects)}. 
Do not recruit any fairies that are already part of a project. Do not choose a color that is already used by a project.
	`
			: ``
	}`
}
