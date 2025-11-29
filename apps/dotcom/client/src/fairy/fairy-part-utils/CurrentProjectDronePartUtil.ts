import { AgentRequest, CurrentProjectDronePart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class CurrentProjectDronePartUtil extends PromptPartUtil<CurrentProjectDronePart> {
	static override type = 'currentProjectDrone' as const

	override getPart(_request: AgentRequest, _helpers: AgentHelpers): CurrentProjectDronePart {
		const currentProject = this.agent.getProject() ?? null
		return {
			type: 'currentProjectDrone',
			currentProject,
		}
	}
}
