import { AgentRequest, ChatHistoryPart, getFairyModeDefinition } from '@tldraw/fairy-shared'
import { structuredClone } from 'tldraw'
import { filterChatHistoryByMode } from '../fairy-agent/chat/filterChatHistoryByMode'
import { PromptPartUtil } from './PromptPartUtil'

export class ChatHistoryPartUtil extends PromptPartUtil<ChatHistoryPart> {
	static override type = 'chatHistory' as const

	override async getPart(_request: AgentRequest) {
		const allItems = structuredClone(this.agent.chatManager.$chatHistory.get())

		// Get the current mode's memory level
		const modeDefinition = getFairyModeDefinition(this.agent.getMode())
		const { memoryLevel } = modeDefinition

		const filteredItems = filterChatHistoryByMode(allItems, memoryLevel)

		return {
			type: 'chatHistory' as const,
			items: filteredItems,
		}
	}
}
