import { ViewportBoundsPart } from '../../shared/schema/PromptPartDefinitions'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { AgentHelpers } from '../AgentHelpers'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const ViewportBoundsPartUtil = registerPromptPartUtil(
	class ViewportBoundsPartUtil extends PromptPartUtil<ViewportBoundsPart> {
		static override type = 'viewportBounds' as const

		override getPart(request: AgentRequest, helpers: AgentHelpers): ViewportBoundsPart {
			const userBounds = this.editor.getViewportPageBounds()
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
