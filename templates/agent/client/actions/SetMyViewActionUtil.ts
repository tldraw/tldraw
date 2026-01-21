import { structuredClone } from 'tldraw'
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

			const roundedAction = helpers.roundBox(structuredClone(action))

			const bounds = helpers.removeOffsetFromBox({
				x: action.x,
				y: action.y,
				w: action.w,
				h: action.h,
			})

			this.agent.interrupt({
				input: {
					bounds,
					agentMessages: [
						`Just navigated to new area with the intent: ${action.intent}. Can now see the new area at (${roundedAction.x}, ${roundedAction.y}) and is ${roundedAction.w}x${roundedAction.h} in size.`, // this uses the action instead of the bounds because this will go in the chat history and so must be consistent with what the agent thinks the chat origin is
					],
				},
			})
		}
	}
)
