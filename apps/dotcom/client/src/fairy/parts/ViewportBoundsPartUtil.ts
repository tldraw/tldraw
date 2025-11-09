import { AgentRequest, ViewportBoundsPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class ViewportBoundsPartUtil extends PromptPartUtil<ViewportBoundsPart> {
	static override type = 'viewportBounds' as const

	override getPart(request: AgentRequest, helpers: AgentHelpers): ViewportBoundsPart {
		const userBounds = this.agent.editor.getViewportPageBounds()
		const offsetUserBounds = helpers.applyOffsetToBox(userBounds)
		const offsetAgentBounds = helpers.applyOffsetToBox(request.bounds)

		return {
			type: 'viewportBounds',
			userBounds: helpers.roundBox(offsetUserBounds),
			agentBounds: helpers.roundBox(offsetAgentBounds),
		}
	}
}
