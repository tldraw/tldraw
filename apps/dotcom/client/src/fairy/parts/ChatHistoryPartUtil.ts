import { AgentRequest, ChatHistoryPart } from '@tldraw/fairy-shared'
import { structuredClone } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class ChatHistoryPartUtil extends PromptPartUtil<ChatHistoryPart> {
	static override type = 'chatHistory' as const

	override async getPart(_request: AgentRequest, helpers: AgentHelpers) {
		const items = structuredClone(this.agent.$chatHistory.get())

		for (const historyItem of items) {
			if (historyItem.type !== 'prompt') continue

			// Offset and round the context items of each history item
			const contextItems = historyItem.contextItems.map((contextItem) => {
				const offsetContextItem = helpers.applyOffsetToContextItem(contextItem)
				return helpers.roundContextItem(offsetContextItem)
			})

			historyItem.contextItems = contextItems
		}

		return {
			type: 'chatHistory' as const,
			items,
		}
	}
}
