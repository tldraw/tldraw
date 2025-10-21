import {
	AgentMessage,
	AgentMessageContent,
	AgentPrompt,
	PROMPT_PART_SCHEMAS,
	PromptPart,
	PromptPartRegistry,
} from '@tldraw/fairy-shared'
import { ModelMessage, UserContent } from 'ai'

function buildContentFromPart(part: PromptPart): string[] {
	const schema = PROMPT_PART_SCHEMAS.find((schema) => schema.shape.type.value === part.type)
	if (!schema) return []

	const meta = PromptPartRegistry.get(schema)
	if (!meta) return []

	return meta.buildContent?.(part) ?? []
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

export function buildMessages(prompt: AgentPrompt): ModelMessage[] {
	const allMessages: AgentMessage[] = []

	for (const part of Object.values(prompt)) {
		const messages = buildMessagesFromPart(part)
		allMessages.push(...messages)
	}

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
