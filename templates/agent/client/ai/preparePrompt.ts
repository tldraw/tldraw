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
	const { modelName, request, promptPartUtils } = promptOptions

	const prompt: Partial<TLAgentPrompt> = {
		type: request.type,
		modelName,
		parts: {} as TLAgentPrompt['parts'],
	}

	for (const [_type, promptPartUtil] of promptPartUtils) {
		const part = await promptPartUtil.getPart(promptOptions)
		// If the util has a transformPromptPart method, use it; otherwise, assign the promptPart
		const maybeTransformedPart =
			typeof promptPartUtil.transformPromptPart === 'function'
				? promptPartUtil.transformPromptPart(part, transform)
				: part

		if (maybeTransformedPart) {
			;(prompt.parts as any)[_type] = maybeTransformedPart
		}
	}

	console.log('PROMPT', prompt)
	return prompt as TLAgentPrompt
}
