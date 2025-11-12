import { AgentRequest, CurrentProjectPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getProjectById } from '../Projects'
import { PromptPartUtil } from './PromptPartUtil'

export class CurrentProjectPartUtil extends PromptPartUtil<CurrentProjectPart> {
	static override type = 'currentProject' as const

	override getPart(_request: AgentRequest, _helpers: AgentHelpers): CurrentProjectPart {
		const projectId = this.agent.$currentProjectId.get()
		const project = projectId ? getProjectById(projectId) : null

		return {
			type: 'currentProject',
			project: project ?? null,
		}
	}
}
