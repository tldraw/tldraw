import { SetMyViewAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const SetMyViewActionUtil = registerActionUtil(
	class SetMyViewActionUtil extends AgentActionUtil<SetMyViewAction> {
		static override type = 'setMyView' as const

		override getInfo(action: Streaming<SetMyViewAction>) {
			const label = action.complete ? 'Move camera' : 'Moving camera'
			const text = action.intent?.startsWith('#') ? `\n\n${action.intent}` : action.intent
			return {
				icon: 'eye' as const,
				description: `**${label}**: ${text ?? ''}`,
			}
		}

		override applyAction(action: Streaming<SetMyViewAction>, helpers: AgentHelpers) {
			if (!action.complete) return

			const bounds = helpers.removeOffsetFromBox({
				x: action.x,
				y: action.y,
				w: action.w,
				h: action.h,
			})

			this.agent.schedule({ bounds })
		}
	}
)
