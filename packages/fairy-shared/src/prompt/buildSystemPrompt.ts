import { AgentActionUtilConstructor } from '../actions/AgentActionUtil'
import { getAgentActionUtilsRecordByTypes } from '../actions/AgentActionUtils'
import { PromptPartUtilConstructor } from '../parts/PromptPartUtil'
import { getPromptPartUtilsRecordByTypes } from '../parts/PromptPartUtils'
import { AgentPrompt } from '../types/AgentPrompt'

/**
 * Build a system prompt from all of the prompt parts.
 *
 * If you want to bypass the `PromptPartUtil` system, replace this function with
 * one that returns a hardcoded value.
 *
 * @param prompt - The prompt to build a system prompt for.
 * @returns The system prompt.
 */
export function buildSystemPrompt(
	prompt: AgentPrompt,
	actions: AgentActionUtilConstructor['type'][],
	parts: PromptPartUtilConstructor['type'][]
): string {
	const promptUtils = getPromptPartUtilsRecordByTypes(parts)
	const messages: string[] = []

	for (const part of Object.values(prompt)) {
		const promptUtil = promptUtils[part.type]
		if (!promptUtil) continue
		const systemMessage = promptUtil.buildSystemPrompt(part, actions, parts)
		if (systemMessage) {
			messages.push(systemMessage)
		}
	}

	const actionUtils = getAgentActionUtilsRecordByTypes(actions)
	for (const actionUtil of Object.values(actionUtils)) {
		const systemMessage = actionUtil.buildSystemPrompt(actions, parts)
		if (systemMessage) {
			messages.push(systemMessage)
		}
	}

	return messages.join('')
}
