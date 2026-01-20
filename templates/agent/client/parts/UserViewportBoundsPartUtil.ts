import { UserViewportBoundsPart } from '../../shared/schema/PromptPartDefinitions'
import { AgentHelpers } from '../AgentHelpers'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const UserViewportBoundsPartUtil = registerPromptPartUtil(
	class UserViewportBoundsPartUtil extends PromptPartUtil<UserViewportBoundsPart> {
		static override type = 'userViewportBounds' as const

		override getPart(_request: unknown, helpers: AgentHelpers): UserViewportBoundsPart {
			const userBounds = this.editor.getViewportPageBounds()
			const offsetUserBounds = helpers.applyOffsetToBox(userBounds)

			return {
				type: 'userViewportBounds',
				userBounds: helpers.roundBox(offsetUserBounds),
			}
		}
	}
)
