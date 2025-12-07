import { AgentRequest, ChatHistoryPart, getFairyModeDefinition } from '@tldraw/fairy-shared'
import { structuredClone } from 'tldraw'
import { filterChatHistoryByMode } from '../fairy-ui/chat/filterChatHistoryByMode'
import { PromptPartUtil } from './PromptPartUtil'

export class ChatHistoryPartUtil extends PromptPartUtil<ChatHistoryPart> {
	static override type = 'chatHistory' as const

	override async getPart(_request: AgentRequest) {
		const allItems = structuredClone(this.agent.chat.getHistory())

		// Get the current mode's memory level
		const modeDefinition = getFairyModeDefinition(this.agent.mode.getMode())
		const { memoryLevel } = modeDefinition

		const filteredItems = filterChatHistoryByMode(allItems, memoryLevel)

		return {
			type: 'chatHistory' as const,
			items: filteredItems,
		}
	}
}
