import { AgentMessage, AgentMessageContent } from '../types/AgentMessage'
import { getPromptPartDefinition, PromptPart } from '../types/PromptPart'

/**
 * Build messages from a prompt part using its definition.
 * This is used by the worker to convert prompt parts into messages for the model.
 */
export function buildMessagesFromPart(part: PromptPart): AgentMessage[] {
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
