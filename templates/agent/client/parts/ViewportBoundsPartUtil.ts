import { ViewportBoundsPart } from '../../shared/schema/PromptPartDefinitions'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { AgentHelpers } from '../AgentHelpers'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const ViewportBoundsPartUtil = registerPromptPartUtil(
	class ViewportBoundsPartUtil extends PromptPartUtil<ViewportBoundsPart> {
		static override type = 'viewportBounds' as const

		override getPart(request: AgentRequest, helpers: AgentHelpers): ViewportBoundsPart {
			if (!this.agent) {
				const emptyBounds = { x: 0, y: 0, w: 0, h: 0 }
				return { type: 'viewportBounds', userBounds: emptyBounds, agentBounds: emptyBounds }
			}

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
)
