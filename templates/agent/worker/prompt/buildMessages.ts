import { ModelMessage, UserContent } from 'ai'
import { AgentMessage, AgentMessageContent } from '../../shared/types/AgentMessage'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { getPromptPartDefinition, PromptPart } from '../../shared/types/PromptPart'

export function buildMessages(prompt: AgentPrompt): ModelMessage[] {
	const allMessages = Object.values(prompt).flatMap(buildMessagesFromPart)

	// Higher priority = later in prompt
	allMessages.sort((a, b) => a.priority - b.priority)

	return allMessages.map(toModelMessage)
}

function buildMessagesFromPart(part: PromptPart): AgentMessage[] {
	const definition = getPromptPartDefinition(part.type)
	if (definition.buildMessages) {
		return definition.buildMessages(part)
	}

	const content = definition.buildContent?.(part) ?? []
	if (content.length === 0) return []

	const messageContent: AgentMessageContent[] = content.map((item) =>
		item.startsWith('data:image/') ? { type: 'image', image: item } : { type: 'text', text: item }
	)

	return [{ role: 'user', content: messageContent, priority: definition.priority ?? 0 }]
}

function toModelMessage(message: AgentMessage): ModelMessage {
	const content: UserContent = message.content.map((item) =>
		item.type === 'image'
			? { type: 'image', image: item.image! }
			: { type: 'text', text: item.text! }
	)
	return { role: message.role, content } as ModelMessage
}
