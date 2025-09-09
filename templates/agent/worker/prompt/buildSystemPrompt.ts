import { getPromptPartUtilsRecord } from '../../shared/AgentUtils'
import { AgentPrompt } from '../../shared/types/AgentPrompt'

/**
 * Build a system prompt from all of the prompt parts.
 *
 * If you want to bypass the `PromptPartUtil` system, replace this function with
 * one that returns a hardcoded value.
 *
 * @param prompt - The prompt to build a system prompt for.
 * @returns The system prompt.
 */
export function buildSystemPrompt(prompt: AgentPrompt): string {
	const utils = getPromptPartUtilsRecord()
	const messages: string[] = []

	for (const part of Object.values(prompt)) {
		const util = utils[part.type]
		if (!util) continue
		const systemMessage = util.buildSystemPrompt(part)
		if (systemMessage) {
			messages.push(systemMessage)
		}
	}

	return messages.join('')
}
