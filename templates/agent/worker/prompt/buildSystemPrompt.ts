import { PART_UTILS } from '../../shared/AgentUtils'
import { AgentPrompt } from '../../shared/types/AgentPrompt'

export function buildSystemPrompt(prompt: AgentPrompt): string {
	const { parts } = prompt

	const utils = Object.fromEntries(PART_UTILS.map((v) => [v.type, new v()]))
	const messages: string[] = []

	for (const type in parts) {
		const util = utils[type]
		if (!util) continue
		const part = parts[type]
		const systemMessage = util.buildSystemMessage(part, prompt)
		if (systemMessage) {
			messages.push(systemMessage)
		}
	}

	return messages.join('')
}
