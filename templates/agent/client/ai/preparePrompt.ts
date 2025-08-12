import { AgentTransform } from '../AgentTransform'
import { TLAgentPrompt, TLAgentPromptOptions } from '../types/TLAgentPrompt'

/**
 * Get a full prompt based on the provided prompt options.
 *
 * @returns The fully assembled prompt. (in worker-ish)
 */
export async function preparePrompt(
	promptOptions: TLAgentPromptOptions,
	transform: AgentTransform
): Promise<TLAgentPrompt> {
	const {
		modelName,
		type,

		historyItems,

		promptPartUtils,
	} = promptOptions

	const prompt: Partial<TLAgentPrompt> = {
		type,
		modelName,

		historyItems,
	}

	// Generate prompt parts using utils
	for (const [_type, promptPartUtil] of promptPartUtils) {
		const part = await promptPartUtil.getPart(promptOptions)

		// If the util has a transformPromptPart method, use it; otherwise, just assign the promptPart
		const maybeTransformedPart =
			typeof promptPartUtil.transformPromptPart === 'function'
				? promptPartUtil.transformPromptPart(part, transform)
				: part

		if (maybeTransformedPart) {
			Object.assign(prompt, maybeTransformedPart)
		}
	}

	console.log('PROMPT', prompt)
	return prompt as TLAgentPrompt
}
