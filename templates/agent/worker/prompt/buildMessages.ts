import { ModelMessage, UserContent } from 'ai'
import { AgentMessage, AgentMessageContent } from '../../shared/types/AgentMessage'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { getPromptPartDefinition, PromptPart } from '../../shared/types/PromptPart'

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
	return defaultBuildMessagesFromPart(part)
}

/**
 * Default message building logic that uses buildContent.
 */
function defaultBuildMessagesFromPart(part: PromptPart): AgentMessage[] {
	const definition = getPromptPartDefinition(part.type)

	// Get content strings from the definition
	const content = definition.buildContent ? definition.buildContent(part) : []

	if (!content || content.length === 0) {
		return []
	}

	// Convert content strings to message content (handling images)
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

	// Get priority from definition (default to 0)
	const priority = definition.priority ?? 0

	return [{ role: 'user', content: messageContent, priority }]
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
