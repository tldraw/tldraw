import { AgentRequest, ChatHistoryPart } from '@tldraw/fairy-shared'
import { structuredClone } from 'tldraw'
import { PromptPartUtil } from './PromptPartUtil'

export class ChatHistoryPartUtil extends PromptPartUtil<ChatHistoryPart> {
	static override type = 'chatHistory' as const

	override async getPart(_request: AgentRequest) {
		const items = structuredClone(this.agent.$chatHistory.get())
		return {
			type: 'chatHistory' as const,
			items,
		}
	}
}
