import { getPromptPartUtilsRecord } from '../../shared/AgentUtils'
import { AgentPrompt } from '../../shared/types/AgentPrompt'

export function buildSystemPrompt(prompt: AgentPrompt): string {
	const utils = getPromptPartUtilsRecord()
	const messages: string[] = []

	for (const part of Object.values(prompt)) {
		const util = utils[part.type]
		if (!util) continue
		const systemMessage = util.buildSystemMessage(part)
		if (systemMessage) {
			messages.push(systemMessage)
		}
	}

	return messages.join('')
}
