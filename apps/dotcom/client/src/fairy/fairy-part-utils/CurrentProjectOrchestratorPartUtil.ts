import { AgentRequest, CurrentProjectOrchestratorPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getFairyTasksByProjectId } from '../fairy-task-list'
import { PromptPartUtil } from './PromptPartUtil'

export class CurrentProjectOrchestratorPartUtil extends PromptPartUtil<CurrentProjectOrchestratorPart> {
	static override type = 'currentProjectOrchestrator' as const

	override getPart(_request: AgentRequest, _helpers: AgentHelpers): CurrentProjectOrchestratorPart {
		const currentProject = this.agent.getProject() ?? null
		const currentProjectTasks = currentProject ? getFairyTasksByProjectId(currentProject.id) : []
		return {
			type: 'currentProjectOrchestrator',
			currentProject,
			currentProjectTasks,
		}
	}
}
