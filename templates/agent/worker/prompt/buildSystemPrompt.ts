import { buildResponseSchema } from '../../shared/schema/buildResponseSchema'
import type { AgentAction } from '../../shared/types/AgentAction'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { getSystemPromptFlags } from './getSystemPromptFlags'
import { buildIntroPromptSection } from './sections/intro-section'
import { buildRulesPromptSection } from './sections/rules-section'

/**
 * Build the system prompt for the agent.
 *
 * This is the main instruction set that tells the AI how to behave.
 * The prompt is constructed from modular sections that adapt based on
 * what actions and parts are available.
 *
 * @param prompt - The prompt containing all parts including the mode part.
 * @returns The system prompt string.
 */
export function buildSystemPrompt(prompt: AgentPrompt): string {
	const modePart = prompt.mode
	if (!modePart) {
		throw new Error('A mode part is always required.')
	}

	const { actionTypes, partTypes } = modePart
	const flags = getSystemPromptFlags(actionTypes, partTypes)

	const lines = [buildIntroPromptSection(flags), buildRulesPromptSection(flags)]

	lines.push(buildSchemaPromptSection(actionTypes))

	const result = normalizeNewlines(lines.join('\n'))

	return result
}

function buildSchemaPromptSection(actions: AgentAction['_type'][]) {
	return `## JSON schema

This is the JSON schema for the events you can return. You must conform to this schema.

${JSON.stringify(buildResponseSchema(actions), null, 2)}
`
}

function normalizeNewlines(text: string): string {
	while (text.includes('\n\n\n')) {
		text = text.replace('\n\n\n', '\n\n')
	}
	return text
}
