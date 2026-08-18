import { structuredClone } from 'tldraw'
import { ChatHistoryPart } from '../../shared/schema/PromptPartDefinitions'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { AgentHelpers } from '../AgentHelpers'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const ChatHistoryPartUtil = registerPromptPartUtil(
	class ChatHistoryPartUtil extends PromptPartUtil<ChatHistoryPart> {
		static override type = 'chatHistory' as const

		override async getPart(_request: AgentRequest, helpers: AgentHelpers) {
			const history = structuredClone(this.agent.chat.getHistory())

			for (const historyItem of history) {
				if (historyItem.type !== 'prompt') continue

				historyItem.contextItems = historyItem.contextItems.map((contextItem) =>
					helpers.roundContextItem(helpers.applyOffsetToContextItem(contextItem))
				)
			}

			return {
				type: 'chatHistory' as const,
				history,
			}
		}
	}
)
