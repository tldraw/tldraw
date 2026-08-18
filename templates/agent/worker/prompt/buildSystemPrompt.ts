import { buildResponseSchema } from '../../shared/schema/buildResponseSchema'
import type { ModePart } from '../../shared/schema/PromptPartDefinitions'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { getSystemPromptFlags } from './getSystemPromptFlags'
import { buildIntroPromptSection } from './sections/intro-section'
import { buildRulesPromptSection } from './sections/rules-section'

// The system prompt is built from sections that adapt to the mode's available actions and parts.
export function buildSystemPrompt(prompt: AgentPrompt, { withSchema = true } = {}): string {
	const modePart = prompt.mode
	if (!modePart) {
		throw new Error('A mode part is always required.')
	}

	const flags = getSystemPromptFlags(modePart.actionTypes, modePart.partTypes)
	const lines = [buildIntroPromptSection(flags), buildRulesPromptSection(flags)]

	if (withSchema) {
		lines.push(buildSchemaPromptSection(modePart))
	}

	return normalizeNewlines(lines.join('\n'))
}

function buildSchemaPromptSection(modePart: ModePart) {
	const schema = buildResponseSchema(modePart.actionTypes, modePart.modeType)

	return `## JSON schema

This is the JSON schema for the events you can return. You must conform to this schema. You must only return things in this format, otherwise your response will error. Output ONLY the JSON itself — do not add any preamble, explanation, or commentary before or after it, and do NOT wrap your response in a markdown code block (e.g. \`\`\`json). Just the raw JSON object.

${JSON.stringify(schema, null, 2)}
`
}

function normalizeNewlines(text: string): string {
	return text.replace(/\n{3,}/g, '\n\n')
}
