import { AgentIdPart, AgentRequest } from '@tldraw/fairy-shared'
import { PromptPartUtil } from './PromptPartUtil'

export class AgentIdPartUtil extends PromptPartUtil<AgentIdPart> {
	static override type = 'agentId' as const

	override getPart(_request: AgentRequest): AgentIdPart {
		return {
			type: 'agentId',
			id: this.agent.id,
		}
	}
}
