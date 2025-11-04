import { AgentRequest, HeardMessagesPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getFairyNameById } from '../fairy-agent/agent/fairyAgentsAtom'
import { PromptPartUtil } from './PromptPartUtil'

export class HeardMessagesPartUtil extends PromptPartUtil<HeardMessagesPart> {
	static override type = 'heardMessages' as const

	override getPart(_request: AgentRequest, _helpers: AgentHelpers): HeardMessagesPart {
		const allHeardMessages = this.agent.$heardMessages.get()

		// Filter out messages older than 5 minutes
		const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
		const recentMessages = allHeardMessages
			.filter((msg) => msg.timestamp >= fiveMinutesAgo)
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, 12)
			.map((msg) => {
				const senderName = getFairyNameById(msg.senderId, this.editor) ?? msg.senderId
				return {
					senderId: msg.senderId,
					senderName,
					message: msg.message,
					timestamp: msg.timestamp,
					response_requested: msg.response_requested,
				}
			})

		return {
			type: 'heardMessages',
			heardMessages: recentMessages,
		}
	}
}
