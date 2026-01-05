import { buildSystemPromptFromDefinitions } from '../../shared/schema/buildSystemPromptFromDefinitions'
import { AgentPrompt } from '../../shared/types/AgentPrompt'

/**
 * Build a system prompt from all of the prompt parts using shared definitions.
 *
 * If you want to bypass the definition system, replace this function with
 * one that returns a hardcoded value.
 *
 * @param prompt - The prompt to build a system prompt for.
 * @returns The system prompt.
 */
export function buildSystemPrompt(prompt: AgentPrompt): string {
	return buildSystemPromptFromDefinitions(prompt)
}
