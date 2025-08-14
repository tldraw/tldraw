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

	const allCoreMessages = constructCoreMessages(allMessages)

	// Filter out images from console log for readability
	// const messagesForLogging = allCoreMessages.map((message) => ({
	// 	...message,
	// 	content: Array.isArray(message.content)
	// 		? message.content.filter((item: any) => item.type !== 'image')
	// 		: message.content,
	// }))
	// console.log(JSON.stringify(messagesForLogging, null, 2))

	return allCoreMessages
}

/**
 * Convert AgentMessage[] to CoreMessage[] for the AI SDK
 */
function constructCoreMessages(agentMessages: AgentMessage[]): ModelMessage[] {
	if (!agentMessages || agentMessages.length === 0) {
		return []
	}

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
