import { AgentRequest, CurrentProjectPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class CurrentProjectPartUtil extends PromptPartUtil<CurrentProjectPart> {
	static override type = 'currentProject' as const

	override getPart(_request: AgentRequest, _helpers: AgentHelpers): CurrentProjectPart {
		const project = this.agent.getCurrentProject()

		return {
			type: 'currentProject',
			project: project ?? null,
		}
	}
}
