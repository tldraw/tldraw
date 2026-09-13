import { ModelMessage, UserContent } from 'ai'
import { AgentMessage, AgentMessageContent } from '../../shared/types/AgentMessage'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { getPromptPartDefinition, PromptPart } from '../../shared/types/PromptPart'

export function buildMessages(prompt: AgentPrompt): ModelMessage[] {
	// Build messages from each prompt part using shared definitions
	const allMessages = Object.values(prompt).flatMap(buildMessagesFromPart)

	// Sort by priority (higher priority = later in prompt)
	allMessages.sort((a, b) => a.priority - b.priority)

	return allMessages.map(toModelMessage)
}

/**
 * Build messages from a prompt part using its definition.
 * This is used by the worker to convert prompt parts into messages for the model.
 */
function buildMessagesFromPart(part: PromptPart): AgentMessage[] {
	const definition = getPromptPartDefinition(part.type)

	// If the definition has a custom buildMessages function, use it
	if (definition.buildMessages) {
		return definition.buildMessages(part)
	}

	// Otherwise, use the default logic with buildContent
	// Get content strings from the definition
	const content = definition.buildContent?.(part) ?? []
	if (content.length === 0) return []

	// Convert content strings to message content (handling images)
	const messageContent: AgentMessageContent[] = content.map((item) =>
		item.startsWith('data:image/') ? { type: 'image', image: item } : { type: 'text', text: item }
	)

	// Get priority from definition (default to 0)
	return [{ role: 'user', content: messageContent, priority: definition.priority ?? 0 }]
}

/**
 * Convert AgentMessage[] to ModelMessage[] for the AI SDK
 */
function toModelMessage(message: AgentMessage): ModelMessage {
	const content: UserContent = message.content.map((item) =>
		item.type === 'image'
			? { type: 'image', image: item.image! }
			: { type: 'text', text: item.text! }
	)
	return { role: message.role, content } as ModelMessage
}
