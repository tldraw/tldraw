import { ModelMessage, UserContent } from 'ai'
import { PROMPT_PART_UTILS } from '../../shared/AgentUtils'
import { AgentMessage } from '../../shared/types/AgentMessage'
import { AgentPrompt } from '../../shared/types/AgentPrompt'

export function buildMessages(prompt: AgentPrompt): ModelMessage[] {
	const { parts } = prompt

	const utils = Object.fromEntries(PROMPT_PART_UTILS.map((v) => [v.type, new v()]))
	const allMessages: AgentMessage[] = []

	for (const type in parts) {
		const util = utils[type]
		if (!util) continue
		const part = parts[type]
		const messages = util.buildMessages(part, prompt)
		allMessages.push(...messages)
	}

	allMessages.sort((a, b) => b.priority - a.priority)

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
