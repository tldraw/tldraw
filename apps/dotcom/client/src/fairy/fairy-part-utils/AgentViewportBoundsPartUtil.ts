import { AgentRequest, AgentViewportBoundsPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class AgentViewportBoundsPartUtil extends PromptPartUtil<AgentViewportBoundsPart> {
	static override type = 'agentViewportBounds' as const

	override getPart(request: AgentRequest, helpers: AgentHelpers): AgentViewportBoundsPart {
		const offsetAgentBounds = helpers.applyOffsetToBox(request.bounds)

		return {
			type: 'agentViewportBounds',
			agentBounds: helpers.roundBox(offsetAgentBounds),
		}
	}
}
