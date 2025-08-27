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
	const { promptPartUtils } = promptOptions

	const untransformedParts: AgentPrompt = {}
	const transformedParts: AgentPrompt = {}

	for (const [type, promptPartUtil] of promptPartUtils) {
		if (!promptPartUtil.getPart) continue

		const untransformedPart = await promptPartUtil.getPart(promptOptions)
		untransformedParts[type] = untransformedPart
	}

	for (const [type, promptPartUtil] of promptPartUtils) {
		if (!promptPartUtil.transformPart) continue

		const transformedPart = promptPartUtil.transformPart(
			untransformedParts[type],
			transform,
			untransformedParts
		)
		transformedParts[type] = transformedPart
	}

	console.log('PROMPT', transformedParts)
	return transformedParts
}
