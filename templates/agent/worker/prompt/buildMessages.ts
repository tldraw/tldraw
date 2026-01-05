import { ModelMessage, UserContent } from 'ai'
import { buildMessagesFromPart } from '../../shared/schema/buildMessagesFromDefinitions'
import { AgentMessage } from '../../shared/types/AgentMessage'
import { AgentPrompt } from '../../shared/types/AgentPrompt'

export function buildMessages(prompt: AgentPrompt): ModelMessage[] {
	const allMessages: AgentMessage[] = []

	// Build messages from each prompt part using shared definitions
	for (const part of Object.values(prompt)) {
		const messages = buildMessagesFromPart(part)
		allMessages.push(...messages)
	}

	// Sort by priority (higher priority = later in prompt)
	allMessages.sort((a, b) => a.priority - b.priority)

	return toModelMessages(allMessages)
}

/**
 * Convert AgentMessage[] to ModelMessage[] for the AI SDK
 */
function toModelMessages(agentMessages: AgentMessage[]): ModelMessage[] {
	return agentMessages.map((tlMessage) => {
		const content: UserContent = []

		for (const contentItem of tlMessage.content) {
			if (contentItem.type === 'image') {
				content.push({
					type: 'image',
					image: contentItem.image!,
				})
			} else {
				content.push({
					type: 'text',
					text: contentItem.text!,
				})
			}
		}

		return {
			role: tlMessage.role,
			content,
		} as ModelMessage
	})
}
