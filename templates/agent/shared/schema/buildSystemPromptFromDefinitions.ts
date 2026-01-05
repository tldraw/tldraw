import { AgentPrompt } from '../types/AgentPrompt'
import { getPromptPartDefinition } from './PromptPartRegistry'

/**
 * Build a system prompt from all of the prompt parts and action schemas.
 * This is used by the worker to construct the system message sent to the model.
 */
export function buildSystemPromptFromDefinitions(prompt: AgentPrompt): string {
	const messages: string[] = []

	// Get system prompts from prompt part definitions
	for (const part of Object.values(prompt)) {
		const definition = getPromptPartDefinition(part.type)
		if (definition.buildSystemPrompt) {
			const systemMessage = definition.buildSystemPrompt(part as any)
			if (systemMessage) {
				messages.push(systemMessage)
			}
		}
	}

	// Note: Action schemas currently don't contribute to system prompts
	// If needed in the future, add buildSystemPrompt to action schema metadata
	// For now, actions only define their structure via Zod schemas

	return messages.join('')
}
