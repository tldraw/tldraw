import { ModelMessage, UserContent } from 'ai'
import { AgentMessage, AgentMessageContent } from '../types/AgentMessage'
import { AgentPrompt } from '../types/AgentPrompt'
import { PromptPart } from '../types/PromptPart'

export function buildMessages(prompt: AgentPrompt): ModelMessage[] {
	const allMessages: AgentMessage[] = []

	for (const part of Object.values(prompt)) {
		const messages = buildMessagesFromPart(part)
		allMessages.push(...messages)
	}

	allMessages.sort((a, b) => b.priority - a.priority)

	return toModelMessages(allMessages)
}

function buildMessagesFromPart(part: PromptPart): AgentMessage[] {
	const content = buildContentFromPart(part)
	if (!content || content.length === 0) {
		return []
	}

	const messageContent: AgentMessageContent[] = []
	for (const item of content) {
		if (typeof item === 'string' && item.startsWith('data:image/')) {
			messageContent.push({
				type: 'image',
				image: item,
			})
		} else {
			messageContent.push({
				type: 'text',
				text: item,
			})
		}
	}

	return [{ role: 'user', content: messageContent, priority: 0 }]
}

function buildContentFromPart(part: PromptPart): string[] {
	switch (part.type) {
		case 'message':
			return ['Hello world']
		default:
			return []
	}
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
