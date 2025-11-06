import {
	AgentMessage,
	AgentMessageContent,
	AgentPrompt,
	getPromptPartDefinition,
	PROMPT_PART_DEFINITIONS,
	PromptPart,
} from '@tldraw/fairy-shared'
import { ModelMessage, UserContent } from 'ai'

export function buildMessages(prompt: AgentPrompt): ModelMessage[] {
	const allMessages: AgentMessage[] = []

	for (const part of Object.values(prompt)) {
		const messages = buildMessagesFromPart(part)
		allMessages.push(...messages)
	}

	allMessages.sort((a, b) => a.priority - b.priority)

	return toModelMessages(allMessages)
}

function buildMessagesFromPart(part: PromptPart): AgentMessage[] {
	const definition = getPromptPartDefinition(part.type)
	if (!definition.buildMessages) return defaultBuildMessagesFromPart(part)
	return definition.buildMessages(part)
}

function buildContentFromPart(part: PromptPart): string[] {
	const definition = getPromptPartDefinition(part.type)
	if (!definition.buildContent) return []
	return definition.buildContent(part)
}

export function defaultBuildMessagesFromPart<T extends PromptPart>(part: T): AgentMessage[] {
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

	const definition = PROMPT_PART_DEFINITIONS.find((definition) => definition.type === part.type)
	const priority = definition?.priority ?? 0

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
