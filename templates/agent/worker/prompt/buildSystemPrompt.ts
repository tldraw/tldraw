import { buildResponseSchema } from '../../shared/schema/buildResponseSchema'
import type { ModePart } from '../../shared/schema/PromptPartDefinitions'
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
 * @param opts - Options for building the system prompt.
 * @param opts.withSchema - Whether to include the JSON schema in the system prompt. Defaults to true.
 * @returns The system prompt string.
 */
export function buildSystemPrompt(
	prompt: AgentPrompt,
	opts: { withSchema: boolean } = { withSchema: true }
): string {
	const { withSchema = true } = opts

	const modePart = prompt.mode
	if (!modePart) {
		throw new Error('A mode part is always required.')
	}

	const { actionTypes, partTypes } = modePart
	const flags = getSystemPromptFlags(actionTypes, partTypes)

	const lines = [buildIntroPromptSection(flags), buildRulesPromptSection(flags)]

	if (withSchema) {
		lines.push(buildSchemaPromptSection(modePart))
	}

	const result = normalizeNewlines(lines.join('\n'))

	return result
}

function buildSchemaPromptSection(modePart: ModePart) {
	const schema = buildResponseSchema(modePart.actionTypes, modePart.modeType)

	return `## JSON schema

This is the JSON schema for the events you can return. You must conform to this schema.

${JSON.stringify(schema, null, 2)}
`
}

function normalizeNewlines(text: string): string {
	return text.replace(/\n{3,}/g, '\n\n')
}
