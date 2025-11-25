import {
	AgentAction,
	AgentPrompt,
	buildResponseSchema,
	getActiveFairyModeDefinition,
} from '@tldraw/fairy-shared'
import { getSystemPromptFlags, SystemPromptFlags } from './getSystemPromptFlags'
import { buildDuoOrchestratingModePromptSection } from './sections/duo-orchestration-mode'
import { buildIntroPromptSection } from './sections/intro-section'
import { buildOneshottingModePromptSection } from './sections/oneshotting-mode'
import { buildOrchestratingModePromptSection } from './sections/orchestration-mode'
import { buildRulesPromptSection } from './sections/rules-section'
import { buildSoloingModePromptSection } from './sections/soloing-mode'
import { buildWorkingModePromptSection } from './sections/working-mode'

/**
 * Build a system prompt from all of the prompt parts.
 *
 * @param prompt - The prompt to build a system prompt for.
 * @param opts - The options for building the system prompt.
 * @param opts.withSchema - Whether to include the JSON schema in the system prompt.
 * @returns The system prompt.
 */
export function buildSystemPrompt(
	prompt: AgentPrompt,
	opts: {
		withSchema: boolean
	}
): string {
	const { withSchema = false } = opts

	const modePart = prompt.mode
	if (!modePart) throw new Error('A mode part is always required.')
	const { mode, work } = modePart

	const modeDefinition = getActiveFairyModeDefinition(mode)
	const availableActions = modeDefinition.actions(work)
	const availableParts = modeDefinition.parts(work)
	const flags = getSystemPromptFlags(mode, availableActions, availableParts)

	const lines = [
		buildIntroPromptSection(flags),
		buildRulesPromptSection(flags),
		buildModePromptSection(flags),
	]

	if (withSchema) {
		lines.push(buildSchemaPromptSection(availableActions))
	}

	const result = normalizeNewlines(lines.join('\n'))

	return result
}

function buildModePromptSection(flags: SystemPromptFlags) {
	if (flags.isOneshotting) {
		return buildOneshottingModePromptSection(flags)
	}
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
	while (text.includes('\n\n\n')) {
		text = text.replace('\n\n\n', '\n\n')
	}
	return text
}
