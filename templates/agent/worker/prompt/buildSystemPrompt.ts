import { PROMPT_PART_UTILS } from '../../shared/AgentUtils'
import { AgentPrompt } from '../../shared/types/AgentPrompt'

export function buildSystemPrompt(prompt: AgentPrompt): string {
	const utils = Object.fromEntries(PROMPT_PART_UTILS.map((v) => [v.type, new v()]))
	const messages: string[] = []

	for (const type in prompt) {
		const util = utils[type]
		if (!util) continue
		const part = prompt[type]
		const systemMessage = util.buildSystemMessage(part, prompt)
		if (systemMessage) {
			messages.push(systemMessage)
		}
	}

	return messages.join('')
}
