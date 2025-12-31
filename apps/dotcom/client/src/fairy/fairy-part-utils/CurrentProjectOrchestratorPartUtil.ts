import { AgentRequest, CurrentProjectOrchestratorPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class CurrentProjectOrchestratorPartUtil extends PromptPartUtil<CurrentProjectOrchestratorPart> {
	static override type = 'currentProjectOrchestrator' as const

	override getPart(_request: AgentRequest, _helpers: AgentHelpers): CurrentProjectOrchestratorPart {
		const currentProject = this.agent.getProject() ?? null
		const currentProjectTasks = currentProject
			? this.agent.fairyApp.tasks.getTasksByProjectId(currentProject.id)
			: []
		return {
			type: 'currentProjectOrchestrator',
			currentProject,
			currentProjectTasks,
		}
	}
}
