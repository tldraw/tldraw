import { AgentRequest, UserViewportBoundsPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class UserViewportBoundsPartUtil extends PromptPartUtil<UserViewportBoundsPart> {
	static override type = 'userViewportBounds' as const

	override getPart(_request: AgentRequest, helpers: AgentHelpers): UserViewportBoundsPart {
		const userBounds = this.agent.editor.getViewportPageBounds()
		const offsetUserBounds = helpers.applyOffsetToBox(userBounds)

		return {
			type: 'userViewportBounds',
			userBounds: helpers.roundBox(offsetUserBounds),
		}
	}
}
