import { AgentTransform } from '../../shared/AgentTransform'
import { AgentPrompt, AgentPromptOptions } from '../../shared/types/AgentPrompt'

/**
 * Get a full prompt based on the provided prompt options.
 *
 * @returns The fully assembled prompt. (in worker-ish)
 */
export async function preparePrompt(
	promptOptions: AgentPromptOptions,
	transform: AgentTransform
): Promise<AgentPrompt> {
	const { modelName, request, promptPartUtils } = promptOptions

	const prompt: Partial<AgentPrompt> = {
		type: request.type,
		modelName,
		parts: {} as AgentPrompt['parts'],
	}

	for (const [_type, promptPartUtil] of promptPartUtils) {
		if (!promptPartUtil.getPart) {
			continue
		}
		const untransformedPart = await promptPartUtil.getPart(promptOptions)
		const transformedPart = promptPartUtil.transformPart(untransformedPart, transform, prompt)
		;(prompt.parts as any)[_type] = transformedPart
	}

	console.log('PROMPT', prompt)
	return prompt as AgentPrompt
}
