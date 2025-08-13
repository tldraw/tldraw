import { ModelMessage, UserContent } from 'ai'
import { AgentMessage } from '../../client/promptParts/PromptPartUitl'
import { PROMPT_PART_UTILS } from '../../client/promptParts/promptPartUtils'
import { AgentPrompt } from '../../client/types/AgentPrompt'

export function buildMessages(prompt: AgentPrompt): ModelMessage[] {
	const { parts } = prompt
	const promptPartTypes = Object.keys(parts)

	const allMessages: AgentMessage[] = []

	for (const partType of promptPartTypes) {
		const utilClass = PROMPT_PART_UTILS[partType as keyof typeof PROMPT_PART_UTILS]
		if (utilClass && typeof utilClass.buildMessages === 'function') {
			const partMessages = utilClass.buildMessages(prompt, parts[partType])
			if (Array.isArray(partMessages) && partMessages.length > 0) {
				allMessages.push(...partMessages)
			}
		}
	}

	allMessages.sort((a, b) => b.priority - a.priority)

	return constructCoreMessages(allMessages)
}

/**
 * Convert AgentMessage[] to CoreMessage[] for the AI SDK
 */
function constructCoreMessages(tlMessages: AgentMessage[]): ModelMessage[] {
	if (!tlMessages || tlMessages.length === 0) {
		return []
	}

	return tlMessages.map((tlMessage) => {
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
