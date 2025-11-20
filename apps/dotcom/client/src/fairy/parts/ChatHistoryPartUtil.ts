import {
	AgentRequest,
	ChatHistoryItem,
	ChatHistoryPart,
	getFairyModeDefinition,
} from '@tldraw/fairy-shared'
import { structuredClone } from 'tldraw'
import { PromptPartUtil } from './PromptPartUtil'

export class ChatHistoryPartUtil extends PromptPartUtil<ChatHistoryPart> {
	static override type = 'chatHistory' as const

	override async getPart(_request: AgentRequest) {
		const allItems = structuredClone(this.agent.$chatHistory.get())

		// Get the current mode's memory level
		const modeDefinition = getFairyModeDefinition(this.agent.getMode())
		const { memoryLevel } = modeDefinition

		let filteredItems: ChatHistoryItem[]
		switch (memoryLevel) {
			case 'fairy':
				filteredItems = allItems.filter((item) => item.memoryLevel === 'fairy')
				break
			case 'project': {
				filteredItems = []
				for (let i = allItems.length - 1; i >= 0; i--) {
					const item = allItems[i]
					if (item.memoryLevel === 'project') {
						filteredItems.unshift(item)
					} else if (item.memoryLevel === 'task') {
						continue
					} else if (item.memoryLevel === 'fairy') {
						break
					}
				}
				break
			}
			case 'task': {
				filteredItems = []
				for (let i = allItems.length - 1; i >= 0; i--) {
					const item = allItems[i]
					if (item.memoryLevel === 'task') {
						filteredItems.unshift(item)
					} else {
						break
					}
				}
			}
		}

		return {
			type: 'chatHistory' as const,
			items: filteredItems,
		}
	}
}
