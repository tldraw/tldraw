import { AgentRequest, HeardMessagesPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getFairyNameById } from '../fairy-agent/agent/fairyAgentsAtom'
import { PromptPartUtil } from './PromptPartUtil'

export class HeardMessagesPartUtil extends PromptPartUtil<HeardMessagesPart> {
	static override type = 'heardMessages' as const

	override getPart(_request: AgentRequest, _helpers: AgentHelpers): HeardMessagesPart {
		const allHeardMessages = this.agent.$heardMessages.get()

		// Get the 12 most recent messages (sorted by timestamp descending)
		const recentMessages = allHeardMessages
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, 12)
			.map((msg) => {
				const senderName = getFairyNameById(msg.senderId, this.editor) ?? msg.senderId
				return {
					senderId: msg.senderId,
					senderName,
					message: msg.message,
					timestamp: msg.timestamp,
				}
			})

		return {
			type: 'heardMessages',
			heardMessages: recentMessages,
		}
	}
}
