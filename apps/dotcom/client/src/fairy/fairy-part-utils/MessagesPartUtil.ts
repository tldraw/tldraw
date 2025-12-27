import { AgentRequest, MessagesPart } from '@tldraw/fairy-shared'
import { PromptPartUtil } from './PromptPartUtil'

export class MessagesPartUtil extends PromptPartUtil<MessagesPart> {
	static override type = 'messages' as const

	override getPart(request: AgentRequest): MessagesPart {
		const { agentMessages: messages, source } = request
		return {
			type: 'messages',
			messages,
			source,
		}
	}
}
