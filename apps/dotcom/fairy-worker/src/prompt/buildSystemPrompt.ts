import {
	AgentAction,
	AgentPrompt,
	buildResponseSchema,
	getActiveFairyModeDefinition,
} from '@tldraw/fairy-shared'
import { getSystemPromptFlags, SystemPromptFlags } from './getSystemPromptFlags'
import { buildDuoOrchestratingModePromptSection } from './sections/duo-orchestration-mode'
import { buildIntroPromptSection } from './sections/intro-section'
import { buildOrchestratingModePromptSection } from './sections/orchestration-mode'
import { buildRulesPromptSection } from './sections/rules-section'
import { buildSoloingModePromptSection } from './sections/soloing-mode'
import { buildWorkingModePromptSection } from './sections/working-mode'

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
	return _buildSystemPrompt(prompt, true)
}

/**
 * Get the system prompt without the JSON schema appended.
 * This is useful for debugging/logging purposes.
 *
 * @param prompt - The prompt to build a system prompt for.
 * @returns The system prompt without the schema.
 */
export function buildSystemPromptWithoutSchema(prompt: AgentPrompt): string {
	return _buildSystemPrompt(prompt, false)
}

function _buildSystemPrompt(prompt: AgentPrompt, withSchema: boolean): string {
	const modePart = prompt.mode
	if (!modePart) throw new Error('A mode part is always required.')
	const { mode, work } = modePart

	const modeDefinition = getActiveFairyModeDefinition(mode)
	const availableActions = modeDefinition.actions(work)
	const availableParts = modeDefinition.parts(work)
	const flags = getSystemPromptFlags(mode, availableActions, availableParts)

	const out = [
		buildIntroPromptSection(flags),
		buildRulesPromptSection(flags),
		buildModePromptSection(flags),
	]

	if (withSchema) {
		out.push(buildSchemaPromptSection(availableActions))
	}

	return normalizeNewlines(out.join('\n'))
}

function buildModePromptSection(flags: SystemPromptFlags) {
	if (flags.isSoloing) {
		return buildSoloingModePromptSection(flags)
	}
	if (flags.isWorking) {
		return buildWorkingModePromptSection(flags)
	}
	if (flags.isOrchestrating) {
		return buildOrchestratingModePromptSection(flags)
	}
	if (flags.isDuoOrchestrating) {
		return buildDuoOrchestratingModePromptSection(flags)
	}
	throw new Error(`Unknown mode`)
}

function buildSchemaPromptSection(actions: AgentAction['_type'][]) {
	return `## JSON schema

This is the JSON schema for the events you can return. You must conform to this schema. You must only return things in this format, otherwise your response will error. You must conform to this schema. Remember, do NOT wrap any response in a code block using \`\`\`json. Output ONLY the json itself

${JSON.stringify(buildResponseSchema(actions), null, 2)}
`
}

function normalizeNewlines(text: string): string {
	// Step 1: Replace 3+ consecutive newlines with exactly 2 newlines
	let result = text.replace(/\n{3,}/g, '\n\n')

	// Step 2: Replace 2 newlines with 1 newline between lines that both start with hyphen
	// This keeps list items together without extra blank lines
	result = result.replace(/(^|\n)(\s*-[^\n]*)\n\n(?=\s*-)/g, '$1$2\n')

	return result
}
