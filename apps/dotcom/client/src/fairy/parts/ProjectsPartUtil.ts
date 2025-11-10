import { AgentRequest, ProjectsPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class ProjectsPartUtil extends PromptPartUtil<ProjectsPart> {
	static override type = 'activeProject' as const

	override getPart(_request: AgentRequest, _helpers: AgentHelpers): ProjectsPart {
		const currentProject = this.agent.getProject() ?? null
		return {
			type: 'activeProject',
			currentProject,
		}
	}
}
