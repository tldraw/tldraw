import { AgentRequest, CurrentProjectPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getFairyTasksByProjectId } from '../FairyTaskList'
import { PromptPartUtil } from './PromptPartUtil'

export class CurrentProjectPartUtil extends PromptPartUtil<CurrentProjectPart> {
	static override type = 'currentProject' as const

	override getPart(_request: AgentRequest, _helpers: AgentHelpers): CurrentProjectPart {
		const currentProject = this.agent.getProject() ?? null
		const currentProjectTasks = currentProject ? getFairyTasksByProjectId(currentProject.id) : []
		const role = this.agent.getRole()
		return {
			type: 'currentProject',
			currentProject,
			currentProjectTasks,
			role,
		}
	}
}
